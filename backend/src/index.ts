import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { connectToDatabase, ContentModel, LinkModel, UserModel } from "./db.js";
import { getFrontendUrls, getJwtPassword, getPort, getGoogleClientId, getGoogleClientSecret, getGoogleRedirectUri } from "./config.js";
import { userMiddleware } from "./middleware.js";
import { random } from "./utils.js";
import cors from "cors";

import { getAiClassification, processContentEmbedding } from "./services/ai.service.js";
import { normalizeUrl } from "./services/ingestion/url.js";
import { semanticSearchController } from "./controllers/search.controller.js";
import { initCronJobs } from "./cron.js";
import aiRouter from "./routes/ai.js";
import { enqueueAiIngestionJob, getAiQueueMetrics, initQueueObservers } from "./queue/ai-jobs.js";
import { CONTENT_TYPES } from "@secondbrain/contracts";


declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: getFrontendUrls() ?? true,
  })
);

const signupSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can contain only letters, numbers and underscores"
    ),

  password: z
    .string()
    .min(8, "Password must contain at least 8 characters")
    .max(30, "Password cannot exceed 30 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character"
    ),
});

const signinSchema = z.object({
  username: z.string().min(3, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  link: z.string().url("Invalid URL"),
  type: z.enum(CONTENT_TYPES),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
});

app.post("/api/v1/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { username, password } = parsed.data;

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await UserModel.create({ username, password: hashedPassword });
    res.json({ message: "User signed up" });
  } catch (e) {
    return res.status(411).json({ message: "User already exists" });
  }
});

app.post("/api/v1/signin", async (req, res) => {
  const parsed = signinSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { username, password } = parsed.data;

  const existingUser = await UserModel.findOne({ username });

  if (!existingUser) {
    return res.status(403).json({ message: "Invalid credentials" });
  }
  // @ts-ignore
  const passwordMatch = await bcrypt.compare(password, existingUser.password);

  if (!passwordMatch) {
    return res.status(403).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign({ id: existingUser._id }, getJwtPassword());

  res.json({ token });
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  const { title, link, type, tags, description } = parsed.data;
  const normalizedTarget = normalizeUrl(link);

  // STEP 1: Instant Metadata Extraction (Zero AI Latency)
  let domain = "";
  try {
    domain = new URL(link).hostname.replace("www.", "");
  } catch (e) {
    domain = "web";
  }

  // STEP 1: Create content record
  const content = await ContentModel.create({
    title: title || "New Note",
    link,
    normalizedLink: normalizedTarget.normalizedUrl,
    type: type || (link.includes("youtube.com") || link.includes("youtu.be") ? "video" : "post"),
    tags: tags || [],
    description: description || "",
    userId: req.userId,
    embeddingStatus: "pending",
    aiStatus: "queued", 
    aiMetadata: {
      domain,
      source: domain,
      contentType: type || "web",
      normalizedLink: normalizedTarget.normalizedUrl,
      platform: normalizedTarget.platform,
    }
  });

  // STEP 2: Trigger AI Auto-Pilot (Background)
  let queueJobId: string | null = null;
  if (link && !description) {
    const queueResult = await enqueueAiIngestionJob({
      contentId: String(content._id),
      normalizedLink: normalizedTarget.normalizedUrl,
      trigger: "create",
    });
    queueJobId = queueResult.jobId;

    if (!queueResult.enqueued) {
      processContentEmbedding(content._id.toString()).catch(err =>
        console.error("[AUTO_AI_FAILED]", err.message)
      );
    }
  }

  res.json({ 
    success: true,
    message: "Content added. Neural synthesis triggered.", 
    contentId: content._id,
    jobId: queueJobId,
  });
});


// AI Route Grouping & Debugging
app.use("/api/v1/ai", (req, res, next) => {
  console.log(`[AI_ROUTE_HIT]: ${req.method} ${req.path}`, { body: req.body });
  next();
}, aiRouter);

import { getConnectionsController } from "./controllers/connections.controller.js";
import {
  googleConnectController,
  googleSigninStart,
  googleCallbackController,
  googleStatusController,
  googleDisconnectController,
  exchangeLoginCode,
} from "./controllers/google-integration.controller.js";

// Google integration endpoints
app.get("/api/v1/integrations/google/connect", userMiddleware, googleConnectController);
app.get("/api/v1/integrations/google/status", userMiddleware, googleStatusController);
app.post("/api/v1/integrations/google/disconnect", userMiddleware, googleDisconnectController);
// Public OAuth callback used by Google (registered in Google Cloud Console)
app.get("/auth/google/callback", googleCallbackController);
// Public endpoint to start Google sign-in (minimal scopes)
app.get("/api/v1/auth/google/start", googleSigninStart);
// Exchange one-time login code for app token
app.post("/api/v1/auth/exchange", express.json(), exchangeLoginCode);

app.get("/api/v1/search", userMiddleware, semanticSearchController);
app.get("/api/v1/content/:id/connections", userMiddleware, getConnectionsController);
app.get("/api/v1/ai/queue-metrics", userMiddleware, async (_req, res) => {
  const metrics = await getAiQueueMetrics();
  res.json(metrics);
});

// Minimal user profile
app.get('/api/v1/me', userMiddleware, async (req, res) => {
  try {
    const user = await UserModel.findById(req.userId).select('username google');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ username: user.username, google: user.google || {} });
  } catch (e) {
    return res.status(500).json({ message: 'Internal server error' });
  }
});

// Debug endpoint (non-secret): report whether Google OAuth config is present and redirect URI
app.get('/api/v1/debug/oauth-config', (_req, res) => {
  try {
    const clientIdPresent = Boolean(getGoogleClientId());
    const clientSecretPresent = Boolean(getGoogleClientSecret());
    const redirectUri = getGoogleRedirectUri() || null;
    const frontend = getFrontendUrls() ?? [];
    return res.json({
      googleConfigured: clientIdPresent && clientSecretPresent && Boolean(redirectUri),
      clientIdPresent,
      clientSecretPresent,
      redirectUri,
      frontend,
    });
  } catch (e) {
    return res.status(500).json({ message: 'Failed to read config' });
  }
});




app.get("/api/v1/content", userMiddleware, async (req, res) => {
  // @ts-ignore

  const userId = req.userId;

  const content = await ContentModel.find({ userId }).populate(
    "userId",
    "username"
  );

  res.json({ content });
});

app.put("/api/v1/content", userMiddleware, async (req, res) => {
  const { contentId, title, description, tags } = req.body;

  if (!contentId) {
    return res.status(400).json({ message: "Content ID is required" });
  }

  try {
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) {
      updateData.description = description;
      // If we manually provide description, we implicitly mark it as summarized
      updateData.aiStatus = "summarized";
    }
    if (tags !== undefined) updateData.tags = tags;

    const result = await ContentModel.updateOne(
      { _id: contentId, userId: req.userId },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Content not found or unauthorized" });
    }

    res.json({ message: "Content updated", success: true });
  } catch (e) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
  const contentId = req.body.contentId;
  console.log("Delete request received");
  console.log("contentId:", contentId);
  console.log("userId:", req.userId);

  if (!contentId) {
    return res.status(400).json({ message: "Content ID is required" });
  }

  try {
    const result = await ContentModel.deleteOne({
      _id: contentId,
      userId: req.userId,
    });

    console.log("Delete result:", result);

    if (result.deletedCount === 0) {
      return res.status(404).json({
        message: "Content not found or you don't have permission to delete it",
        debug: { contentId, userId: req.userId }
      });
    }

    res.json({
      message: "Deleted",
      deletedCount: result.deletedCount,
    });
  } catch (e) {
    console.error("Delete error:", e);
    res.status(500).json({ message: "Internal server error" });
  }
});
app.get("/api/brain/share-status", userMiddleware, async (req, res) => {
  try {
    const link = await LinkModel.findOne({ 
      userId: new mongoose.Types.ObjectId(req.userId) 
    });
    if (!link) {
      return res.json({ shareType: 'private', shareId: null });
    }
    res.json({
      shareType: link.shareType,
      shareId: link.shareId,
      isPublic: link.isPublic
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/brain/share", userMiddleware, async (req, res) => {
  try {
    const { shareType, regenerate } = req.body;
    const userObjectId = new mongoose.Types.ObjectId(req.userId);

    if (shareType === 'private') {
      await LinkModel.deleteOne({ userId: userObjectId });
      return res.json({ message: "Sharing disabled", shareType: 'private' });
    }

    const existingLink = await LinkModel.findOne({ userId: userObjectId });
    
    const update: any = {
      shareType: shareType || (existingLink ? existingLink.shareType : 'link'),
      isPublic: (shareType || (existingLink ? existingLink.shareType : 'link')) === 'public'
    };

    if (regenerate || !existingLink) {
      update.shareId = random(10);
    }

    const link = await LinkModel.findOneAndUpdate(
      { userId: userObjectId },
      { $set: update },
      { 
        new: true, 
        upsert: true, 
        setDefaultsOnInsert: true,
        runValidators: true 
      }
    );

    if (!link) throw new Error("Database failed to upsert link");

    res.json({
      message: "Sharing updated",
      shareId: link.shareId,
      shareType: link.shareType
    });
  } catch (error: any) {
    console.error("Critical error in /api/brain/share:", error);
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message,
      step: "POST_SHARE_HANDLER" 
    });
  }
});

app.get("/api/brain/share/:shareId", async (req, res) => {
  const shareId = req.params.shareId;
  const link = await LinkModel.findOne({ shareId });

  if (!link || link.shareType === 'private') {
    return res.status(404).json({ message: "Shared brain not found or private" });
  }

  const content = await ContentModel.find({ userId: link.userId });
  const user = await UserModel.findOne({ _id: link.userId });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json({
    username: user.username,
    content,
    shareType: link.shareType
  });
});

// API v1 Catch-all for 404 debugging (MUST BE LAST)
app.use(/^\/api\/v1\/.*/, (req, res) => {
  console.warn(`[API_404_DETECTION]: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `Endpoint ${req.originalUrl} not found on this server.`,
    availableRoutes: ["/signup", "/signin", "/content", "/ai/tag", "/ai/reprocess", "/search", "/brain/share-status"]
  });
});

const startServer = async () => {
  try {
    await connectToDatabase();
    console.log('[STARTUP] Connected to database');
  } catch (err) {
    console.error('[STARTUP] Database connection failed:', err);
    process.exit(1);
  }

  try {
    await initQueueObservers();
    console.log('[STARTUP] Queue initialized');
  } catch (err) {
    console.error('[STARTUP] Queue initialization failed (continuing anyway):', err);
    // Don't exit - queue is optional for basic functionality
  }

  const port = getPort();
  
  // Log runtime OAuth configuration hints (do not log secrets)
  try {
    const googleClientId = getGoogleClientId();
    const googleRedirect = getGoogleRedirectUri();
    console.log('[CONFIG] GOOGLE_CLIENT_ID present:', Boolean(googleClientId));
    console.log('[CONFIG] GOOGLE_REDIRECT_URI:', googleRedirect || '(not set)');
  } catch (e) {
    console.warn('[CONFIG] Google config incomplete or not set');
  }

  // Initialize background tasks
  try {
    initCronJobs();
    console.log('[STARTUP] Cron jobs initialized');
  } catch (err) {
    console.error('[STARTUP] Cron initialization failed (continuing anyway):', err);
  }

  app.listen(port, () => {
    console.log(`[STARTUP] Server running on port ${port}`);
  });
};

startServer().catch((error) => {
  console.error("[STARTUP] Failed to start backend:", error instanceof Error ? error.message : error);
  // Don't exit - let the server keep running for health checks
  // process.exit(1);
});
// Force restart for PUT endpoint

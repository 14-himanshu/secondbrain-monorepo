import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { ContentModel, LinkModel, UserModel } from "./db.js";
import { JWT_PASSWORD } from "./config.js";
import { userMiddleware } from "./middleware.js";
import { random } from "./utils.js";
import cors from "cors"

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

const app = express();
app.use(express.json());
app.use(cors());

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
  type: z.enum(["Youtube", "Twitter"]),
  tags: z.array(z.string()).optional(),
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

  const token = jwt.sign({ id: existingUser._id }, JWT_PASSWORD);

  res.json({ token });
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
  const parsed = contentSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  
  const { title, link, type, tags } = parsed.data;

  await ContentModel.create({
    title, 
    link,
    type,
    tags: tags || [],
    userId: req.userId,
  });

  res.json({ message: "Content added" });
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

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
  const contentId = req.body.contentId;

  await ContentModel.deleteMany({
    contentId,
    userId: req.userId,
  });

  res.json({
    message: "Deleted",
  });
});
app.post("/api/v1/brain/share", userMiddleware,async (req, res) => {
  const share = req.body.share

  if (share){
    const existingLink = await LinkModel.findOne({
      userId : req.userId
    })

    if (existingLink){
      res.json({
        hash : existingLink.hash
      })
      return 
    }

    const hash = random(10)
    await LinkModel.create({
      userId : req.userId,
      hash : hash
    })
    res.json({message : "/share/" + hash})


  }else{
    await LinkModel.deleteOne({
      userId : req.userId
    })
  }
  res.json({
    "message" : "Removed sharable link"
  })
});

app.get("/api/v1/brain/:shareLink", async (req, res) => {
  const hash  = req.params.shareLink
  const link = await LinkModel.findOne({
    hash 
  })
  if (!link){
    res.status(411).json({
      message : "Sorry incorrect input"
    })
    return 
  }
  const content = await ContentModel.find({
    userId : link.userId
  })
  const user = await UserModel.findOne({
    _id : link.userId
  })

  if (!user){
    res.status(411).json({
      "message" : "user not found"
    })
    return 
  }
  res.json({
    username: user.username,
    content
  })

});

app.listen(3000);

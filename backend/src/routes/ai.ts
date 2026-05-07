import { Router } from "express";
import { aiTagController, aiReprocessController, aiChatController, aiInsightsController } from "../controllers/ai.controller.js";
import { userMiddleware } from "../middleware.js";

const aiRouter = Router();

// POST /api/v1/ai/tag
aiRouter.post("/tag", userMiddleware, aiTagController);

// POST /api/v1/ai/reprocess
aiRouter.post("/reprocess", userMiddleware, aiReprocessController);

// POST /api/v1/ai/chat
aiRouter.post("/chat", userMiddleware, aiChatController);

// GET /api/v1/ai/insights
aiRouter.get("/insights", userMiddleware, aiInsightsController);

export default aiRouter;

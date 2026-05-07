import { Router } from "express";
import { aiTagController, aiReprocessController } from "../controllers/ai.controller.js";
import { userMiddleware } from "../middleware.js";

const aiRouter = Router();

// POST /api/v1/ai/tag
aiRouter.post("/tag", userMiddleware, aiTagController);

// POST /api/v1/ai/reprocess
aiRouter.post("/reprocess", userMiddleware, aiReprocessController);

export default aiRouter;

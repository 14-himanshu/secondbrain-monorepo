import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { getJwtPassword } from "./config.js";
import { UserModel } from "./db.js";

export const userMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log('[AUTH_MW] evaluating auth for', { path: req.path, method: req.method, hasAuth: Boolean(req.headers.authorization) });

  const authHeader = req.headers.authorization;

  // No header
  if (!authHeader) {
    return res.status(403).json({ message: "No auth token provided" });
  }

  // Not in Bearer format
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(403).json({ message: "Invalid auth format" });
  }

  // Extract token
  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(403).json({ message: "Invalid auth token" });
  }

  try {
    const decoded = jwt.verify(token, getJwtPassword()) as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.userId = decoded.id;

    // Verify user actually exists in the database to prevent session drift/dead tokens (e.g. database resets)
    const exists = await UserModel.exists({ _id: decoded.id });
    if (!exists) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (err) {
    return res.status(403).json({ message: "Token verification failed" });
  }
};

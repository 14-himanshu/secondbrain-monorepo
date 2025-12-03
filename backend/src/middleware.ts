import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config.js";

if (!JWT_PASSWORD) {
  throw new Error("JWT_PASSWORD is not configured");
}

export const userMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
    const decoded = jwt.verify(token, JWT_PASSWORD) as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      return res.status(403).json({ message: "Invalid token" });
    }

    // @ts-ignore
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Token verification failed" });
  }
};

import jwt from "jsonwebtoken";
import { getJwtPassword } from "./config.js";
export const userMiddleware = (req, res, next) => {
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
        const decoded = jwt.verify(token, getJwtPassword());
        if (!decoded || !decoded.id) {
            return res.status(403).json({ message: "Invalid token" });
        }
        // @ts-ignore
        req.userId = decoded.id;
        next();
    }
    catch (err) {
        return res.status(403).json({ message: "Token verification failed" });
    }
};
//# sourceMappingURL=middleware.js.map
import jwt from "jsonwebtoken";
import { getFrontendUrls, getGoogleClientId, getGoogleClientSecret, getGoogleRedirectUri, getGoogleScopes, getJwtPassword, } from "../config.js";
import { UserModel } from "../db.js";
const getFrontendRedirectBase = () => getFrontendUrls()?.[0] || "http://localhost:5173";
const getGoogleConfig = () => {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    const redirectUri = getGoogleRedirectUri();
    const hasClientId = Boolean(clientId);
    const hasClientSecret = Boolean(clientSecret);
    const hasRedirectUri = Boolean(redirectUri);
    if (!hasClientId || !hasClientSecret || !hasRedirectUri) {
        console.warn(`[GOOGLE_CONFIG_MISSING] clientId:${hasClientId} clientSecret:${hasClientSecret} redirectUri:${hasRedirectUri}`);
        return null;
    }
    return { clientId: clientId, clientSecret: clientSecret, redirectUri: redirectUri };
};
const buildFrontendCallbackUrl = (status, reason) => {
    const url = new URL("/integrations/callback", getFrontendRedirectBase());
    url.searchParams.set("integration", "google");
    url.searchParams.set("status", status);
    if (reason) {
        url.searchParams.set("reason", reason);
    }
    return url.toString();
};
const buildFrontendAuthCallbackUrl = (status, loginCode, reason) => {
    const url = new URL("/auth/callback", getFrontendRedirectBase());
    url.searchParams.set("status", status);
    if (loginCode)
        url.searchParams.set("login_code", loginCode);
    if (reason)
        url.searchParams.set("reason", reason);
    return url.toString();
};
const buildGoogleAuthUrl = (state, scopes) => {
    const config = getGoogleConfig();
    if (!config)
        return null;
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", config.clientId);
    authUrl.searchParams.set("redirect_uri", config.redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scopes.join(" "));
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("include_granted_scopes", "true");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);
    return authUrl.toString();
};
const exchangeGoogleCode = async (code) => {
    const config = getGoogleConfig();
    if (!config)
        throw new Error("GOOGLE_CONFIG_MISSING");
    const body = new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
    });
    const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!response.ok) {
        throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED_${response.status}`);
    }
    return (await response.json());
};
const fetchGoogleEmail = async (accessToken) => {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok)
        return undefined;
    const payload = (await response.json());
    return payload.email;
};
export const googleConnectController = async (req, res) => {
    const config = getGoogleConfig();
    if (!config) {
        return res.status(500).json({ message: "Google integration is not configured." });
    }
    const userId = req.userId;
    if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const statePayload = {
        type: "google_oauth_state",
        userId,
        nonce: Math.random().toString(36).slice(2),
    };
    const state = jwt.sign(statePayload, getJwtPassword(), { expiresIn: "10m" });
    const scopes = getGoogleScopes();
    const authUrl = buildGoogleAuthUrl(state, scopes);
    if (!authUrl) {
        return res.status(500).json({ message: "Failed to build Google auth URL." });
    }
    return res.json({ authUrl });
};
// Public start for Google sign-in (minimal scopes)
export const googleSigninStart = async (req, res) => {
    console.log('[OAUTH_START] incoming request to /api/v1/auth/google/start', {
        path: req.path,
        method: req.method,
        hasAuth: Boolean(req.headers.authorization),
    });
    const config = getGoogleConfig();
    if (!config) {
        console.warn('[OAUTH_START] google config missing');
        return res.status(500).json({ message: "Google integration is not configured." });
    }
    const statePayload = {
        type: "google_oauth_login",
        nonce: Math.random().toString(36).slice(2),
    };
    const state = jwt.sign(statePayload, getJwtPassword(), { expiresIn: "10m" });
    // minimal scopes for signin
    const scopes = ["openid", "email", "profile"];
    const authUrl = buildGoogleAuthUrl(state, scopes);
    if (!authUrl) {
        console.error('[OAUTH_START] failed to build auth url');
        return res.status(500).json({ message: "Failed to build Google auth URL." });
    }
    // Redirect directly to Google's auth page (simpler for frontend)
    return res.redirect(authUrl);
};
export const googleCallbackController = async (req, res) => {
    console.log('[OAUTH_CALLBACK] incoming callback', { path: req.path, query: req.query });
    const { code, state, error } = req.query;
    if (error) {
        return res.redirect(buildFrontendCallbackUrl("failed", String(error)));
    }
    if (!code || !state || typeof code !== "string" || typeof state !== "string") {
        return res.redirect(buildFrontendCallbackUrl("failed", "missing_oauth_params"));
    }
    let payload;
    try {
        payload = jwt.verify(state, getJwtPassword());
    }
    catch {
        return res.redirect(buildFrontendCallbackUrl("failed", "invalid_state"));
    }
    // Login flow (no userId in state)
    if (payload?.type === "google_oauth_login") {
        try {
            const tokenResponse = await exchangeGoogleCode(code);
            const email = await fetchGoogleEmail(tokenResponse.access_token);
            if (!email) {
                return res.redirect(buildFrontendAuthCallbackUrl("failed", undefined, "no_email_returned"));
            }
            // Find or create user
            let user = await UserModel.findOne({ username: email });
            if (!user) {
                user = await UserModel.create({ username: email, password: Math.random().toString(36), google: { loginOnly: true } });
            }
            // Create short-lived one-time login code (2m)
            const loginCode = jwt.sign({ type: "google_login_code", userId: user._id }, getJwtPassword(), { expiresIn: "2m" });
            return res.redirect(buildFrontendAuthCallbackUrl("success", loginCode));
        }
        catch (e) {
            console.error("[GOOGLE_OAUTH_LOGIN_FAILED]", e);
            return res.redirect(buildFrontendAuthCallbackUrl("failed", undefined, "token_exchange_failed"));
        }
    }
    // Existing connect flow: requires userId in state
    if (!payload?.userId || payload.type !== "google_oauth_state") {
        return res.redirect(buildFrontendCallbackUrl("failed", "invalid_state_payload"));
    }
    try {
        const tokenResponse = await exchangeGoogleCode(code);
        const email = await fetchGoogleEmail(tokenResponse.access_token);
        const { encrypt } = await import("../lib/crypto.js");
        const update = {
            "google.connected": true,
            "google.email": email,
            "google.scope": tokenResponse.scope?.split(" ").filter(Boolean) || [],
            "google.expiryDate": new Date(Date.now() + tokenResponse.expires_in * 1000),
            "google.updatedAt": new Date(),
        };
        try {
            // encrypt tokens before persisting
            update["google.accessTokenEnc"] = encrypt(tokenResponse.access_token);
            if (tokenResponse.refresh_token) {
                update["google.refreshTokenEnc"] = encrypt(tokenResponse.refresh_token);
            }
        }
        catch (e) {
            console.warn("[TOKEN_ENCRYPTION_FAILED]", e);
            // fallback to storing plaintext if encryption fails (not recommended)
            update["google.accessToken"] = tokenResponse.access_token;
            if (tokenResponse.refresh_token)
                update["google.refreshToken"] = tokenResponse.refresh_token;
        }
        await UserModel.updateOne({ _id: payload.userId }, { $set: update });
        return res.redirect(buildFrontendCallbackUrl("connected"));
    }
    catch (oauthError) {
        console.error("[GOOGLE_OAUTH_CALLBACK_FAILED]", oauthError);
        return res.redirect(buildFrontendCallbackUrl("failed", "token_exchange_failed"));
    }
};
export const googleStatusController = async (req, res) => {
    const user = await UserModel.findById(req.userId)
        .select("+google.refreshTokenEnc +google.accessTokenEnc google.connected google.email google.scope google.expiryDate");
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    const google = user.google || {};
    return res.json({
        connected: Boolean(google.connected),
        email: google.email || null,
        expiryDate: google.expiryDate || null,
        scopes: Array.isArray(google.scope) ? google.scope : [],
        hasRefreshToken: Boolean(google.refreshTokenEnc || google.refreshToken),
    });
};
export const googleDisconnectController = async (req, res) => {
    await UserModel.updateOne({ _id: req.userId }, {
        $set: {
            "google.connected": false,
            "google.updatedAt": new Date(),
        },
        $unset: {
            "google.email": 1,
            "google.accessTokenEnc": 1,
            "google.refreshTokenEnc": 1,
            "google.accessToken": 1,
            "google.refreshToken": 1,
            "google.scope": 1,
            "google.expiryDate": 1,
        },
    });
    return res.json({ success: true });
};
// Exchange one-time login code for app JWT
export const exchangeLoginCode = async (req, res) => {
    const { code } = req.body;
    if (!code || typeof code !== "string")
        return res.status(400).json({ message: "Missing code" });
    try {
        const payload = jwt.verify(code, getJwtPassword());
        if (!payload || payload.type !== "google_login_code" || !payload.userId) {
            return res.status(400).json({ message: "Invalid code" });
        }
        const user = await UserModel.findById(payload.userId);
        if (!user)
            return res.status(404).json({ message: "User not found" });
        const appToken = jwt.sign({ id: user._id }, getJwtPassword());
        return res.json({ token: appToken });
    }
    catch (e) {
        return res.status(400).json({ message: "Invalid or expired code" });
    }
};
//# sourceMappingURL=google-integration.controller.js.map
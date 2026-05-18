import { UserModel } from "../db.js";
import { getGoogleClientId, getGoogleClientSecret } from "../config.js";
import { decrypt, encrypt } from "../lib/crypto.js";
import { withDistributedLock } from "../queue/lock.js";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const log = (level, msg, meta) => {
    if (meta) {
        if (level === "info")
            console.info(`[GOOGLE_AUTH] ${msg}`, meta);
        else if (level === "warn")
            console.warn(`[GOOGLE_AUTH] ${msg}`, meta);
        else
            console.error(`[GOOGLE_AUTH] ${msg}`, meta);
    }
    else {
        if (level === "info")
            console.info(`[GOOGLE_AUTH] ${msg}`);
        else if (level === "warn")
            console.warn(`[GOOGLE_AUTH] ${msg}`);
        else
            console.error(`[GOOGLE_AUTH] ${msg}`);
    }
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const decryptToken = (enc) => {
    if (!enc)
        return null;
    try {
        return decrypt(enc);
    }
    catch (e) {
        log("error", "decrypt_failed", { error: e.message });
        return null;
    }
};
export const encryptToken = (plain) => {
    if (!plain)
        return null;
    try {
        return encrypt(plain);
    }
    catch (e) {
        log("error", "encrypt_failed", { error: e.message });
        return null;
    }
};
export const refreshAccessToken = async (refreshToken) => {
    const clientId = getGoogleClientId();
    const clientSecret = getGoogleClientSecret();
    if (!clientId || !clientSecret)
        throw new Error("GOOGLE_CLIENT_NOT_CONFIGURED");
    const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
    });
    const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });
    if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`GOOGLE_REFRESH_FAILED_${res.status}: ${txt}`);
    }
    const payload = (await res.json());
    return payload;
};
export const getAccessTokenForUser = async (userId) => {
    // Use a distributed lock to avoid parallel refreshes for same user
    const lockResult = await withDistributedLock(`google:refresh:${userId}`, 120000, async () => {
        const user = await UserModel.findById(userId).select("+google.accessTokenEnc +google.refreshTokenEnc google.expiryDate google.connected");
        if (!user)
            throw new Error("USER_NOT_FOUND");
        const google = user.google || {};
        if (!google.connected)
            throw new Error("GOOGLE_NOT_CONNECTED");
        const accessEnc = google.accessTokenEnc;
        const refreshEnc = google.refreshTokenEnc;
        const expiryDate = google.expiryDate;
        const accessToken = decryptToken(accessEnc);
        const refreshToken = decryptToken(refreshEnc) || null;
        // If no refresh token present, cannot refresh
        if (!refreshToken) {
            log("warn", "no_refresh_token", { userId });
            if (!accessToken)
                throw new Error("NO_REFRESH_OR_ACCESS_TOKEN");
            return accessToken;
        }
        const now = Date.now();
        const expiresAt = expiryDate ? new Date(expiryDate).getTime() : 0;
        // Refresh threshold: 2 minutes before expiry
        const shouldRefresh = !accessToken || expiresAt - now < 2 * 60 * 1000;
        if (!shouldRefresh)
            return accessToken;
        // Try refreshing with retries
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                log("info", "refresh_attempt", { userId, attempt });
                const payload = await refreshAccessToken(refreshToken);
                const newAccess = payload.access_token;
                const newExpiry = new Date(Date.now() + (payload.expires_in || 3600) * 1000);
                const updates = {
                    "google.accessTokenEnc": encryptToken(newAccess),
                    "google.expiryDate": newExpiry,
                    "google.updatedAt": new Date(),
                };
                if (payload.refresh_token) {
                    updates["google.refreshTokenEnc"] = encryptToken(payload.refresh_token);
                }
                await UserModel.updateOne({ _id: userId }, { $set: updates });
                log("info", "refresh_ok", { userId, expiresAt: newExpiry.toISOString() });
                return newAccess;
            }
            catch (e) {
                const err = e;
                log("error", "refresh_failed", { userId, attempt, error: err.message });
                if (attempt < maxAttempts) {
                    await sleep(attempt * 500 + Math.random() * 200);
                    continue;
                }
                // On final failure, mark google.connected=false? Prefer to surface to user instead
                log("error", "refresh_max_retries_exceeded", { userId });
                throw err;
            }
        }
        throw new Error("REFRESH_FAILED");
    });
    if (!lockResult.acquired) {
        // Another process is refreshing tokens. Re-read the DB to get the latest token.
        const user = await UserModel.findById(userId).select("+google.accessTokenEnc +google.refreshTokenEnc google.expiryDate google.connected");
        if (!user)
            throw new Error("USER_NOT_FOUND");
        const google = user.google || {};
        const access = decryptToken(google.accessTokenEnc);
        if (!access)
            throw new Error("REFRESH_LOCKED_NO_TOKEN");
        return access;
    }
    // If we acquired the lock, lockResult.value is the token (string)
    return lockResult.value;
};
//# sourceMappingURL=google.auth.js.map
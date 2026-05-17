import crypto from "crypto";
import { getTokenEncryptionKey } from "../config.js";

const ALGO = "aes-256-gcm";

const ensureKey = () => {
  const key = getTokenEncryptionKey();
  if (!key) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  // Expect base64 or raw 32-byte hex/utf8. Normalize to Buffer of length 32.
  let buf: Buffer;
  try {
    // try base64
    buf = Buffer.from(key, "base64");
    if (buf.length !== 32) throw new Error("bad length");
    return buf;
  } catch {
    // fallback to utf8
    buf = Buffer.from(key, "utf8");
    if (buf.length < 32) {
      // pad with zeros if needed (not ideal)
      const padded = Buffer.alloc(32);
      buf.copy(padded);
      return padded;
    }
    return buf.slice(0, 32);
  }
};

export const encrypt = (plaintext: string) => {
  const key = ensureKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as base64: iv:tag:ciphertext
  return `${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
};

export const decrypt = (payload: string) => {
  const key = ensureKey();
  const [ivB64, tagB64, encB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !encB64) throw new Error("Invalid encrypted payload");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  return decrypted.toString("utf8");
};

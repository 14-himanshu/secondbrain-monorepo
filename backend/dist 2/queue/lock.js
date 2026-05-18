import crypto from "crypto";
import { getLockConnection } from "./redis.js";
const releaseScript = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;
export const withDistributedLock = async (key, ttlMs, callback) => {
    const redis = getLockConnection();
    if (!redis) {
        return { acquired: true, value: await callback() };
    }
    const token = crypto.randomUUID();
    const lock = await redis.set(key, token, "PX", ttlMs, "NX");
    if (lock !== "OK") {
        return { acquired: false };
    }
    try {
        return { acquired: true, value: await callback() };
    }
    finally {
        await redis.eval(releaseScript, 1, key, token);
    }
};
//# sourceMappingURL=lock.js.map
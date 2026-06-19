import "dotenv/config";

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is not configured`);
  }

  return value;
};

export const getPort = () => Number(process.env.PORT ?? 3000);
export const getJwtPassword = () => getRequiredEnv("JWT_PASSWORD");
export const getMongoDbUri = () => getRequiredEnv("MONGODB_URI");
export const getFrontendUrls = () =>
  process.env.FRONTEND_URL
    ?.split(",")
    .map((url) => url.trim().replace(/\/$/, ""))
    .filter(Boolean);
export const getGroqApiKey = () => process.env.GROQ_API_KEY?.trim();
export const getOpenAiApiKey = () => process.env.OPENAI_API_KEY?.trim();
export const getRedisUrl = () => process.env.REDIS_URL?.trim();
export const getAiWorkerConcurrency = () => Number(process.env.AI_WORKER_CONCURRENCY ?? 3);
export const getNotionToken = () => process.env.NOTION_TOKEN?.trim();
export const getNotionApiVersion = () => process.env.NOTION_API_VERSION?.trim() || "2022-06-28";
export const getGoogleClientId = () => process.env.GOOGLE_CLIENT_ID?.trim();
export const getGoogleClientSecret = () => process.env.GOOGLE_CLIENT_SECRET?.trim();
export const getGoogleRedirectUri = () => process.env.GOOGLE_REDIRECT_URI?.trim();
export const getGoogleScopes = () =>
  (process.env.GOOGLE_SCOPES?.trim() ||
    "https://www.googleapis.com/auth/documents.readonly https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.email")
    .split(/\s+/)
    .filter(Boolean);

export const getTokenEncryptionKey = () => process.env.TOKEN_ENCRYPTION_KEY?.trim();
export const getRazorpayKeyId = () => process.env.RAZORPAY_KEY_ID?.trim();
export const getRazorpayKeySecret = () => process.env.RAZORPAY_KEY_SECRET?.trim();

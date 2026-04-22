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
    .map((url) => url.trim())
    .filter(Boolean);

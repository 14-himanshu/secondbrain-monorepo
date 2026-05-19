import { Redis as IORedis } from "ioredis";
import { getRedisUrl } from "../config.js";

let queueConnection: IORedis | null = null;
let lockConnection: IORedis | null = null;

const createConnection = () => {
  const redisUrl = getRedisUrl();
  if (!redisUrl) return null;

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: 1,
    enableReadyCheck: false,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 2000,
    retryStrategy: () => null,
  });

  connection.on("error", (err) => {
    console.warn("[REDIS] Connection error:", err.message);
  });

  return connection;
};

export const isQueueEnabled = () => Boolean(getRedisUrl());

export const getQueueConnection = () => {
  if (!queueConnection) {
    queueConnection = createConnection();
  }
  return queueConnection;
};

export const getLockConnection = () => {
  if (!lockConnection) {
    lockConnection = createConnection();
  }
  return lockConnection;
};

import { Redis as IORedis } from "ioredis";
import { getRedisUrl } from "../config.js";

let queueConnection: IORedis | null = null;
let lockConnection: IORedis | null = null;

const createConnection = () => {
  const redisUrl = getRedisUrl();
  if (!redisUrl) return null;

  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
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

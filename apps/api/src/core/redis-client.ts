import { Redis, type Redis as RedisClient } from "ioredis";

let client: RedisClient | null = null;

export function getRedis(): RedisClient {
  if (client) return client;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL belum di-set");
  client = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: false });
  return client;
}

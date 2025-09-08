import { Queue } from 'bullmq';
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisConnection = new Redis(redisUrl);
export const redisPub = redisConnection; // publisher
export const redisSub = new Redis(redisUrl); // dedicated subscriber

export const calcGainsQueue = new Queue('calc-gains', { connection: redisConnection });
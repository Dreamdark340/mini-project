import { Worker } from 'bullmq';
import { calcGainsQueue, redisConnection, redisPub } from '../queue';
import { PrismaClient } from '@prisma/client';
import { GainsEngineService } from '../../apps/backend/src/modules/gains-engine/gains-engine.service';
import { CostBasisMethod, GainSummary } from '../../packages/shared/types';

const prisma = new PrismaClient();
const gainsService = new GainsEngineService();

interface Payload { sessionId: string; userId: string; method: CostBasisMethod; }

export const gainsWorker = new Worker(
  calcGainsQueue.name,
  async (job) => {
    const { sessionId, userId, method } = job.data as Payload;
    const start = Date.now();
    // fetch trades
    const trades = await prisma.trade.findMany({ where: { userId }, orderBy: { executedAt: 'asc' } });
    const { summary } = gainsService.calculate(trades as any, method);
    const summaryJson = JSON.stringify(summary);
    await prisma.whatIfSession.update({ where: { id: sessionId }, data: { summaryJson } });
    await redisPub.publish(`sandbox:${sessionId}`, summaryJson);
    job.updateProgress(100);
    console.log(`Gains calc for session ${sessionId} done in ${Date.now()-start}ms`);
  },
  { connection: redisConnection }
);

gainsWorker.on('failed', (job, err) => {
  console.error('GainsWorker failed', job?.id, err);
});
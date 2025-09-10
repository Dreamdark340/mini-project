import { Worker } from 'bullmq';
import { calcGainsQueue, redisConnection, redisPub } from '../queue';
import { PrismaClient } from '@prisma/client';
import { GainsEngineService } from '../../apps/backend/src/modules/gains-engine/gains-engine.service';
import { CostBasisMethod } from '../../packages/shared/types';
import { audit } from '../audit';

const prisma = new PrismaClient();
const gainsService = new GainsEngineService();

interface Payload { sessionId: string; userId: string; method: CostBasisMethod; }

export const gainsWorker = new Worker(
  calcGainsQueue.name,
  async (job) => {
    const { sessionId, userId, method } = job.data as Payload;
    const start = Date.now();
    audit(userId, 'process_session_start', { sessionId, method });
    // fetch trades
    const trades = await prisma.trade.findMany({ where: { userId }, orderBy: { executedAt: 'asc' } });
    const { summary } = gainsService.calculate(trades as any, method);
    const summaryJson = JSON.stringify(summary);
    await prisma.whatIfSession.update({ where: { id: sessionId }, data: { summaryJson } });
    await redisPub.publish(`sandbox:${sessionId}`, summaryJson);
    audit(userId, 'process_session_complete', { sessionId, durationMs: Date.now()-start });
    job.updateProgress(100);
    console.log(`Gains calc for session ${sessionId} done in ${Date.now()-start}ms`);
  },
  { connection: redisConnection }
);

gainsWorker.on('failed', (job, err) => {
  console.error('GainsWorker failed', job?.id, err);
  const { sessionId, userId } = job?.data as any;
  audit(userId||null, 'process_session_failed', { sessionId, error: err.message });
  if(sessionId){ redisPub.publish(`sandbox:${sessionId}`, JSON.stringify({ error:true, message: err.message })); }
});
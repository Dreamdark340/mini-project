import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function audit(userId: string | null, action: string, meta: Record<string, any> = {}) {
  try {
    await prisma.auditLog.create({ data: { userId: userId || null, action, metaJson: JSON.stringify(meta) } });
  } catch (err) {
    console.error('Audit log error', err);
  }
}
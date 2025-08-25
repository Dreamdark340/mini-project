import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import { z } from 'zod';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

type JwtPayload = { sub: string };

function signToken(userId: string) {
  return jwt.sign({ sub: userId } as JwtPayload, JWT_SECRET, { expiresIn: '7d' });
}
function authMiddleware(req: any, res: any, next: any) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ')? header.slice(7): null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    (req as any).userId = decoded.sub;
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Seed demo user if not exists
app.get('/health', async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { username: 'aaron' } });
  if (!user) {
    const hash = await bcrypt.hash('password', 10);
    await prisma.user.create({ data: {
      username: 'aaron', email: 'aaron@company.com', passwordHash: hash,
      fullName: 'Aaron Employee', department: 'Operations', employeeId: 'EMP0001'
    }});
  }
  res.json({ ok: true });
});

// Auth: Step 1 - password
app.post('/api/auth/login', async (req, res) => {
  const schema = z.object({ username: z.string(), password: z.string(), userAgent: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { username, password, userAgent } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  // If 2FA required, return flag, otherwise complete login
  if (user.twoFAEnabled) {
    return res.json({ twoFARequired: true });
  } else {
    const session = await prisma.session.create({ data: { userId: user.id, userAgent } });
    const token = signToken(user.id);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return res.json({ token, sessionId: session.id, user: { username: user.username, role: user.role, fullName: user.fullName } });
  }
});

// Auth: Step 2 - verify TOTP or recovery code
app.post('/api/auth/2fa', async (req, res) => {
  const schema = z.object({ username: z.string(), code: z.string().optional(), recoveryCode: z.string().optional(), userAgent: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { username, code, recoveryCode, userAgent } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user || !user.twoFAEnabled) return res.status(401).json({ error: 'Unauthorized' });
  let verified = false;
  if (recoveryCode) {
    const rec = await prisma.recoveryCode.findFirst({ where: { userId: user.id, code: recoveryCode, usedAt: null } });
    if (rec) {
      verified = true;
      await prisma.recoveryCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
    }
  } else if (code && user.twoFASecret) {
    verified = speakeasy.totp.verify({ secret: user.twoFASecret, encoding: 'base32', token: code, window: 1 });
  }
  if (!verified) return res.status(401).json({ error: 'Invalid 2FA verification' });
  const session = await prisma.session.create({ data: { userId: user.id, userAgent } });
  const token = signToken(user.id);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return res.json({ token, sessionId: session.id, user: { username: user.username, role: user.role, fullName: user.fullName } });
});

// 2FA setup/manage
app.post('/api/2fa/setup', authMiddleware, async (req: any, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const secret = speakeasy.generateSecret({ length: 20, name: `PayrollPro:${user.username}`, issuer: 'PayrollPro' });
  return res.json({ base32: secret.base32, otpauthUrl: secret.otpauth_url });
});

app.post('/api/2fa/enable', authMiddleware, async (req: any, res) => {
  const schema = z.object({ base32: z.string(), code: z.string().length(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { base32, code } = parsed.data;
  const ok = speakeasy.totp.verify({ secret: base32, encoding: 'base32', token: code, window: 1 });
  if (!ok) return res.status(400).json({ error: 'Invalid code' });
  const user = await prisma.user.update({ where: { id: req.userId }, data: { twoFAEnabled: true, twoFASecret: base32 } });
  // generate recovery codes
  const codes = Array.from({ length: 10 }).map(() => randomCode());
  await prisma.$transaction(codes.map(c => prisma.recoveryCode.create({ data: { userId: user.id, code: c } })));
  res.json({ enabled: true, recoveryCodes: codes });
});

app.post('/api/2fa/disable', authMiddleware, async (req: any, res) => {
  await prisma.user.update({ where: { id: req.userId }, data: { twoFAEnabled: false, twoFASecret: null } });
  await prisma.recoveryCode.deleteMany({ where: { userId: req.userId } });
  res.json({ disabled: true });
});

app.post('/api/2fa/recovery/regenerate', authMiddleware, async (req: any, res) => {
  await prisma.recoveryCode.deleteMany({ where: { userId: req.userId } });
  const codes = Array.from({ length: 10 }).map(() => randomCode());
  await prisma.$transaction(codes.map(c => prisma.recoveryCode.create({ data: { userId: req.userId, code: c } })));
  res.json({ recoveryCodes: codes });
});

// Sessions
app.get('/api/sessions', authMiddleware, async (req: any, res) => {
  const sessions = await prisma.session.findMany({ where: { userId: req.userId }, orderBy: { lastActive: 'desc' } });
  res.json({ sessions });
});
app.delete('/api/sessions/:id', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  await prisma.session.deleteMany({ where: { id, userId: req.userId } });
  res.json({ revoked: true });
});

// Profile
app.get('/api/profile', authMiddleware, async (req: any, res) => {
  const u = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!u) return res.status(404).json({ error: 'Not found' });
  res.json({
    username: u.username, email: u.email, fullName: u.fullName, phone: u.phone, department: u.department, role: u.role, employeeId: u.employeeId, lastLoginAt: u.lastLoginAt, twoFAEnabled: u.twoFAEnabled
  });
});
app.put('/api/profile', authMiddleware, async (req: any, res) => {
  const schema = z.object({ fullName: z.string(), email: z.string().email(), phone: z.string().optional(), department: z.string().optional() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const u = await prisma.user.update({ where: { id: req.userId }, data: { fullName: parsed.data.fullName, email: parsed.data.email, phone: parsed.data.phone, department: parsed.data.department } });
  res.json({ ok: true, user: { fullName: u.fullName, email: u.email, phone: u.phone, department: u.department } });
});

// Reports (PDF placeholder)
app.get('/api/reports/:id/pdf', authMiddleware, async (_req, res) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  // Minimal valid PDF bytes
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  res.end(pdf);
});

function randomCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const rand = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
  const rand2 = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
  return `${rand}-${rand2}`;
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


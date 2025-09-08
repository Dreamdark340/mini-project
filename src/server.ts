import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import path from 'path';
import expressWs from 'express-ws';
import { calcGainsQueue, redisSub } from './queue';
// Serve static frontend files located at project root
app.use(express.static(path.join(__dirname, '..')));

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
// Rate limiting for auth-related endpoints
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter);
app.use('/api/2fa', authLimiter);

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

function requireRole(...roles: string[]) {
  return async (req: any, res: any, next: any) => {
    const userId = (req as any).userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

// Seed demo user if not exists
app.get('/health', async (_req, res) => {
  // seed employee
  const emp = await prisma.user.findUnique({ where: { username: 'aaron' } });
  if (!emp) {
    const hash = await bcrypt.hash('password', 10);
    await prisma.user.create({ data: {
      username: 'aaron', email: 'aaron@company.com', passwordHash: hash,
      fullName: 'Aaron Employee', department: 'Operations', employeeId: 'EMP0001'
    }});
  }
  // seed hr
  const hr = await prisma.user.findUnique({ where: { username: 'hr1' } });
  if (!hr) {
    const hash = await bcrypt.hash('password', 10);
    await prisma.user.create({ data: {
      username: 'hr1', email: 'hr1@company.com', passwordHash: hash,
      fullName: 'Harper HR', department: 'HR', employeeId: 'EMP9001', role: 'hr'
    }});
  }
  // seed admin
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
  if (!admin) {
    const hash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({ data: {
      username: 'admin', email: 'admin@company.com', passwordHash: hash,
      fullName: 'Alex Admin', department: 'Admin', employeeId: 'EMP9999', role: 'admin'
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

// Auth: Change password
app.post('/api/auth/change-password', authMiddleware, async (req: any, res) => {
  const schema = z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { currentPassword, newPassword } = parsed.data;
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Current password incorrect' });
  const hash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
  res.json({ ok: true });
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

// HR Endpoints (hr or admin)
app.get('/api/hr/employees', authMiddleware, requireRole('hr', 'admin'), async (_req, res) => {
  const employees = await prisma.user.findMany({
    select: { id: true, username: true, email: true, fullName: true, role: true, department: true, employeeId: true, lastLoginAt: true },
    orderBy: { username: 'asc' }
  });
  res.json({ employees });
});

app.post('/api/hr/employees', authMiddleware, requireRole('hr', 'admin'), async (req, res) => {
  const schema = z.object({ username: z.string(), email: z.string().email(), fullName: z.string(), department: z.string().optional(), role: z.enum(['employee', 'hr', 'admin']).default('employee'), password: z.string().min(6) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { username, email, fullName, department, role, password } = parsed.data;
  const existing = await prisma.user.findFirst({ where: { OR: [{ username }, { email }] } });
  if (existing) return res.status(409).json({ error: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  const newEmp = await prisma.user.create({ data: {
    username, email, fullName, department, role, passwordHash: hash, employeeId: generateEmployeeId()
  }});
  res.status(201).json({ id: newEmp.id });
});

app.put('/api/hr/employees/:id/role', authMiddleware, requireRole('hr', 'admin'), async (req, res) => {
  const schema = z.object({ role: z.enum(['employee', 'hr', 'admin']) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { id } = req.params;
  const updated = await prisma.user.update({ where: { id }, data: { role: parsed.data.role } });
  res.json({ ok: true, role: updated.role });
});

// Payroll APIs (HR/Admin)
app.post('/api/hr/payroll', authMiddleware, requireRole('hr', 'admin'), async (req, res) => {
  const schema = z.object({
    username: z.string(),
    periodStart: z.string(),
    periodEnd: z.string(),
    baseSalary: z.number().int().nonnegative(),
    bonus: z.number().int().nonnegative().default(0),
    deductions: z.number().int().nonnegative().default(0)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });
  const { username, periodStart, periodEnd, baseSalary, bonus, deductions } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  const netPay = baseSalary + bonus - deductions;
  const entry = await prisma.payrollEntry.create({ data: {
    userId: user.id,
    periodStart: new Date(periodStart),
    periodEnd: new Date(periodEnd),
    baseSalary, bonus, deductions, netPay
  }});
  res.status(201).json({ id: entry.id });
});

app.get('/api/hr/payroll', authMiddleware, requireRole('hr', 'admin'), async (req, res) => {
  const { username } = req.query as { username?: string };
  let where: any = {};
  if (username) {
    const u = await prisma.user.findUnique({ where: { username } });
    if (!u) return res.json({ entries: [] });
    where.userId = u.id;
  }
  const entries = await prisma.payrollEntry.findMany({ where, orderBy: { createdAt: 'desc' }, include: { user: { select: { username: true, fullName: true, employeeId: true } } } });
  res.json({ entries });
});

app.get('/api/payslips/:id/pdf', authMiddleware, async (req: any, res) => {
  const { id } = req.params;
  const entry = await prisma.payrollEntry.findUnique({ where: { id }, include: { user: true } });
  if (!entry) return res.status(404).json({ error: 'Not found' });
  // Simple text PDF placeholder
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip_${entry.user.username}_${entry.id}.pdf"`);
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF');
  res.end(pdf);
});

// --- What-If Sandbox (simple in-memory prototype) ---
import { GainsEngineService } from './gains-engine'; // assume path placeholder
const gainsService = new GainsEngineService();
interface InMemSession { id:string; userId:string; method:CostBasisMethod; summary:GainSummary|null; }
const sessions = new Map<string,InMemSession>();

app.post('/api/what-if/sessions', authMiddleware, async (req:any,res)=>{
  const schema = z.object({ method:z.enum(['FIFO','LIFO','HIFO','SPEC_ID']) });
  const parsed=schema.safeParse(req.body); if(!parsed.success) return res.status(400).json({error:'Invalid'});
  const id=`ws_${Date.now().toString(36)}`;
  const userId=req.userId;
  await prisma.whatIfSession.create({ data:{ id, userId, method: parsed.data.method, summaryJson: '' } });
  await calcGainsQueue.add('calc', { sessionId:id, userId, method: parsed.data.method });
  res.status(202).json({ id, status:'queued' });
});

app.get('/api/what-if/sessions/:id/status', authMiddleware, async (req:any,res)=>{
  const sess = await prisma.whatIfSession.findUnique({ where:{ id:req.params.id } });
  if(!sess || sess.userId!==req.userId) return res.status(404).json({error:'Not found'});
  const ready = !!sess.summaryJson;
  res.json({ status: ready? 'ready':'queued' });
});

(app as any).ws('/ws/sandbox', (ws:any, req:any)=>{
  const sessionId = req.query.sessionId as string;
  if(!sessionId){ ws.close(); return; }
  const channel = `sandbox:${sessionId}`;
  const handler = (msgChannel:string,msg:string)=>{
    if(msgChannel===channel){ ws.send(JSON.stringify({ summary: JSON.parse(msg) as GainSummary })); }
  };
  redisSub.subscribe(channel);
  redisSub.on('message', handler);
  ws.on('close',()=>{
    redisSub.off('message', handler);
    redisSub.unsubscribe(channel);
  });
});

function randomCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const rand = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
  const rand2 = Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
  return `${rand}-${rand2}`;
}

function generateEmployeeId() {
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `EMP${num}`;
}

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


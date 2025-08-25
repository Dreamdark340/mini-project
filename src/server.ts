import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import speakeasy from 'speakeasy';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import puppeteer from 'puppeteer';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());
// Rate limiting for auth-related endpoints
const authLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 50 });
app.use('/api/auth', authLimiter);
app.use('/api/2fa', authLimiter);
const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

type JwtPayload = { sub: string };

// In-memory wallet store (per user) as fallback in dev
type WalletTx = { id: string; userId: string; symbol: string; amount: number; priceUsd?: number; type: 'trade'|'staking'|'airdrop'|'mining'; timestamp: string; source?: string };
const userIdToWalletTxs: Record<string, WalletTx[]> = Object.create(null);

// Encryption helpers (AES-256-GCM) for sensitive wallet fields
const ENC_KEY = (process.env.WALLET_ENC_KEY && Buffer.from(process.env.WALLET_ENC_KEY, 'base64').length === 32)
  ? Buffer.from(process.env.WALLET_ENC_KEY, 'base64')
  : Buffer.from('00000000000000000000000000000000', 'hex'); // dev-only key

function encryptString(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}
function decryptString(payloadB64: string): string {
  const buf = Buffer.from(payloadB64, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return out.toString('utf8');
}

function safeDecrypt(b64?: string | null): string | undefined {
  try { return b64 ? JSON.parse(decryptString(b64)).source ?? 'enc' : undefined; } catch { return undefined; }
}

function detectFormat(lowerHeaders: string[]): { symbol: string; symbolKind?: 'market'|'asset'|'symbol'; type: string; amount: string; price?: string; timestamp: string } | null {
  // Supported schemas (lower-cased header names):
  // 1) generic: symbol,type,amount,price,timestamp
  // 2) binance-like: date, market (BTCUSDT), type, price, amount
  // 3) coinbase-like: timestamp, transaction type, asset, quantity transacted, spot price at transaction
  const h = (name: string) => lowerHeaders.indexOf(name);
  // Generic
  if (h('symbol')>=0 && h('type')>=0 && h('amount')>=0 && h('timestamp')>=0) {
    return { symbol: lowerHeaders[h('symbol')], symbolKind: 'symbol', type: lowerHeaders[h('type')], amount: lowerHeaders[h('amount')], price: h('price')>=0? lowerHeaders[h('price')]: undefined, timestamp: lowerHeaders[h('timestamp')] };
  }
  // Binance-like
  if (h('date')>=0 && h('market')>=0 && h('type')>=0 && h('price')>=0 && h('amount')>=0) {
    return { symbol: lowerHeaders[h('market')], symbolKind: 'market', type: lowerHeaders[h('type')], amount: lowerHeaders[h('amount')], price: lowerHeaders[h('price')], timestamp: lowerHeaders[h('date')] };
  }
  // Coinbase-like
  if (h('timestamp')>=0 && h('transaction type')>=0 && h('asset')>=0 && h('quantity transacted')>=0 && h('spot price at transaction')>=0) {
    return { symbol: lowerHeaders[h('asset')], symbolKind: 'asset', type: lowerHeaders[h('transaction type')], amount: lowerHeaders[h('quantity transacted')], price: lowerHeaders[h('spot price at transaction')], timestamp: lowerHeaders[h('timestamp')] };
  }
  // Bybit-like: time, symbol, side, price, qty
  if (h('time')>=0 && h('symbol')>=0 && (h('side')>=0 || h('type')>=0) && (h('qty')>=0 || h('quantity')>=0) && h('price')>=0) {
    const qtyKey = h('qty')>=0 ? lowerHeaders[h('qty')] : lowerHeaders[h('quantity')];
    const typeKey = h('side')>=0 ? lowerHeaders[h('side')] : lowerHeaders[h('type')];
    return { symbol: lowerHeaders[h('symbol')], symbolKind: 'symbol', type: typeKey, amount: qtyKey, price: lowerHeaders[h('price')], timestamp: lowerHeaders[h('time')] };
  }
  // Kraken-like: time, type, asset pair, price, vol
  if (h('time')>=0 && (h('type')>=0 || h('side')>=0) && (h('asset pair')>=0 || h('pair')>=0) && (h('vol')>=0 || h('volume')>=0) && h('price')>=0) {
    const pairKey = h('asset pair')>=0 ? lowerHeaders[h('asset pair')] : lowerHeaders[h('pair')];
    const volKey = h('vol')>=0 ? lowerHeaders[h('vol')] : lowerHeaders[h('volume')];
    const typeKey = h('type')>=0 ? lowerHeaders[h('type')] : lowerHeaders[h('side')];
    return { symbol: pairKey, symbolKind: 'market', type: typeKey, amount: volKey, price: lowerHeaders[h('price')], timestamp: lowerHeaders[h('time')] };
  }
  return null;
}

function normalizeType(raw: string): 'trade'|'staking'|'airdrop'|'mining' {
  const t = raw.toLowerCase();
  if (['buy','sell','trade','spot','swap'].includes(t)) return 'trade';
  if (['stake','staking','reward'].includes(t)) return 'staking';
  if (['airdrop','gift'].includes(t)) return 'airdrop';
  if (['mine','mining'].includes(t)) return 'mining';
  return 'trade';
}

function extractBaseFromMarket(market: string): string {
  const m = market.toUpperCase();
  // Common quote assets to strip: USDT, USD, USDC, EUR, BTC, ETH
  const quotes = ['USDT','USD','USDC','EUR','BTC','ETH'];
  for (const q of quotes) {
    if (m.endsWith(q) && m.length > q.length) return m.slice(0, m.length - q.length);
  }
  // If contains '-', take first part
  if (m.includes('-')) return m.split('-')[0];
  return m;
}

function normalizeAsset(asset: string): string {
  return asset.replace(/[^A-Za-z0-9]/g, '');
}

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
  // seed trader
  const trader = await prisma.user.findUnique({ where: { username: 'trader1' } });
  if (!trader) {
    const hash = await bcrypt.hash('password', 10);
    await prisma.user.create({ data: {
      username: 'trader1', email: 'trader1@company.com', passwordHash: hash,
      fullName: 'Taylor Trader', department: 'Trading', employeeId: 'EMP7001', role: 'trader'
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
  const schema = z.object({ username: z.string(), email: z.string().email(), fullName: z.string(), department: z.string().optional(), role: z.enum(['employee', 'hr', 'admin', 'trader']).default('employee'), password: z.string().min(6) });
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
  const schema = z.object({ role: z.enum(['employee', 'hr', 'admin', 'trader']) });
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

// Trader APIs (stubs)
app.get('/api/trader/forecast', authMiddleware, requireRole('trader', 'admin'), async (_req, res) => {
  // Build from DB if available; fall back to in-memory; else demo
  const reqAny = _req as any;
  const dbTxs = await prisma.walletTransaction.findMany({ where: { userId: reqAny.userId } });
  const txs = (dbTxs.length > 0)
    ? dbTxs.map(r => ({ id: r.id, userId: r.userId, symbol: r.symbol, amount: r.amount, priceUsd: (r.priceUsdCents ?? 0) / 100, type: (r.type as any), timestamp: r.timestamp.toISOString(), source: safeDecrypt(r.sourceEnc) }))
    : (userIdToWalletTxs[reqAny.userId] || []);
  if (txs.length === 0) {
    return res.json({
      holdings: [
        { symbol: 'BTC', amount: 0.25, priceUsd: 65000, valueUsd: 16250 },
        { symbol: 'ETH', amount: 3.5, priceUsd: 3200, valueUsd: 11200 }
      ],
      totalValueUsd: 27450,
      realizedGainsYtdUsd: 1250,
      unrealizedGainsUsd: 3450,
      estimatedTaxUsd: 375
    });
  }
  const symbolToAmount: Record<string, number> = {};
  for (const tx of txs) {
    symbolToAmount[tx.symbol] = (symbolToAmount[tx.symbol] || 0) + tx.amount;
  }
  // naive pricing placeholders
  const priceMap: Record<string, number> = { BTC: 65000, ETH: 3200 };
  const holdings = Object.entries(symbolToAmount).map(([sym, amt]) => {
    const price = priceMap[sym] || 1;
    return { symbol: sym, amount: amt, priceUsd: price, valueUsd: amt * price };
  });
  const totalValueUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);
  // basic placeholders for gains and taxes
  const realizedGainsYtdUsd = Math.max(0, txs.filter(t=>t.type==='trade').reduce((s,_t)=> s + 50, 0));
  const unrealizedGainsUsd = Math.round(totalValueUsd * 0.12);
  const estimatedTaxUsd = Math.round(realizedGainsYtdUsd * 0.15);
  res.json({ holdings, totalValueUsd, realizedGainsYtdUsd, unrealizedGainsUsd, estimatedTaxUsd });
});

app.post('/api/trader/import/csv', authMiddleware, requireRole('trader', 'admin'), upload.single('file'), async (req: any, res) => {
  if (!req.file || !req.file.buffer) return res.status(400).json({ error: 'CSV file is required' });
  const dryRun = (req.query?.dryRun === '1' || req.query?.dryRun === 'true');
  const csv = req.file.buffer.toString('utf8');
  let records: any[];
  try {
    records = parse(csv, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    return res.status(400).json({ error: 'Invalid CSV format' });
  }
  if (!Array.isArray(records) || records.length === 0) return res.status(400).json({ error: 'No rows found' });
  // Detect columns
  const headerOrig = Object.keys(records[0]);
  const header = headerOrig.map(k=>k.toLowerCase());
  const mapping = detectFormat(header);
  if (!mapping) return res.status(400).json({ error: 'Unsupported CSV format' });
  // Validate and transform rows
  const rowErrors: { row: number; message: string }[] = [];
  const preview: { row: number; symbol: string; amount: number; price?: number; type: string; timestamp: string }[] = [];
  const toPersist: { symbol: string; amount: number; priceUsdCents?: number; type: string; timestamp: Date; sourceEnc?: string }[] = [];
  for (let i=0; i<records.length; i++) {
    const r = records[i];
    const rowNum = i + 2; // +1 header, +1 1-indexed
    // Extract fields according to mapping with helpers for market/asset symbols
    let rawSymbol = String(r[mapping.symbol] ?? '').trim();
    if (mapping.symbolKind === 'market') rawSymbol = extractBaseFromMarket(rawSymbol);
    if (mapping.symbolKind === 'asset') rawSymbol = normalizeAsset(rawSymbol);
    const symbol = rawSymbol.toUpperCase();
    const type = normalizeType(String(r[mapping.type] ?? ''));
    const amount = parseFloat(String(r[mapping.amount] ?? ''));
    const price = mapping.price ? parseFloat(String(r[mapping.price] ?? '')) : undefined;
    const timeRaw = String(r[mapping.timestamp] ?? '');
    const timestamp = new Date(timeRaw);
    const errors: string[] = [];
    if (!symbol || !/^[A-Z0-9]{2,10}$/.test(symbol)) errors.push('invalid symbol');
    if (!['trade','staking','airdrop','mining'].includes(type)) errors.push('invalid type');
    if (!Number.isFinite(amount)) errors.push('invalid amount');
    if (mapping.price && !Number.isFinite(price as number)) errors.push('invalid price');
    if (isNaN(timestamp.getTime())) errors.push('invalid timestamp');
    if (errors.length > 0) {
      rowErrors.push({ row: rowNum, message: errors.join(', ') });
      continue;
    }
    preview.push({ row: rowNum, symbol, amount, price, type, timestamp: timestamp.toISOString() });
    toPersist.push({ symbol, amount, priceUsdCents: price !== undefined ? Math.round((price as number) * 100) : undefined, type, timestamp, sourceEnc: encryptString(JSON.stringify({ source: 'CSV' })) });
  }
  if (dryRun) {
    return res.json({ ok: true, dryRun: true, rows: preview.slice(0, 200), errors: rowErrors.slice(0, 200), totalValid: preview.length, totalErrors: rowErrors.length });
  }
  if (toPersist.length === 0) {
    return res.status(400).json({ error: 'No valid rows to import', errors: rowErrors.slice(0, 200) });
  }
  const created = await prisma.$transaction(
    toPersist.map(t => prisma.walletTransaction.create({ data: { userId: req.userId, symbol: t.symbol, amount: t.amount, priceUsdCents: t.priceUsdCents, type: t.type, timestamp: t.timestamp, sourceEnc: t.sourceEnc } }))
  );
  res.json({ ok: true, imported: created.length, errors: rowErrors, totalValid: toPersist.length, totalErrors: rowErrors.length });
});

app.get('/api/trader/report.pdf', authMiddleware, requireRole('trader', 'admin'), async (_req, res) => {
  const reqAny = _req as any;
  // Fetch data
  const txs = await prisma.walletTransaction.findMany({ where: { userId: reqAny.userId }, orderBy: { timestamp: 'asc' } });
  const rows = txs.map(t=>({
    date: t.timestamp.toISOString().slice(0,10),
    symbol: t.symbol,
    type: t.type,
    amount: t.amount,
    price: (t.priceUsdCents ?? 0) / 100,
    value: (t.priceUsdCents ?? 0) / 100 * t.amount
  }));
  const totals = rows.reduce((acc, r)=>{ acc.value += r.value; return acc; }, { value: 0 });
  const html = renderReportHtml({ rows, totals });
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', bottom: '16mm', left: '12mm', right: '12mm' } });
  await browser.close();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="crypto_tax_report.pdf"');
  res.end(pdf);
});

function renderReportHtml(data: { rows: { date: string; symbol: string; type: string; amount: number; price: number; value: number }[]; totals: { value: number } }): string {
  const rowsHtml = data.rows.slice(0,500).map(r=>`
    <tr>
      <td>${r.date}</td>
      <td>${r.symbol}</td>
      <td>${r.type}</td>
      <td style="text-align:right;">${r.amount}</td>
      <td style="text-align:right;">$${r.price.toLocaleString()}</td>
      <td style="text-align:right;">$${r.value.toLocaleString()}</td>
    </tr>
  `).join('');
  return `<!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8"/>
    <style>
      body { font-family: Arial, sans-serif; color: #111; }
      .header { display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; }
      .brand { font-weight: 700; font-size: 18px; }
      h1 { font-size: 20px; margin: 0 0 8px 0; }
      .muted { color:#555; font-size: 12px; }
      table { width:100%; border-collapse: collapse; font-size: 12px; }
      th, td { border-bottom: 1px solid #ddd; padding: 6px; }
      th { background: #f3f3f3; text-align: left; }
      .section { margin-top: 14px; }
      .totals { text-align:right; font-weight: 600; }
      .foot { margin-top: 16px; font-size: 11px; color:#666; }
    </style>
  </head>
  <body>
    <div class="header">
      <div class="brand">PayrollPro</div>
      <div class="muted">Crypto Tax Report</div>
    </div>
    <h1>Holdings & Transactions Summary</h1>
    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Asset</th>
            <th>Type</th>
            <th style="text-align:right;">Amount</th>
            <th style="text-align:right;">Price (USD)</th>
            <th style="text-align:right;">Value (USD)</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      <div class="totals">Total Value (approx): $${data.totals.value.toLocaleString()}</div>
    </div>
    <div class="foot">
      Generated by PayrollPro. This report is informational and not tax advice.
    </div>
  </body>
  </html>`;
}

// List transactions (in-memory store)
app.get('/api/trader/transactions', authMiddleware, requireRole('trader', 'admin'), async (_req, res) => {
  const reqAny = _req as any;
  const rows = await prisma.walletTransaction.findMany({ where: { userId: reqAny.userId }, orderBy: { timestamp: 'desc' } });
  const items: WalletTx[] = rows.map(r => ({ id: r.id, userId: r.userId, symbol: r.symbol, amount: r.amount, priceUsd: (r.priceUsdCents ?? 0) / 100, type: (r.type as any), timestamp: r.timestamp.toISOString(), source: safeDecrypt(r.sourceEnc) }));
  res.json({ transactions: items });
});

// Gains calculation (FIFO/LIFO - simplified placeholder)
app.get('/api/trader/gains', authMiddleware, requireRole('trader', 'admin'), async (_req, res) => {
  const strategy = (typeof _req.query.strategy === 'string' ? _req.query.strategy : 'fifo').toLowerCase();
  const reqAny = _req as any;
  const rows = await prisma.walletTransaction.findMany({ where: { userId: reqAny.userId, type: 'trade' } });
  const txs: WalletTx[] = rows.map(r=>({ id: r.id, userId: r.userId, symbol: r.symbol, amount: r.amount, priceUsd: (r.priceUsdCents ?? 0)/100, type: 'trade', timestamp: r.timestamp.toISOString(), source: safeDecrypt(r.sourceEnc) }));
  // placeholder: $50 gain per trade, FIFO/LIFO just changes ordering count
  const sorted = [...txs].sort((a,b)=> strategy==='lifo' ? (a.timestamp<b.timestamp?1:-1) : (a.timestamp<b.timestamp?-1:1));
  const realizedGainsUsd = sorted.length * 50;
  const shortTermUsd = Math.round(realizedGainsUsd * 0.7);
  const longTermUsd = realizedGainsUsd - shortTermUsd;
  res.json({ strategy, realizedGainsUsd, shortTermUsd, longTermUsd });
});

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});


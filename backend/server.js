const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const app = express();
const prisma = new PrismaClient();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login requests per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        twoFAEnabled: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token or user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Authentication endpoints
app.post('/api/auth/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        passwordHash: true,
        isActive: true,
        twoFAEnabled: true,
        twoFASecret: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if 2FA is enabled
    if (user.twoFAEnabled && user.twoFASecret) {
      return res.json({
        twoFARequired: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful login
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'LOGIN',
        description: 'User logged in successfully',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'INFO'
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 2FA verification endpoint
app.post('/api/auth/2fa', async (req, res) => {
  try {
    const { username, code, recoveryCode } = req.body;

    if (!username || (!code && !recoveryCode)) {
      return res.status(400).json({ error: 'Username and 2FA code or recovery code required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        twoFAEnabled: true,
        twoFASecret: true,
        recoveryCodes: true
      }
    });

    if (!user || !user.isActive || !user.twoFAEnabled || !user.twoFASecret) {
      return res.status(401).json({ error: 'Invalid user or 2FA not enabled' });
    }

    let isValid = false;

    // Verify TOTP code
    if (code) {
      isValid = speakeasy.totp.verify({
        secret: user.twoFASecret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time windows for clock skew
      });
    }

    // Verify recovery code
    if (!isValid && recoveryCode) {
      const recoveryCodes = JSON.parse(user.recoveryCodes || '[]');
      const codeIndex = recoveryCodes.indexOf(recoveryCode);
      
      if (codeIndex !== -1) {
        // Remove used recovery code
        recoveryCodes.splice(codeIndex, 1);
        await prisma.user.update({
          where: { id: user.id },
          data: { recoveryCodes: JSON.stringify(recoveryCodes) }
        });
        
        isValid = true;

        // Log recovery code usage
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: '2FA_RECOVERY_CODE_USED',
            description: 'User used 2FA recovery code',
            ipAddress: req.ip,
            userAgent: req.get('User-Agent'),
            severity: 'WARNING'
          }
        });
      }
    }

    if (!isValid) {
      // Log failed 2FA attempt
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: '2FA_FAILED',
          description: 'Failed 2FA verification attempt',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          severity: 'WARNING'
        }
      });

      return res.status(401).json({ error: 'Invalid 2FA code' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Log successful 2FA verification
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: '2FA_SUCCESS',
        description: 'User successfully completed 2FA verification',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'INFO'
      }
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });

  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Setup 2FA endpoint
app.post('/api/auth/2fa/setup', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if 2FA is already enabled
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFAEnabled: true }
    });

    if (user.twoFAEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `PayrollPro (${req.user.username})`,
      issuer: 'PayrollPro'
    });

    // Generate recovery codes
    const recoveryCodes = [];
    for (let i = 0; i < 10; i++) {
      recoveryCodes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }

    // Store secret and recovery codes (but don't enable 2FA yet)
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFASecret: secret.base32,
        recoveryCodes: JSON.stringify(recoveryCodes)
      }
    });

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      recoveryCodes
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enable 2FA endpoint
app.post('/api/auth/2fa/enable', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // Get user with 2FA secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFASecret: true }
    });

    if (!user.twoFASecret) {
      return res.status(400).json({ error: '2FA setup not completed' });
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Enable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: { twoFAEnabled: true }
    });

    // Log 2FA enablement
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: '2FA_ENABLED',
        description: 'User enabled 2FA',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'INFO'
      }
    });

    res.json({ message: '2FA enabled successfully' });

  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Disable 2FA endpoint
app.post('/api/auth/2fa/disable', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const userId = req.user.id;

    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }

    // Get user with 2FA secret
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFASecret: true }
    });

    if (!user.twoFASecret) {
      return res.status(400).json({ error: '2FA not enabled' });
    }

    // Verify code
    const isValid = speakeasy.totp.verify({
      secret: user.twoFASecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid verification code' });
    }

    // Disable 2FA
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFAEnabled: false,
        twoFASecret: null,
        recoveryCodes: null
      }
    });

    // Log 2FA disablement
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: '2FA_DISABLED',
        description: 'User disabled 2FA',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'WARNING'
      }
    });

    res.json({ message: '2FA disabled successfully' });

  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login history endpoint
app.post('/api/auth/login-history', authenticateToken, async (req, res) => {
  try {
    const { username, loginHistory } = req.body;
    
    // Store login history
    await prisma.loginHistory.create({
      data: {
        userId: req.user.id,
        username: username,
        ipAddress: loginHistory.ipAddress,
        userAgent: loginHistory.device,
        status: loginHistory.status,
        location: loginHistory.location,
        timestamp: new Date(loginHistory.timestamp)
      }
    });

    res.json({ message: 'Login history recorded' });

  } catch (error) {
    console.error('Login history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile endpoint
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        twoFAEnabled: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user profile endpoint
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { fullName, email, department } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        fullName,
        email,
        department
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        department: true,
        twoFAEnabled: true
      }
    });

    // Log profile update
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'PROFILE_UPDATE',
        description: 'User updated profile',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'INFO'
      }
    });

    res.json({ user: updatedUser });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    // Log logout
    await prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'LOGOUT',
        description: 'User logged out',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        severity: 'INFO'
      }
    });

    res.json({ message: 'Logged out successfully' });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
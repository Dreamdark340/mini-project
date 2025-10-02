const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@payrollpro.com',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: 'ADMIN',
      department: 'IT',
      isActive: true,
      twoFAEnabled: false
    }
  });

  // Create HR user
  const hrPassword = await bcrypt.hash('hr123', 12);
  const hr = await prisma.user.upsert({
    where: { username: 'hr' },
    update: {},
    create: {
      username: 'hr',
      email: 'hr@payrollpro.com',
      passwordHash: hrPassword,
      fullName: 'HR Manager',
      role: 'HR',
      department: 'Human Resources',
      isActive: true,
      twoFAEnabled: false
    }
  });

  // Create employee user
  const employeePassword = await bcrypt.hash('employee123', 12);
  const employee = await prisma.user.upsert({
    where: { username: 'employee' },
    update: {},
    create: {
      username: 'employee',
      email: 'employee@payrollpro.com',
      passwordHash: employeePassword,
      fullName: 'John Employee',
      role: 'EMPLOYEE',
      department: 'Operations',
      isActive: true,
      twoFAEnabled: false
    }
  });

  // Create crypto trader user
  const cryptoPassword = await bcrypt.hash('crypto123', 12);
  const cryptoTrader = await prisma.user.upsert({
    where: { username: 'crypto' },
    update: {},
    create: {
      username: 'crypto',
      email: 'crypto@payrollpro.com',
      passwordHash: cryptoPassword,
      fullName: 'Crypto Trader',
      role: 'CRYPTO_TRADER',
      department: 'Finance',
      isActive: true,
      twoFAEnabled: false
    }
  });

  // Create system settings
  const systemSettings = [
    { category: 'general', key: 'company_name', value: 'PayrollPro Inc.', type: 'string' },
    { category: 'general', key: 'timezone', value: 'UTC', type: 'string' },
    { category: 'general', key: 'currency', value: 'USD', type: 'string' },
    { category: 'general', key: 'payroll_cycle', value: 'bi-weekly', type: 'string' },
    { category: 'security', key: 'require_2fa', value: 'true', type: 'boolean' },
    { category: 'security', key: 'password_min_length', value: '8', type: 'number' },
    { category: 'security', key: 'session_timeout', value: '60', type: 'number' },
    { category: 'crypto', key: 'enabled', value: 'true', type: 'boolean' },
    { category: 'crypto', key: 'supported_currencies', value: '["BTC","ETH","USDT","USDC","BNB"]', type: 'json' },
    { category: 'notifications', key: 'email_enabled', value: 'true', type: 'boolean' },
    { category: 'notifications', key: 'sms_enabled', value: 'false', type: 'boolean' }
  ];

  for (const setting of systemSettings) {
    await prisma.systemSetting.upsert({
      where: {
        category_key: {
          category: setting.category,
          key: setting.key
        }
      },
      update: {},
      create: setting
    });
  }

  // Create sample exchange rates
  const exchangeRates = [
    { cryptoType: 'BTC', price: 45000.00, change24h: 2.5, volume24h: 28000000000, marketCap: 850000000000 },
    { cryptoType: 'ETH', price: 3200.00, change24h: -1.2, volume24h: 15000000000, marketCap: 380000000000 },
    { cryptoType: 'USDT', price: 1.00, change24h: 0.1, volume24h: 25000000000, marketCap: 100000000000 },
    { cryptoType: 'USDC', price: 1.00, change24h: 0.05, volume24h: 8000000000, marketCap: 35000000000 },
    { cryptoType: 'BNB', price: 320.00, change24h: 3.1, volume24h: 2000000000, marketCap: 50000000000 }
  ];

  for (const rate of exchangeRates) {
    await prisma.exchangeRate.create({
      data: rate
    });
  }

  console.log('Database seeded successfully!');
  console.log('Created users:');
  console.log('- Admin: admin / admin123');
  console.log('- HR: hr / hr123');
  console.log('- Employee: employee / employee123');
  console.log('- Crypto Trader: crypto / crypto123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
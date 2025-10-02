const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'payrollpro',
  charset: 'utf8mb4'
};

async function seedDatabase() {
  let connection;
  
  try {
    console.log('Connecting to MySQL database...');
    connection = await mysql.createConnection(dbConfig);
    
    console.log('Starting database seed...');

    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    const adminId = crypto.randomUUID();
    
    await connection.execute(`
      INSERT INTO users (id, username, email, passwordHash, fullName, role, department, isActive, twoFAEnabled, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        email = VALUES(email),
        passwordHash = VALUES(passwordHash),
        fullName = VALUES(fullName),
        role = VALUES(role),
        department = VALUES(department),
        isActive = VALUES(isActive),
        twoFAEnabled = VALUES(twoFAEnabled),
        updatedAt = NOW()
    `, [adminId, 'admin', 'admin@payrollpro.com', adminPassword, 'System Administrator', 'ADMIN', 'IT', true, false]);

    // Create HR user
    const hrPassword = await bcrypt.hash('hr123', 12);
    const hrId = crypto.randomUUID();
    
    await connection.execute(`
      INSERT INTO users (id, username, email, passwordHash, fullName, role, department, isActive, twoFAEnabled, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        email = VALUES(email),
        passwordHash = VALUES(passwordHash),
        fullName = VALUES(fullName),
        role = VALUES(role),
        department = VALUES(department),
        isActive = VALUES(isActive),
        twoFAEnabled = VALUES(twoFAEnabled),
        updatedAt = NOW()
    `, [hrId, 'hr', 'hr@payrollpro.com', hrPassword, 'HR Manager', 'HR', 'Human Resources', true, false]);

    // Create employee user
    const employeePassword = await bcrypt.hash('employee123', 12);
    const employeeId = crypto.randomUUID();
    
    await connection.execute(`
      INSERT INTO users (id, username, email, passwordHash, fullName, role, department, isActive, twoFAEnabled, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        email = VALUES(email),
        passwordHash = VALUES(passwordHash),
        fullName = VALUES(fullName),
        role = VALUES(role),
        department = VALUES(department),
        isActive = VALUES(isActive),
        twoFAEnabled = VALUES(twoFAEnabled),
        updatedAt = NOW()
    `, [employeeId, 'employee', 'employee@payrollpro.com', employeePassword, 'John Employee', 'EMPLOYEE', 'Operations', true, false]);

    // Create crypto trader user
    const cryptoPassword = await bcrypt.hash('crypto123', 12);
    const cryptoId = crypto.randomUUID();
    
    await connection.execute(`
      INSERT INTO users (id, username, email, passwordHash, fullName, role, department, isActive, twoFAEnabled, createdAt, updatedAt) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE 
        email = VALUES(email),
        passwordHash = VALUES(passwordHash),
        fullName = VALUES(fullName),
        role = VALUES(role),
        department = VALUES(department),
        isActive = VALUES(isActive),
        twoFAEnabled = VALUES(twoFAEnabled),
        updatedAt = NOW()
    `, [cryptoId, 'crypto', 'crypto@payrollpro.com', cryptoPassword, 'Crypto Trader', 'CRYPTO_TRADER', 'Finance', true, false]);

    // Create sample payroll records
    const samplePayrolls = [
      {
        userId: employeeId,
        periodStart: '2024-01-01',
        periodEnd: '2024-01-15',
        basicSalary: 5000.00,
        hra: 1500.00,
        lta: 500.00,
        medicalAllowance: 300.00,
        transportAllowance: 200.00,
        bonus: 1000.00,
        deductions: 200.00,
        tax: 800.00,
        netPay: 7500.00,
        status: 'PAID'
      },
      {
        userId: employeeId,
        periodStart: '2024-01-16',
        periodEnd: '2024-01-31',
        basicSalary: 5000.00,
        hra: 1500.00,
        lta: 500.00,
        medicalAllowance: 300.00,
        transportAllowance: 200.00,
        bonus: 0.00,
        deductions: 200.00,
        tax: 750.00,
        netPay: 6550.00,
        status: 'PROCESSED'
      }
    ];

    for (const payroll of samplePayrolls) {
      const payrollId = crypto.randomUUID();
      await connection.execute(`
        INSERT INTO payroll_records (id, userId, periodStart, periodEnd, basicSalary, hra, lta, medicalAllowance, transportAllowance, bonus, deductions, tax, netPay, status, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          periodStart = VALUES(periodStart),
          periodEnd = VALUES(periodEnd),
          basicSalary = VALUES(basicSalary),
          hra = VALUES(hra),
          lta = VALUES(lta),
          medicalAllowance = VALUES(medicalAllowance),
          transportAllowance = VALUES(transportAllowance),
          bonus = VALUES(bonus),
          deductions = VALUES(deductions),
          tax = VALUES(tax),
          netPay = VALUES(netPay),
          status = VALUES(status),
          updatedAt = NOW()
      `, [
        payrollId, payroll.userId, payroll.periodStart, payroll.periodEnd,
        payroll.basicSalary, payroll.hra, payroll.lta, payroll.medicalAllowance,
        payroll.transportAllowance, payroll.bonus, payroll.deductions,
        payroll.tax, payroll.netPay, payroll.status
      ]);
    }

    // Create sample crypto wallets
    const sampleWallets = [
      {
        userId: cryptoId,
        cryptoType: 'BTC',
        walletAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
      },
      {
        userId: cryptoId,
        cryptoType: 'ETH',
        walletAddress: '0x742d35Cc6634C0532925a3b8D2d9C3b2b8B5B4B4'
      },
      {
        userId: employeeId,
        cryptoType: 'USDT',
        walletAddress: 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
      }
    ];

    for (const wallet of sampleWallets) {
      const walletId = crypto.randomUUID();
      await connection.execute(`
        INSERT INTO crypto_wallets (id, userId, cryptoType, walletAddress, isActive, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          cryptoType = VALUES(cryptoType),
          walletAddress = VALUES(walletAddress),
          isActive = VALUES(isActive),
          updatedAt = NOW()
      `, [walletId, wallet.userId, wallet.cryptoType, wallet.walletAddress, true]);
    }

    // Create sample crypto transactions
    const sampleTransactions = [
      {
        userId: cryptoId,
        cryptoType: 'BTC',
        amount: 0.001,
        fiatValue: 45.00,
        txHash: 'abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890',
        status: 'CONFIRMED',
        gasFee: 0.00001,
        blockNumber: 800000
      },
      {
        userId: employeeId,
        cryptoType: 'USDT',
        amount: 100.00,
        fiatValue: 100.00,
        txHash: 'xyz789abc123def456ghi789jkl012mno345pqr678stu901vwx234',
        status: 'PENDING',
        gasFee: 0.50
      }
    ];

    for (const transaction of sampleTransactions) {
      const transactionId = crypto.randomUUID();
      await connection.execute(`
        INSERT INTO crypto_transactions (id, userId, cryptoType, amount, fiatValue, txHash, status, gasFee, blockNumber, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ON DUPLICATE KEY UPDATE
          cryptoType = VALUES(cryptoType),
          amount = VALUES(amount),
          fiatValue = VALUES(fiatValue),
          txHash = VALUES(txHash),
          status = VALUES(status),
          gasFee = VALUES(gasFee),
          blockNumber = VALUES(blockNumber)
      `, [
        transactionId, transaction.userId, transaction.cryptoType,
        transaction.amount, transaction.fiatValue, transaction.txHash,
        transaction.status, transaction.gasFee, transaction.blockNumber
      ]);
    }

    console.log('Database seeded successfully!');
    console.log('Created users:');
    console.log('- Admin: admin / admin123');
    console.log('- HR: hr / hr123');
    console.log('- Employee: employee / employee123');
    console.log('- Crypto Trader: crypto / crypto123');
    console.log('Created sample data:');
    console.log('- 2 payroll records');
    console.log('- 3 crypto wallets');
    console.log('- 2 crypto transactions');

  } catch (error) {
    console.error('Database seeding error:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('Seeding completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
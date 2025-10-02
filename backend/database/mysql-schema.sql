-- PayrollPro MySQL Database Schema
-- Create database and tables for production use

-- Create database
CREATE DATABASE IF NOT EXISTS payrollpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE payrollpro;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    passwordHash VARCHAR(255) NOT NULL,
    fullName VARCHAR(100) NOT NULL,
    role ENUM('EMPLOYEE', 'HR', 'ADMIN', 'CRYPTO_TRADER') DEFAULT 'EMPLOYEE',
    department VARCHAR(50),
    isActive BOOLEAN DEFAULT TRUE,
    twoFAEnabled BOOLEAN DEFAULT FALSE,
    twoFASecret VARCHAR(255),
    recoveryCodes TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_isActive (isActive)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    token VARCHAR(500) UNIQUE NOT NULL,
    userAgent TEXT,
    ipAddress VARCHAR(45),
    isActive BOOLEAN DEFAULT TRUE,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_token (token),
    INDEX idx_expiresAt (expiresAt)
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    severity ENUM('INFO', 'WARNING', 'ERROR', 'CRITICAL') DEFAULT 'INFO',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_action (action),
    INDEX idx_severity (severity),
    INDEX idx_createdAt (createdAt)
);

-- Login history table
CREATE TABLE IF NOT EXISTS login_history (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    username VARCHAR(50) NOT NULL,
    ipAddress VARCHAR(45),
    userAgent TEXT,
    status VARCHAR(20) NOT NULL,
    location VARCHAR(100),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_username (username),
    INDEX idx_timestamp (timestamp)
);

-- Payroll records table
CREATE TABLE IF NOT EXISTS payroll_records (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    periodStart DATE NOT NULL,
    periodEnd DATE NOT NULL,
    basicSalary DECIMAL(10,2) NOT NULL,
    hra DECIMAL(10,2) DEFAULT 0,
    lta DECIMAL(10,2) DEFAULT 0,
    medicalAllowance DECIMAL(10,2) DEFAULT 0,
    transportAllowance DECIMAL(10,2) DEFAULT 0,
    bonus DECIMAL(10,2) DEFAULT 0,
    deductions DECIMAL(10,2) DEFAULT 0,
    tax DECIMAL(10,2) DEFAULT 0,
    netPay DECIMAL(10,2) NOT NULL,
    taxRegion VARCHAR(10) DEFAULT 'US',
    status ENUM('PENDING', 'PROCESSED', 'PAID', 'FAILED') DEFAULT 'PENDING',
    createdBy VARCHAR(36),
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_periodStart (periodStart),
    INDEX idx_periodEnd (periodEnd),
    INDEX idx_status (status)
);

-- Crypto wallets table
CREATE TABLE IF NOT EXISTS crypto_wallets (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    cryptoType VARCHAR(10) NOT NULL,
    walletAddress VARCHAR(255) NOT NULL,
    isActive BOOLEAN DEFAULT TRUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_cryptoType (cryptoType),
    INDEX idx_isActive (isActive)
);

-- Crypto transactions table
CREATE TABLE IF NOT EXISTS crypto_transactions (
    id VARCHAR(36) PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    cryptoType VARCHAR(10) NOT NULL,
    amount DECIMAL(18,8) NOT NULL,
    fiatValue DECIMAL(10,2) NOT NULL,
    txHash VARCHAR(255) NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'FAILED') DEFAULT 'PENDING',
    gasFee DECIMAL(18,8) DEFAULT 0,
    blockNumber BIGINT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_cryptoType (cryptoType),
    INDEX idx_status (status),
    INDEX idx_txHash (txHash)
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'string',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_category_key (category, key),
    INDEX idx_category (category),
    INDEX idx_key (key)
);

-- Exchange rates table
CREATE TABLE IF NOT EXISTS exchange_rates (
    id VARCHAR(36) PRIMARY KEY,
    cryptoType VARCHAR(10) NOT NULL,
    price DECIMAL(18,8) NOT NULL,
    change24h DECIMAL(10,4) NOT NULL,
    volume24h DECIMAL(18,2) NOT NULL,
    marketCap DECIMAL(18,2) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_cryptoType (cryptoType),
    INDEX idx_timestamp (timestamp)
);

-- Insert default system settings
INSERT INTO system_settings (id, category, key, value, type) VALUES
(UUID(), 'general', 'company_name', 'PayrollPro Inc.', 'string'),
(UUID(), 'general', 'timezone', 'UTC', 'string'),
(UUID(), 'general', 'currency', 'USD', 'string'),
(UUID(), 'general', 'payroll_cycle', 'bi-weekly', 'string'),
(UUID(), 'security', 'require_2fa', 'true', 'boolean'),
(UUID(), 'security', 'password_min_length', '8', 'number'),
(UUID(), 'security', 'session_timeout', '60', 'number'),
(UUID(), 'crypto', 'enabled', 'true', 'boolean'),
(UUID(), 'crypto', 'supported_currencies', '["BTC","ETH","USDT","USDC","BNB"]', 'json'),
(UUID(), 'notifications', 'email_enabled', 'true', 'boolean'),
(UUID(), 'notifications', 'sms_enabled', 'false', 'boolean')
ON DUPLICATE KEY UPDATE value = VALUES(value);

-- Insert sample exchange rates
INSERT INTO exchange_rates (id, cryptoType, price, change24h, volume24h, marketCap) VALUES
(UUID(), 'BTC', 45000.00, 2.5, 28000000000, 850000000000),
(UUID(), 'ETH', 3200.00, -1.2, 15000000000, 380000000000),
(UUID(), 'USDT', 1.00, 0.1, 25000000000, 100000000000),
(UUID(), 'USDC', 1.00, 0.05, 8000000000, 35000000000),
(UUID(), 'BNB', 320.00, 3.1, 2000000000, 50000000000)
ON DUPLICATE KEY UPDATE 
    price = VALUES(price),
    change24h = VALUES(change24h),
    volume24h = VALUES(volume24h),
    marketCap = VALUES(marketCap);

-- Create user for application (replace with your credentials)
-- CREATE USER 'payroll_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON payrollpro.* TO 'payroll_user'@'localhost';
-- FLUSH PRIVILEGES;
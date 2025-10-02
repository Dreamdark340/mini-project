# 🚀 PayrollPro Deployment Guide

## 📋 **Overview**

This guide covers deploying PayrollPro in production environments with security, scalability, and reliability considerations.

## 🏗️ **Architecture**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │────│   Web Server    │────│   Application   │
│   (nginx)       │    │   (nginx)       │    │   (Node.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                       │
                       ┌─────────────────┐            │
                       │   Database      │────────────┘
                       │   (MySQL)       │
                       └─────────────────┘
```

## 🛠️ **Prerequisites**

### **System Requirements**
- **CPU:** 2+ cores
- **RAM:** 4GB+ 
- **Storage:** 20GB+ SSD
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+

### **Software Requirements**
- **Node.js:** >= 18.0.0
- **MySQL:** >= 8.0
- **Nginx:** >= 1.18
- **SSL Certificate** (Let's Encrypt recommended)
- **PM2** (Process Manager)

## 🐧 **Linux Server Setup**

### **1. Update System**
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git vim
```

### **2. Install Node.js**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **3. Install MySQL**
```bash
# Install MySQL Server
sudo apt install -y mysql-server

# Secure MySQL installation
sudo mysql_secure_installation

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

### **4. Install Nginx**
```bash
# Install Nginx
sudo apt install -y nginx

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Configure firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

### **5. Install PM2**
```bash
# Install PM2 globally
sudo npm install -g pm2

# Setup PM2 startup
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 🗄️ **Database Setup**

### **1. Create Database and User**
```bash
# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE payrollpro CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'payroll_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON payrollpro.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### **2. Import Database Schema**
```bash
# Clone repository
git clone https://github.com/yourusername/payrollpro.git
cd payrollpro

# Import schema
mysql -u payroll_user -p payrollpro < backend/database/mysql-schema.sql

# Seed initial data
cd backend
npm install
node mysql-seed.js
```

## 🔧 **Application Setup**

### **1. Install Dependencies**
```bash
cd payrollpro/backend
npm install --production
```

### **2. Environment Configuration**
```bash
# Create production environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Production .env Configuration:**
```env
# Database
DB_HOST=localhost
DB_USER=payroll_user
DB_PASSWORD=your_secure_password
DB_NAME=payrollpro

# Security
JWT_SECRET=your-super-secret-jwt-key-change-in-production
NODE_ENV=production

# Server
PORT=4000
FRONTEND_URL=https://yourdomain.com

# Optional: Crypto APIs
CRYPTO_API_KEY=your_crypto_api_key
BINANCE_API_KEY=your_binance_key

# Optional: Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

### **3. Build and Start Application**
```bash
# Start with PM2
pm2 start mysqli-server.js --name "payrollpro-api"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs payrollpro-api
```

## 🌐 **Nginx Configuration**

### **1. Create Nginx Configuration**
```bash
sudo nano /etc/nginx/sites-available/payrollpro
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Frontend (Static Files)
    location / {
        root /var/www/payrollpro/frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API Backend
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
        access_log off;
    }
}

# Rate limiting configuration
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

### **2. Enable Site**
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/payrollpro /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### **3. Setup SSL Certificate**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

## 📁 **File Organization**

### **1. Create Application Directory**
```bash
sudo mkdir -p /var/www/payrollpro
sudo chown -R $USER:$USER /var/www/payrollpro
```

### **2. Copy Application Files**
```bash
# Copy frontend files
cp -r frontend/* /var/www/payrollpro/frontend/

# Copy backend files
cp -r backend /var/www/payrollpro/

# Set permissions
sudo chown -R www-data:www-data /var/www/payrollpro/frontend
sudo chmod -R 755 /var/www/payrollpro
```

## 🔒 **Security Configuration**

### **1. Firewall Setup**
```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Check status
sudo ufw status
```

### **2. Fail2Ban Setup**
```bash
# Install Fail2Ban
sudo apt install -y fail2ban

# Create configuration
sudo nano /etc/fail2ban/jail.local
```

**Fail2Ban Configuration:**
```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
```

### **3. Database Security**
```bash
# Edit MySQL configuration
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

**MySQL Security Settings:**
```ini
[mysqld]
# Security settings
bind-address = 127.0.0.1
skip-networking = false
local-infile = 0

# SSL settings
ssl-ca = /etc/mysql/ssl/ca.pem
ssl-cert = /etc/mysql/ssl/server-cert.pem
ssl-key = /etc/mysql/ssl/server-key.pem

# Logging
log-error = /var/log/mysql/error.log
slow-query-log = 1
slow-query-log-file = /var/log/mysql/mysql-slow.log
long-query-time = 2

# Performance
max_connections = 100
innodb_buffer_pool_size = 1G
```

## 📊 **Monitoring & Logging**

### **1. Setup Log Rotation**
```bash
sudo nano /etc/logrotate.d/payrollpro
```

**Log Rotation Configuration:**
```
/var/log/payrollpro/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reload payrollpro-api
    endscript
}
```

### **2. System Monitoring**
```bash
# Install monitoring tools
sudo apt install -y htop iotop nethogs

# Setup PM2 monitoring
pm2 install pm2-server-monit
pm2 install pm2-logrotate
```

### **3. Backup Script**
```bash
# Create backup script
sudo nano /usr/local/bin/payrollpro-backup.sh
```

**Backup Script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/payrollpro"
DB_NAME="payrollpro"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u payroll_user -p$DB_PASSWORD $DB_NAME > $BACKUP_DIR/database_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/application_$DATE.tar.gz /var/www/payrollpro

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/payrollpro-backup.sh

# Add to crontab
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/payrollpro-backup.sh
```

## 🚀 **Deployment Commands**

### **Quick Deployment Script**
```bash
#!/bin/bash
# deploy.sh

echo "🚀 Deploying PayrollPro..."

# Pull latest code
git pull origin main

# Install dependencies
cd backend
npm install --production

# Restart application
pm2 restart payrollpro-api

# Test deployment
curl -f http://localhost:4000/health || exit 1

echo "✅ Deployment completed successfully!"
```

### **Zero-Downtime Deployment**
```bash
#!/bin/bash
# zero-downtime-deploy.sh

echo "🔄 Starting zero-downtime deployment..."

# Pull latest code
git pull origin main

# Install dependencies
cd backend
npm install --production

# Graceful reload
pm2 reload payrollpro-api --update-env

# Health check
sleep 5
curl -f http://localhost:4000/health || {
    echo "❌ Health check failed, rolling back..."
    pm2 restart payrollpro-api
    exit 1
}

echo "✅ Zero-downtime deployment completed!"
```

## 🔧 **Maintenance**

### **Daily Tasks**
- Check application logs: `pm2 logs payrollpro-api`
- Monitor system resources: `htop`
- Verify SSL certificate: `sudo certbot certificates`

### **Weekly Tasks**
- Update system packages: `sudo apt update && sudo apt upgrade`
- Check database performance: `mysqladmin processlist`
- Review security logs: `sudo journalctl -u nginx`

### **Monthly Tasks**
- Update Node.js dependencies: `npm audit && npm update`
- Review and rotate logs
- Test backup restoration
- Security audit and penetration testing

## 🆘 **Troubleshooting**

### **Common Issues**

**1. Application Won't Start**
```bash
# Check PM2 logs
pm2 logs payrollpro-api

# Check system resources
free -h
df -h

# Restart application
pm2 restart payrollpro-api
```

**2. Database Connection Issues**
```bash
# Check MySQL status
sudo systemctl status mysql

# Test database connection
mysql -u payroll_user -p payrollpro -e "SELECT 1;"

# Check MySQL logs
sudo tail -f /var/log/mysql/error.log
```

**3. SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificate
sudo certbot renew

# Test SSL
openssl s_client -connect yourdomain.com:443
```

**4. Nginx Issues**
```bash
# Test configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

## 📈 **Performance Optimization**

### **Database Optimization**
- Enable query caching
- Optimize indexes
- Regular maintenance (ANALYZE, OPTIMIZE)
- Connection pooling

### **Application Optimization**
- Enable gzip compression
- Static file caching
- CDN integration
- Database query optimization

### **Server Optimization**
- SSD storage
- Sufficient RAM
- CPU optimization
- Network optimization

---

**For additional support, visit our [GitHub Issues](https://github.com/yourusername/payrollpro/issues)**
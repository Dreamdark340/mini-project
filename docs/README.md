# 💰 PayrollPro - Enterprise Payroll Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MySQL Version](https://img.shields.io/badge/mysql-%3E%3D8.0-blue.svg)](https://www.mysql.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow.svg)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

> **A complete enterprise-grade payroll management system with crypto integration, real 2FA authentication, and MySQL backend.**

## 🚀 **Features**

### 🔐 **Security & Authentication**
- ✅ Real Google Authenticator 2FA
- ✅ JWT token-based authentication
- ✅ Password hashing with bcrypt
- ✅ Rate limiting and security headers
- ✅ Audit logging and compliance

### 💼 **Payroll Management**
- ✅ Complete payroll processing
- ✅ Tax calculation engine
- ✅ Salary components breakdown
- ✅ Bank transfer simulation
- ✅ Payroll analytics dashboard
- ✅ Bulk CSV import/export

### 🪙 **Crypto Integration**
- ✅ Live exchange rates
- ✅ Crypto salary options
- ✅ Wallet management
- ✅ Transaction tracking
- ✅ Crypto tax reporting

### 👥 **User Management**
- ✅ Role-based access control
- ✅ Employee directory
- ✅ Performance reviews
- ✅ Leave management
- ✅ Time tracking

### 🛠️ **Technical Features**
- ✅ MySQL database backend
- ✅ RESTful API architecture
- ✅ Real-time data updates
- ✅ Responsive design
- ✅ Production-ready deployment

## 📋 **Requirements**

- **Node.js** >= 18.0.0
- **MySQL** >= 8.0
- **npm** >= 8.0.0
- **Python** >= 3.8 (for frontend serving)

## 🚀 **Quick Start**

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/payrollpro.git
cd payrollpro
```

### 2. Setup Database
```bash
# Install MySQL (Ubuntu/Debian)
sudo apt-get install mysql-server

# Create database
mysql -u root -p
CREATE DATABASE payrollpro;
CREATE USER 'payroll_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON payrollpro.* TO 'payroll_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 3. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your MySQL credentials
mysql -u root -p payrollpro < database/mysql-schema.sql
npm run db:seed
npm start
```

### 4. Serve Frontend
```bash
# From root directory
python3 -m http.server 3000
```

### 5. Access the System
- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:4000
- **Default Login:** admin / admin123

## 🔐 **Default Credentials**

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| **Admin** | admin | admin123 | Full system access |
| **HR** | hr | hr123 | HR management |
| **Employee** | employee | employee123 | Basic employee access |
| **Crypto Trader** | crypto | crypto123 | Crypto operations |

**⚠️ IMPORTANT: Change these passwords immediately in production!**

## 📁 **Project Structure**

```
payrollpro/
├── 📁 frontend/                 # Frontend files
│   ├── login.html              # Authentication page
│   ├── employee-dashboard.html # Employee interface
│   ├── hr-dashboard.html       # HR management
│   ├── crypto-trader-dashboard.html # Crypto trading
│   ├── style.css               # Global styles
│   ├── api-client.js           # API client library
│   └── navigation-enhancer.js  # Navigation system
├── 📁 backend/                 # Backend API
│   ├── mysqli-server.js        # Main server
│   ├── package.json            # Dependencies
│   ├── .env.example            # Environment config
│   ├── mysql-seed.js           # Database seeder
│   └── 📁 database/            # Database files
│       └── mysql-schema.sql    # MySQL schema
├── 📁 docs/                    # Documentation
│   ├── PRODUCTION_SETUP.md     # Production guide
│   ├── API_DOCUMENTATION.md    # API docs
│   └── DEPLOYMENT.md           # Deployment guide
└── README.md                   # This file
```

## 🛠️ **Development**

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon
npm test     # Run tests
```

### Frontend Development
```bash
# Serve frontend files
python3 -m http.server 3000

# Or use any static file server
npx serve .
```

## 📚 **API Documentation**

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/2fa` - 2FA verification
- `POST /api/auth/2fa/setup` - Setup 2FA
- `POST /api/auth/logout` - User logout

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile
- `GET /api/employees` - List employees
- `POST /api/employees` - Create employee

### Payroll Management
- `GET /api/payroll/records` - Get payroll records
- `POST /api/payroll/records` - Create payroll record
- `PUT /api/payroll/records/:id` - Update payroll record

### Crypto Operations
- `GET /api/crypto/exchange-rates` - Get exchange rates
- `GET /api/crypto/wallets` - Get crypto wallets
- `POST /api/crypto/wallets` - Create crypto wallet

## 🔒 **Security Features**

- **JWT Authentication** with token expiration
- **Google Authenticator 2FA** with QR code setup
- **Password Hashing** using bcrypt with salt rounds
- **Rate Limiting** on authentication endpoints
- **CORS Protection** for cross-origin requests
- **Helmet Security Headers** for XSS protection
- **Audit Logging** for all user actions
- **Input Validation** and sanitization

## 🚀 **Production Deployment**

### Environment Variables
```bash
# Database
DB_HOST=localhost
DB_USER=payroll_user
DB_PASSWORD=your_secure_password
DB_NAME=payrollpro

# Security
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=production
FRONTEND_URL=https://yourdomain.com

# Optional: Crypto APIs
CRYPTO_API_KEY=your_crypto_api_key
BINANCE_API_KEY=your_binance_key
```

### Production Checklist
- [ ] Change default passwords
- [ ] Set strong JWT secret
- [ ] Configure SSL certificates
- [ ] Setup database backups
- [ ] Configure firewall rules
- [ ] Enable audit logging
- [ ] Setup monitoring

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Speakeasy** for 2FA implementation
- **MySQL** for database backend
- **Chart.js** for analytics dashboards
- **Font Awesome** for icons
- **Bootstrap** for responsive design

## 📞 **Support**

- **Issues:** [GitHub Issues](https://github.com/yourusername/payrollpro/issues)
- **Documentation:** [Wiki](https://github.com/yourusername/payrollpro/wiki)
- **Email:** support@payrollpro.com

## 🔄 **Version History**

- **v1.0.0** - Initial release with MySQL backend
- **v0.9.0** - Crypto integration added
- **v0.8.0** - Real 2FA implementation
- **v0.7.0** - Production security features
- **v0.6.0** - Complete payroll system

---

**Made with ❤️ by the PayrollPro Team**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/payrollpro.svg?style=social&label=Star)](https://github.com/yourusername/payrollpro)
[![GitHub forks](https://img.shields.io/github/forks/yourusername/payrollpro.svg?style=social&label=Fork)](https://github.com/yourusername/payrollpro)
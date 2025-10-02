# 🔌 PayrollPro API Documentation

## 📋 **Overview**

The PayrollPro API provides a comprehensive RESTful interface for managing payroll operations, user authentication, crypto transactions, and system administration.

**Base URL:** `http://localhost:4000/api`

## 🔐 **Authentication**

All API endpoints require authentication via JWT tokens, except for login and 2FA setup.

### **Headers**
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## 🔑 **Authentication Endpoints**

### **POST /auth/login**
Authenticate user and get JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "username": "admin",
    "email": "admin@payrollpro.com",
    "fullName": "System Administrator",
    "role": "ADMIN"
  }
}
```

**2FA Required Response:**
```json
{
  "twoFARequired": true,
  "user": {
    "id": "user_id",
    "username": "admin",
    "email": "admin@payrollpro.com",
    "fullName": "System Administrator",
    "role": "ADMIN"
  }
}
```

### **POST /auth/2fa**
Verify 2FA code or recovery code.

**Request:**
```json
{
  "username": "admin",
  "code": "123456"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "username": "admin",
    "email": "admin@payrollpro.com",
    "fullName": "System Administrator",
    "role": "ADMIN"
  }
}
```

### **POST /auth/2fa/setup**
Setup 2FA for authenticated user.

**Response:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "recoveryCodes": [
    "ABCD-EFGH",
    "IJKL-MNOP",
    "QRST-UVWX"
  ]
}
```

### **POST /auth/2fa/enable**
Enable 2FA with verification code.

**Request:**
```json
{
  "code": "123456"
}
```

### **POST /auth/2fa/disable**
Disable 2FA with verification code.

**Request:**
```json
{
  "code": "123456"
}
```

### **POST /auth/logout**
Logout user and invalidate session.

## 👤 **User Management**

### **GET /user/profile**
Get current user profile.

**Response:**
```json
{
  "user": {
    "id": "user_id",
    "username": "admin",
    "email": "admin@payrollpro.com",
    "fullName": "System Administrator",
    "role": "ADMIN",
    "department": "IT",
    "twoFAEnabled": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### **PUT /user/profile**
Update user profile.

**Request:**
```json
{
  "fullName": "Updated Name",
  "email": "newemail@payrollpro.com",
  "department": "New Department"
}
```

## 👥 **Employee Management**

### **GET /employees**
Get list of employees.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `role` (optional): Filter by role
- `department` (optional): Filter by department

**Response:**
```json
{
  "employees": [
    {
      "id": "user_id",
      "username": "employee",
      "email": "employee@payrollpro.com",
      "fullName": "John Employee",
      "role": "EMPLOYEE",
      "department": "Operations",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

### **GET /employees/:id**
Get specific employee by ID.

### **POST /employees**
Create new employee.

**Request:**
```json
{
  "username": "newemployee",
  "email": "newemployee@payrollpro.com",
  "password": "securepassword",
  "fullName": "New Employee",
  "role": "EMPLOYEE",
  "department": "Operations"
}
```

### **PUT /employees/:id**
Update employee information.

### **DELETE /employees/:id**
Deactivate employee account.

## 💰 **Payroll Management**

### **GET /payroll/records**
Get payroll records.

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `status` (optional): Filter by status
- `periodStart` (optional): Filter by period start date
- `periodEnd` (optional): Filter by period end date

**Response:**
```json
{
  "records": [
    {
      "id": "record_id",
      "userId": "user_id",
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-15",
      "basicSalary": 5000.00,
      "hra": 1500.00,
      "lta": 500.00,
      "medicalAllowance": 300.00,
      "transportAllowance": 200.00,
      "bonus": 1000.00,
      "deductions": 200.00,
      "tax": 800.00,
      "netPay": 7500.00,
      "taxRegion": "US",
      "status": "PAID",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### **POST /payroll/records**
Create new payroll record.

**Request:**
```json
{
  "userId": "user_id",
  "periodStart": "2024-01-01",
  "periodEnd": "2024-01-15",
  "basicSalary": 5000.00,
  "hra": 1500.00,
  "lta": 500.00,
  "medicalAllowance": 300.00,
  "transportAllowance": 200.00,
  "bonus": 1000.00,
  "deductions": 200.00,
  "tax": 800.00,
  "taxRegion": "US"
}
```

### **PUT /payroll/records/:id**
Update payroll record.

### **DELETE /payroll/records/:id**
Delete payroll record.

## 🪙 **Crypto Operations**

### **GET /crypto/exchange-rates**
Get current exchange rates.

**Response:**
```json
{
  "rates": [
    {
      "cryptoType": "BTC",
      "price": 45000.00,
      "change24h": 2.5,
      "volume24h": 28000000000,
      "marketCap": 850000000000,
      "timestamp": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### **GET /crypto/wallets**
Get user's crypto wallets.

**Response:**
```json
{
  "wallets": [
    {
      "id": "wallet_id",
      "cryptoType": "BTC",
      "walletAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### **POST /crypto/wallets**
Create new crypto wallet.

**Request:**
```json
{
  "cryptoType": "BTC",
  "walletAddress": "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
}
```

### **GET /crypto/transactions**
Get crypto transactions.

### **POST /crypto/transactions**
Create crypto transaction.

**Request:**
```json
{
  "cryptoType": "BTC",
  "amount": 0.001,
  "fiatValue": 45.00,
  "txHash": "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
  "gasFee": 0.00001
}
```

## 📊 **Analytics & Reports**

### **GET /analytics/payroll**
Get payroll analytics.

**Query Parameters:**
- `period` (optional): Time period (monthly, yearly)
- `department` (optional): Filter by department

**Response:**
```json
{
  "summary": {
    "totalPayroll": 150000.00,
    "totalEmployees": 50,
    "averageSalary": 3000.00,
    "period": "2024-01"
  },
  "trends": [
    {
      "month": "2024-01",
      "total": 150000.00,
      "employees": 50
    }
  ],
  "byDepartment": [
    {
      "department": "IT",
      "total": 75000.00,
      "employees": 25
    }
  ]
}
```

### **GET /analytics/crypto**
Get crypto analytics.

## 🔍 **Audit & Compliance**

### **GET /audit/logs**
Get audit logs.

**Query Parameters:**
- `userId` (optional): Filter by user ID
- `action` (optional): Filter by action
- `severity` (optional): Filter by severity
- `startDate` (optional): Filter by start date
- `endDate` (optional): Filter by end date

**Response:**
```json
{
  "logs": [
    {
      "id": "log_id",
      "userId": "user_id",
      "action": "LOGIN",
      "description": "User logged in successfully",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "severity": "INFO",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50
}
```

## ⚙️ **System Settings**

### **GET /system/settings**
Get system settings.

**Response:**
```json
{
  "settings": [
    {
      "category": "general",
      "key": "company_name",
      "value": "PayrollPro Inc.",
      "type": "string"
    }
  ]
}
```

### **PUT /system/settings**
Update system settings.

**Request:**
```json
{
  "settings": [
    {
      "category": "general",
      "key": "company_name",
      "value": "New Company Name",
      "type": "string"
    }
  ]
}
```

## 📁 **File Operations**

### **POST /files/upload**
Upload file (CSV, images, documents).

**Request:** Multipart form data
- `file`: File to upload
- `category`: File category (payroll, documents, etc.)

**Response:**
```json
{
  "fileId": "file_id",
  "filename": "payroll_data.csv",
  "size": 1024,
  "mimeType": "text/csv",
  "url": "/files/download/file_id"
}
```

### **GET /files/download/:fileId**
Download file by ID.

## 🚨 **Error Responses**

### **400 Bad Request**
```json
{
  "error": "Invalid request data",
  "details": "Username is required"
}
```

### **401 Unauthorized**
```json
{
  "error": "Access token required"
}
```

### **403 Forbidden**
```json
{
  "error": "Insufficient permissions"
}
```

### **404 Not Found**
```json
{
  "error": "Resource not found"
}
```

### **429 Too Many Requests**
```json
{
  "error": "Too many requests, please try again later"
}
```

### **500 Internal Server Error**
```json
{
  "error": "Internal server error"
}
```

## 📝 **Rate Limits**

- **General API:** 100 requests per 15 minutes per IP
- **Login Endpoints:** 5 requests per 15 minutes per IP
- **File Upload:** 10 requests per hour per user

## 🔒 **Security Notes**

1. **JWT Tokens** expire after 24 hours
2. **2FA Codes** are valid for 2 time windows (60 seconds)
3. **Recovery Codes** are single-use and expire when used
4. **Passwords** must be at least 8 characters
5. **API Keys** should be rotated regularly

## 🧪 **Testing**

Use tools like Postman or curl to test the API:

```bash
# Login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get profile (with token)
curl -X GET http://localhost:4000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 📚 **SDK Examples**

### **JavaScript/Node.js**
```javascript
const apiClient = new APIClient('http://localhost:4000/api');

// Login
const response = await apiClient.login('admin', 'admin123');
const token = response.token;

// Get profile
const profile = await apiClient.getProfile(token);
```

### **Python**
```python
import requests

# Login
response = requests.post('http://localhost:4000/api/auth/login', 
                        json={'username': 'admin', 'password': 'admin123'})
token = response.json()['token']

# Get profile
headers = {'Authorization': f'Bearer {token}'}
profile = requests.get('http://localhost:4000/api/user/profile', headers=headers)
```

---

**For more information, visit the [PayrollPro Documentation](https://github.com/yourusername/payrollpro/wiki)**
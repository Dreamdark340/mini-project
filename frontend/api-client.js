// API Client Library for PayrollPro
class APIClient {
    constructor() {
        this.baseURL = 'http://localhost:4000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Helper method to get headers with authentication
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Generic API call method
    async apiCall(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: this.getHeaders(),
            ...options
        };

        try {
            const response = await fetch(url, config);
            
            if (response.status === 401) {
                // Token expired or invalid
                this.handleUnauthorized();
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`API Error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API Call Error:', error);
            throw error;
        }
    }

    // Handle unauthorized access
    handleUnauthorized() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('username');
        localStorage.removeItem('fullName');
        window.location.href = 'login.html';
    }

    // Authentication methods
    async login(username, password) {
        return await this.apiCall('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
    }

    async verify2FA(username, code, recoveryCode) {
        return await this.apiCall('/auth/2fa', {
            method: 'POST',
            body: JSON.stringify({ username, code, recoveryCode })
        });
    }

    async logout() {
        return await this.apiCall('/auth/logout', {
            method: 'POST'
        });
    }

    // User profile methods
    async getUserProfile() {
        return await this.apiCall('/user/profile');
    }

    async updateUserProfile(profileData) {
        return await this.apiCall('/user/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // 2FA methods
    async setup2FA() {
        return await this.apiCall('/auth/2fa/setup', {
            method: 'POST'
        });
    }

    async enable2FA(code) {
        return await this.apiCall('/auth/2fa/enable', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }

    async disable2FA(code) {
        return await this.apiCall('/auth/2fa/disable', {
            method: 'POST',
            body: JSON.stringify({ code })
        });
    }

    // Payroll methods
    async getPayrollRecords(userId = null) {
        const endpoint = userId ? `/payroll/records/${userId}` : '/payroll/records';
        return await this.apiCall(endpoint);
    }

    async createPayrollRecord(payrollData) {
        return await this.apiCall('/payroll/records', {
            method: 'POST',
            body: JSON.stringify(payrollData)
        });
    }

    async updatePayrollRecord(id, payrollData) {
        return await this.apiCall(`/payroll/records/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payrollData)
        });
    }

    async deletePayrollRecord(id) {
        return await this.apiCall(`/payroll/records/${id}`, {
            method: 'DELETE'
        });
    }

    // Employee management methods
    async getEmployees() {
        return await this.apiCall('/employees');
    }

    async getEmployee(id) {
        return await this.apiCall(`/employees/${id}`);
    }

    async createEmployee(employeeData) {
        return await this.apiCall('/employees', {
            method: 'POST',
            body: JSON.stringify(employeeData)
        });
    }

    async updateEmployee(id, employeeData) {
        return await this.apiCall(`/employees/${id}`, {
            method: 'PUT',
            body: JSON.stringify(employeeData)
        });
    }

    async deleteEmployee(id) {
        return await this.apiCall(`/employees/${id}`, {
            method: 'DELETE'
        });
    }

    // Crypto methods
    async getExchangeRates() {
        return await this.apiCall('/crypto/exchange-rates');
    }

    async getCryptoWallets() {
        return await this.apiCall('/crypto/wallets');
    }

    async createCryptoWallet(walletData) {
        return await this.apiCall('/crypto/wallets', {
            method: 'POST',
            body: JSON.stringify(walletData)
        });
    }

    async getCryptoTransactions() {
        return await this.apiCall('/crypto/transactions');
    }

    async createCryptoTransaction(transactionData) {
        return await this.apiCall('/crypto/transactions', {
            method: 'POST',
            body: JSON.stringify(transactionData)
        });
    }

    // Audit and logging methods
    async getAuditLogs(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const endpoint = queryParams ? `/audit/logs?${queryParams}` : '/audit/logs';
        return await this.apiCall(endpoint);
    }

    async getLoginHistory(userId = null) {
        const endpoint = userId ? `/auth/login-history/${userId}` : '/auth/login-history';
        return await this.apiCall(endpoint);
    }

    // System settings methods
    async getSystemSettings() {
        return await this.apiCall('/system/settings');
    }

    async updateSystemSettings(settings) {
        return await this.apiCall('/system/settings', {
            method: 'PUT',
            body: JSON.stringify(settings)
        });
    }

    // File upload methods
    async uploadFile(file, endpoint) {
        const formData = new FormData();
        formData.append('file', file);

        const headers = {};
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        const response = await fetch(`${this.baseURL}${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: formData
        });

        if (response.status === 401) {
            this.handleUnauthorized();
            return null;
        }

        if (!response.ok) {
            throw new Error(`Upload Error: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    // Real-time data methods
    async subscribeToUpdates(callback) {
        // In a real implementation, this would use WebSockets
        // For now, we'll use polling
        setInterval(async () => {
            try {
                const data = await this.getExchangeRates();
                callback(data);
            } catch (error) {
                console.error('Update subscription error:', error);
            }
        }, 30000); // Update every 30 seconds
    }

    // Error handling
    handleError(error, context = 'API Call') {
        console.error(`${context} Error:`, error);
        
        if (error.message.includes('401')) {
            this.handleUnauthorized();
        } else if (error.message.includes('403')) {
            alert('Access denied. You do not have permission to perform this action.');
        } else if (error.message.includes('404')) {
            alert('Resource not found.');
        } else if (error.message.includes('500')) {
            alert('Server error. Please try again later.');
        } else {
            alert(`Error: ${error.message}`);
        }
    }
}

// Create global API client instance
const apiClient = new APIClient();

// Export for use in other scripts
window.APIClient = APIClient;
window.apiClient = apiClient;
// Navigation Enhancement System
class NavigationEnhancer {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.userRole = localStorage.getItem('userRole');
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.addSecurityLinks();
        this.enhanceVisualAlignment();
        this.addRoleBasedNavigation();
        this.setupClickTracking();
        this.isInitialized = true;
    }

    getCurrentPage() {
        const path = window.location.pathname;
        return path.split('/').pop().replace('.html', '') || 'login';
    }

    addSecurityLinks() {
        // Add Enhanced Security link to all navigation menus
        const navLinks = document.querySelectorAll('.nav-links');
        
        navLinks.forEach(nav => {
            // Check if security link already exists
            const existingSecurity = nav.querySelector('a[href="enhanced-2fa.html"]');
            if (!existingSecurity) {
                const securityLi = document.createElement('li');
                securityLi.innerHTML = `
                    <a href="enhanced-2fa.html">
                        <i class="fas fa-shield-alt"></i>
                        <span>Enhanced Security</span>
                    </a>
                `;
                
                // Insert before the last item (usually logout or last nav item)
                const lastItem = nav.lastElementChild;
                nav.insertBefore(securityLi, lastItem);
            }
        });
    }

    enhanceVisualAlignment() {
        // Add consistent styling and alignment
        const style = document.createElement('style');
        style.textContent = `
            /* Enhanced Navigation Styling */
            .nav-links {
                list-style: none;
                padding: 0;
                margin: 0;
            }
            
            .nav-links li {
                margin: 0;
                border-radius: 8px;
                transition: all 0.2s ease;
            }
            
            .nav-links li:hover {
                background: rgba(59, 130, 246, 0.1);
                transform: translateX(4px);
            }
            
            .nav-links li.active {
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            }
            
            .nav-links li.active a {
                color: white;
                font-weight: 600;
            }
            
            .nav-links a {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                text-decoration: none;
                color: var(--text, #374151);
                font-weight: 500;
                transition: all 0.2s ease;
                border-radius: 8px;
            }
            
            .nav-links a i {
                width: 20px;
                text-align: center;
                font-size: 1.1rem;
            }
            
            .nav-links a span {
                flex: 1;
            }
            
            /* Role-based styling */
            .employee-theme .nav-links li.active {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            }
            
            .hr-theme .nav-links li.active {
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
            }
            
            .admin-theme .nav-links li.active {
                background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            }
            
            /* Security badge styling */
            .security-badge {
                position: relative;
            }
            
            .security-badge::after {
                content: '🔒';
                position: absolute;
                top: -5px;
                right: -5px;
                font-size: 0.7rem;
                opacity: 0.8;
            }
            
            /* Enhanced button styling */
            .primary-btn, .secondary-btn, .danger {
                border-radius: 8px;
                font-weight: 600;
                transition: all 0.2s ease;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            
            .primary-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
            }
            
            .secondary-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(107, 114, 128, 0.3);
            }
            
            .danger:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
            }
            
            /* Loading states */
            .btn-loading {
                position: relative;
                color: transparent;
            }
            
            .btn-loading::after {
                content: '';
                position: absolute;
                width: 16px;
                height: 16px;
                top: 50%;
                left: 50%;
                margin-left: -8px;
                margin-top: -8px;
                border: 2px solid transparent;
                border-top-color: currentColor;
                border-radius: 50%;
                animation: spin 1s linear infinite;
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            /* Enhanced form styling */
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                margin-bottom: 6px;
                font-weight: 600;
                color: var(--text, #374151);
            }
            
            .form-group input,
            .form-group select,
            .form-group textarea {
                width: 100%;
                padding: 12px 16px;
                border: 2px solid #e5e7eb;
                border-radius: 8px;
                font-size: 1rem;
                transition: all 0.2s ease;
                background: white;
            }
            
            .form-group input:focus,
            .form-group select:focus,
            .form-group textarea:focus {
                outline: none;
                border-color: #3b82f6;
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            /* Status badges */
            .status-badge {
                display: inline-flex;
                align-items: center;
                gap: 4px;
                padding: 4px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            .status-badge.success {
                background: #dcfce7;
                color: #166534;
            }
            
            .status-badge.warning {
                background: #fef3c7;
                color: #92400e;
            }
            
            .status-badge.danger {
                background: #fecaca;
                color: #991b1b;
            }
            
            .status-badge.info {
                background: #dbeafe;
                color: #1e40af;
            }
            
            /* Responsive improvements */
            @media (max-width: 768px) {
                .nav-links a {
                    padding: 10px 12px;
                    font-size: 0.9rem;
                }
                
                .nav-links a i {
                    width: 18px;
                    font-size: 1rem;
                }
            }
        `;
        
        document.head.appendChild(style);
    }

    addRoleBasedNavigation() {
        // Add role-specific navigation items
        const roleNavigation = {
            employee: [
                { href: 'employee-dashboard.html', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
                { href: 'employee-profile.html', icon: 'fas fa-user-cog', text: 'Profile' },
                { href: 'time-tracking.html', icon: 'fas fa-clock', text: 'Time Tracking' },
                { href: 'employee-reports.html', icon: 'fas fa-file-alt', text: 'Reports' },
                { href: 'leave-management.html', icon: 'fas fa-calendar-alt', text: 'Leave' },
                { href: 'achievements.html', icon: 'fas fa-trophy', text: 'Achievements' }
            ],
            hr: [
                { href: 'hr-dashboard.html', icon: 'fas fa-users-cog', text: 'HR Dashboard' },
                { href: 'employee-directory.html', icon: 'fas fa-users', text: 'Directory' },
                { href: 'performance-reviews.html', icon: 'fas fa-chart-line', text: 'Performance' },
                { href: 'audit-compliance.html', icon: 'fas fa-shield-alt', text: 'Audit' },
                { href: 'payroll-calendar.html', icon: 'fas fa-calendar-alt', text: 'Payroll Calendar' },
                { href: 'tax-calculator.html', icon: 'fas fa-calculator', text: 'Tax Calculator' },
                { href: 'salary-components.html', icon: 'fas fa-coins', text: 'Salary Components' },
                { href: 'bank-transfers.html', icon: 'fas fa-university', text: 'Bank Transfers' },
                { href: 'payroll-analytics.html', icon: 'fas fa-chart-bar', text: 'Analytics' },
                { href: 'bulk-payroll-import.html', icon: 'fas fa-upload', text: 'Bulk Import' },
                { href: 'payroll-sandbox.html', icon: 'fas fa-flask', text: 'Sandbox' },
                { href: 'crypto-payroll.html', icon: 'fas fa-coins', text: 'Crypto Payroll' }
            ],
            admin: [
                { href: 'hr-dashboard.html', icon: 'fas fa-users-cog', text: 'Admin Dashboard' },
                { href: 'employee-directory.html', icon: 'fas fa-users', text: 'User Management' },
                { href: 'audit-compliance.html', icon: 'fas fa-clipboard-check', text: 'Audit Logs' },
                { href: 'system-settings.html', icon: 'fas fa-cogs', text: 'System Settings' },
                { href: 'crypto-payroll.html', icon: 'fas fa-coins', text: 'Crypto Operations' },
                { href: 'enhanced-2fa.html', icon: 'fas fa-shield-alt', text: 'Security Center' }
            ]
        };

        // Apply role-based navigation if user is logged in
        if (this.userRole && roleNavigation[this.userRole]) {
            const nav = document.querySelector('.nav-links');
            if (nav && !nav.dataset.roleApplied) {
                this.applyRoleNavigation(nav, roleNavigation[this.userRole]);
                nav.dataset.roleApplied = 'true';
            }
        }
    }

    applyRoleNavigation(navElement, roleItems) {
        // Clear existing navigation items (except logout)
        const logoutItem = navElement.querySelector('a[onclick*="logout"]')?.parentElement;
        navElement.innerHTML = '';
        
        // Add role-specific items
        roleItems.forEach(item => {
            const li = document.createElement('li');
            const isActive = this.currentPage === item.href.replace('.html', '');
            
            li.className = isActive ? 'active' : '';
            li.innerHTML = `
                <a href="${item.href}">
                    <i class="${item.icon}"></i>
                    <span>${item.text}</span>
                </a>
            `;
            
            navElement.appendChild(li);
        });
        
        // Add Enhanced Security link
        const securityLi = document.createElement('li');
        securityLi.innerHTML = `
            <a href="enhanced-2fa.html">
                <i class="fas fa-shield-alt"></i>
                <span>Enhanced Security</span>
            </a>
        `;
        navElement.appendChild(securityLi);
        
        // Re-add logout if it existed
        if (logoutItem) {
            navElement.appendChild(logoutItem);
        }
    }

    setupClickTracking() {
        // Track navigation clicks for analytics
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a[href$=".html"]');
            if (link) {
                this.trackNavigation(link.href);
            }
        });
    }

    trackNavigation(url) {
        const username = localStorage.getItem('username');
        if (!username) return;
        
        const navigationLog = JSON.parse(localStorage.getItem(`navigationLog_${username}`) || '[]');
        navigationLog.push({
            url: url,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        });
        
        // Keep only last 100 navigation events
        localStorage.setItem(`navigationLog_${username}`, JSON.stringify(navigationLog.slice(-100)));
    }

    // Method to refresh navigation when role changes
    refreshNavigation() {
        this.userRole = localStorage.getItem('userRole');
        this.isInitialized = false;
        this.init();
    }
}

// Initialize navigation enhancer
const navEnhancer = new NavigationEnhancer();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => navEnhancer.init());
} else {
    navEnhancer.init();
}

// Export for global access
window.navEnhancer = navEnhancer;
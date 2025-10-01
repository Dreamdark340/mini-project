// Zen & Nova Demo Walkthrough System
class DemoWalkthrough {
    constructor() {
        this.currentStep = 0;
        this.steps = [];
        this.isActive = false;
        this.overlay = null;
        this.tooltip = null;
        this.zen = null;
        this.nova = null;
    }

    init() {
        this.createOverlay();
        this.createCharacters();
        this.defineSteps();
        this.setupEventListeners();
    }

    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'demo-overlay';
        this.overlay.innerHTML = `
            <div class="demo-tooltip" id="demoTooltip">
                <div class="tooltip-header">
                    <div class="character-avatar">
                        <div class="character-icon" id="characterIcon">🧙‍♂️</div>
                        <div class="character-name" id="characterName">Zen</div>
                    </div>
                    <button class="close-walkthrough" onclick="demoWalkthrough.skip()">×</button>
                </div>
                <div class="tooltip-content">
                    <h3 id="tooltipTitle">Welcome to PayrollPro!</h3>
                    <p id="tooltipMessage">Let's explore this powerful payroll management system together.</p>
                </div>
                <div class="tooltip-actions">
                    <button class="secondary-btn" onclick="demoWalkthrough.previous()" id="prevBtn" style="display: none;">Previous</button>
                    <button class="primary-btn" onclick="demoWalkthrough.next()" id="nextBtn">Next</button>
                    <button class="secondary-btn" onclick="demoWalkthrough.skip()" id="skipBtn">Skip Tour</button>
                </div>
                <div class="tooltip-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progressFill"></div>
                    </div>
                    <span class="progress-text" id="progressText">Step 1 of 8</span>
                </div>
            </div>
        `;
        document.body.appendChild(this.overlay);
        this.tooltip = this.overlay.querySelector('#demoTooltip');
    }

    createCharacters() {
        this.zen = {
            name: 'Zen',
            icon: '🧙‍♂️',
            personality: 'wise and analytical',
            role: 'Payroll Expert'
        };
        
        this.nova = {
            name: 'Nova',
            icon: '🚀',
            personality: 'energetic and innovative',
            role: 'Crypto Specialist'
        };
    }

    defineSteps() {
        this.steps = [
            {
                target: '.header h1',
                title: 'Welcome to PayrollPro!',
                message: 'Hi! I\'m Zen, your payroll guide. This is our comprehensive payroll management system. Let me show you around!',
                character: this.zen,
                action: () => this.highlightElement('.header h1')
            },
            {
                target: '.sidebar',
                title: 'Navigation Hub',
                message: 'Here\'s your main navigation. Each module is designed for specific payroll functions - from time tracking to analytics.',
                character: this.zen,
                action: () => this.highlightElement('.sidebar')
            },
            {
                target: '.user-info',
                title: 'Role-Based Access',
                message: 'Notice the role badge? The system adapts based on your role - Employee, HR, or Admin. Each has different permissions.',
                character: this.zen,
                action: () => this.highlightElement('.user-info')
            },
            {
                target: '[href="payroll-calendar.html"]',
                title: 'Payroll Calendar',
                message: 'This is where the magic happens! Manage payroll cycles, cutoff dates, and processing schedules.',
                character: this.zen,
                action: () => this.highlightElement('[href="payroll-calendar.html"]')
            },
            {
                target: '[href="tax-calculator.html"]',
                title: 'Tax Calculation Engine',
                message: 'Our multi-region tax calculator handles complex tax scenarios with real-time calculations.',
                character: this.zen,
                action: () => this.highlightElement('[href="tax-calculator.html"]')
            },
            {
                target: '[href="crypto-payroll.html"]',
                title: 'Crypto Payroll Integration',
                message: 'Hi! I\'m Nova, the crypto specialist! This is our revolutionary crypto payroll feature - pay employees in Bitcoin, Ethereum, or stablecoins!',
                character: this.nova,
                action: () => this.highlightElement('[href="crypto-payroll.html"]')
            },
            {
                target: '[href="payroll-analytics.html"]',
                title: 'Analytics Dashboard',
                message: 'Get strategic insights with our analytics dashboard. Track trends, optimize costs, and make data-driven decisions.',
                character: this.zen,
                action: () => this.highlightElement('[href="payroll-analytics.html"]')
            },
            {
                target: '[href="achievements.html"]',
                title: 'Achievement System',
                message: 'Finally, our gamification system! Earn XP, unlock achievements, and compete on leaderboards. Learning should be fun!',
                character: this.zen,
                action: () => this.highlightElement('[href="achievements.html"]'),
                isLast: true
            }
        ];
    }

    start() {
        this.isActive = true;
        this.currentStep = 0;
        this.overlay.style.display = 'block';
        this.showStep(0);
        this.awardXP('Demo Start', 50);
    }

    showStep(stepIndex) {
        if (stepIndex >= this.steps.length) {
            this.complete();
            return;
        }

        const step = this.steps[stepIndex];
        const targetElement = document.querySelector(step.target);
        
        if (!targetElement) {
            console.warn('Target element not found:', step.target);
            this.next();
            return;
        }

        // Update character
        document.getElementById('characterIcon').textContent = step.character.icon;
        document.getElementById('characterName').textContent = step.character.name;
        
        // Update content
        document.getElementById('tooltipTitle').textContent = step.title;
        document.getElementById('tooltipMessage').textContent = step.message;
        
        // Update progress
        const progress = ((stepIndex + 1) / this.steps.length) * 100;
        document.getElementById('progressFill').style.width = `${progress}%`;
        document.getElementById('progressText').textContent = `Step ${stepIndex + 1} of ${this.steps.length}`;
        
        // Update buttons
        document.getElementById('prevBtn').style.display = stepIndex === 0 ? 'none' : 'inline-flex';
        document.getElementById('nextBtn').textContent = step.isLast ? 'Complete Tour' : 'Next';
        
        // Position tooltip
        this.positionTooltip(targetElement);
        
        // Execute step action
        if (step.action) {
            step.action();
        }
    }

    positionTooltip(targetElement) {
        const rect = targetElement.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
        
        // Adjust if tooltip goes off screen
        if (left < 10) left = 10;
        if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }
        if (top + tooltipRect.height > window.innerHeight - 10) {
            top = rect.top - tooltipRect.height - 10;
        }
        
        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    highlightElement(selector) {
        // Remove existing highlights
        document.querySelectorAll('.demo-highlight').forEach(el => {
            el.classList.remove('demo-highlight');
        });
        
        // Add highlight to target
        const element = document.querySelector(selector);
        if (element) {
            element.classList.add('demo-highlight');
        }
    }

    next() {
        this.currentStep++;
        this.showStep(this.currentStep);
    }

    previous() {
        if (this.currentStep > 0) {
            this.currentStep--;
            this.showStep(this.currentStep);
        }
    }

    skip() {
        this.complete();
    }

    complete() {
        this.isActive = false;
        this.overlay.style.display = 'none';
        
        // Remove highlights
        document.querySelectorAll('.demo-highlight').forEach(el => {
            el.classList.remove('demo-highlight');
        });
        
        // Award completion achievement
        this.awardAchievement('System Explorer', 'Completed the full system walkthrough!', 200);
        
        // Show completion notification
        this.showCompletionNotification();
    }

    awardXP(action, amount) {
        const username = localStorage.getItem('username');
        if (!username) return;
        
        // Track XP for demo participation
        const xpLog = JSON.parse(localStorage.getItem(`xpLog_${username}`) || '[]');
        xpLog.push({
            action: action,
            amount: amount,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem(`xpLog_${username}`, JSON.stringify(xpLog));
    }

    awardAchievement(id, title, xpReward) {
        const username = localStorage.getItem('username');
        if (!username) return;
        
        const achievements = JSON.parse(localStorage.getItem(`achievements_${username}`) || '[]');
        if (!achievements.includes(id)) {
            achievements.push(id);
            localStorage.setItem(`achievements_${username}`, JSON.stringify(achievements));
            
            this.showAchievementNotification(id, title, xpReward);
        }
    }

    showAchievementNotification(id, title, xpReward) {
        const notification = document.createElement('div');
        notification.className = 'achievement-notification demo-achievement';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-trophy"></i>
                </div>
                <div class="notification-text">
                    <h4>Achievement Unlocked!</h4>
                    <p>${title}</p>
                    <span class="xp-reward">+${xpReward} XP</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    showCompletionNotification() {
        const notification = document.createElement('div');
        notification.className = 'completion-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="notification-text">
                    <h4>Tour Complete!</h4>
                    <p>You've successfully explored the PayrollPro system. Ready to manage payroll like a pro!</p>
                    <span class="xp-reward">+200 XP</span>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.classList.add('show'), 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 7000);
    }

    setupEventListeners() {
        // Add demo start button to login page
        const loginPage = document.querySelector('body');
        if (loginPage && window.location.pathname.includes('login.html')) {
            const demoButton = document.createElement('button');
            demoButton.className = 'demo-start-btn';
            demoButton.innerHTML = '<i class="fas fa-play"></i> Take Demo Tour';
            demoButton.onclick = () => this.start();
            demoButton.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: linear-gradient(45deg, #8b5cf6, #3b82f6);
                color: white;
                border: none;
                border-radius: 50px;
                padding: 15px 20px;
                font-size: 0.9rem;
                font-weight: 600;
                cursor: pointer;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
                z-index: 1000;
                transition: transform 0.2s ease;
            `;
            
            demoButton.addEventListener('mouseenter', () => {
                demoButton.style.transform = 'translateY(-2px)';
            });
            
            demoButton.addEventListener('mouseleave', () => {
                demoButton.style.transform = 'translateY(0)';
            });
            
            document.body.appendChild(demoButton);
        }
    }
}

// Initialize demo walkthrough
const demoWalkthrough = new DemoWalkthrough();

// Add demo styles
const demoStyles = document.createElement('style');
demoStyles.textContent = `
    .demo-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 10000;
        display: none;
    }
    
    .demo-tooltip {
        position: absolute;
        background: white;
        border-radius: 12px;
        padding: 20px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        max-width: 400px;
        z-index: 10001;
    }
    
    .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 15px;
    }
    
    .character-avatar {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .character-icon {
        font-size: 2rem;
    }
    
    .character-name {
        font-weight: 600;
        color: var(--primary);
    }
    
    .close-walkthrough {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--muted);
    }
    
    .tooltip-content h3 {
        margin: 0 0 10px;
        color: var(--text);
    }
    
    .tooltip-content p {
        margin: 0 0 20px;
        color: var(--muted);
        line-height: 1.5;
    }
    
    .tooltip-actions {
        display: flex;
        gap: 10px;
        margin-bottom: 15px;
    }
    
    .tooltip-progress {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    
    .progress-bar {
        flex: 1;
        height: 4px;
        background: #e5e7eb;
        border-radius: 2px;
        overflow: hidden;
    }
    
    .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #8b5cf6, #3b82f6);
        transition: width 0.3s ease;
    }
    
    .progress-text {
        font-size: 0.8rem;
        color: var(--muted);
        font-weight: 600;
    }
    
    .demo-highlight {
        position: relative;
        z-index: 9999;
        box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.3) !important;
        border-radius: 8px;
        transition: box-shadow 0.3s ease;
    }
    
    .demo-achievement {
        border-color: #8b5cf6;
        background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
    }
    
    .completion-notification {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border: 2px solid #10b981;
        border-radius: 16px;
        padding: 30px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .completion-notification.show {
        opacity: 1;
    }
    
    .completion-notification .notification-content {
        display: flex;
        align-items: center;
        gap: 20px;
    }
    
    .completion-notification .notification-icon {
        width: 60px;
        height: 60px;
        background: #10b981;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 1.5rem;
    }
    
    .completion-notification .notification-text h4 {
        margin: 0 0 5px;
        color: var(--text);
        font-size: 1.2rem;
    }
    
    .completion-notification .notification-text p {
        margin: 0 0 10px;
        color: var(--muted);
    }
    
    @media (max-width: 768px) {
        .demo-tooltip {
            max-width: 300px;
            padding: 15px;
        }
        
        .tooltip-actions {
            flex-direction: column;
        }
    }
`;

document.head.appendChild(demoStyles);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => demoWalkthrough.init());
} else {
    demoWalkthrough.init();
}
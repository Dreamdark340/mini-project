// Demo Data Initialization Script
// This script initializes sample data for the leave and attendance management system

function initializeDemoData() {
    console.log('Initializing demo data for Leave & Attendance Management...');
    
    // Initialize leave balances for demo users
    const demoUsers = ['aaron', 'hr1', 'admin', 'crypto1'];
    
    demoUsers.forEach(username => {
        const leaveBalance = {
            sick: 12,
            vacation: 21,
            personal: 5,
            emergency: 3,
            maternity: 90,
            paternity: 15
        };
        localStorage.setItem(`leaveBalance_${username}`, JSON.stringify(leaveBalance));
    });
    
    // Initialize sample leave requests
    const sampleLeaveRequests = [
        {
            id: 'req_001',
            username: 'aaron',
            fullName: 'Aaron Johnson',
            type: 'vacation',
            startDate: '2025-01-15',
            endDate: '2025-01-17',
            days: 3,
            reason: 'Family vacation',
            status: 'pending',
            requestedAt: '2025-01-10T10:00:00Z'
        },
        {
            id: 'req_002',
            username: 'aaron',
            fullName: 'Aaron Johnson',
            type: 'sick',
            startDate: '2025-01-05',
            endDate: '2025-01-05',
            days: 1,
            reason: 'Flu symptoms',
            status: 'approved',
            requestedAt: '2025-01-04T14:30:00Z',
            approvedAt: '2025-01-04T16:00:00Z',
            approvedBy: 'hr1'
        },
        {
            id: 'req_003',
            username: 'crypto1',
            fullName: 'Crypto Trader',
            type: 'personal',
            startDate: '2025-01-20',
            endDate: '2025-01-22',
            days: 3,
            reason: 'Personal matters',
            status: 'pending',
            requestedAt: '2025-01-12T09:15:00Z'
        }
    ];
    
    localStorage.setItem('leaveData', JSON.stringify(sampleLeaveRequests));
    
    // Initialize sample attendance data
    const sampleAttendanceData = [];
    const currentDate = new Date();
    
    // Generate attendance data for the last 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(currentDate);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        demoUsers.forEach(username => {
            // Random attendance status (90% present, 5% late, 5% absent)
            const rand = Math.random();
            let status, checkIn, checkOut;
            
            if (rand < 0.9) {
                status = 'present';
                checkIn = '09:00';
                checkOut = '17:30';
            } else if (rand < 0.95) {
                status = 'late';
                checkIn = '09:30';
                checkOut = '17:30';
            } else {
                status = 'absent';
                checkIn = null;
                checkOut = null;
            }
            
            sampleAttendanceData.push({
                id: `att_${username}_${dateStr}`,
                username: username,
                fullName: username === 'aaron' ? 'Aaron Johnson' : 
                         username === 'hr1' ? 'Sarah Wilson' :
                         username === 'admin' ? 'Admin User' : 'Crypto Trader',
                date: dateStr,
                checkIn: checkIn,
                checkOut: checkOut,
                status: status
            });
        });
    }
    
    localStorage.setItem('attendanceData', JSON.stringify(sampleAttendanceData));
    
    // Initialize employee data
    const employeeData = [
        {
            id: 'emp_001',
            username: 'aaron',
            fullName: 'Aaron Johnson',
            email: 'aaron@company.com',
            department: 'Engineering',
            role: 'employee',
            position: 'Software Developer',
            hireDate: '2023-01-15',
            salary: 75000
        },
        {
            id: 'emp_002',
            username: 'hr1',
            fullName: 'Sarah Wilson',
            email: 'sarah@company.com',
            department: 'Human Resources',
            role: 'hr',
            position: 'HR Manager',
            hireDate: '2022-06-01',
            salary: 85000
        },
        {
            id: 'emp_003',
            username: 'admin',
            fullName: 'Admin User',
            email: 'admin@company.com',
            department: 'Administration',
            role: 'admin',
            position: 'System Administrator',
            hireDate: '2021-03-10',
            salary: 95000
        },
        {
            id: 'emp_004',
            username: 'crypto1',
            fullName: 'Crypto Trader',
            email: 'crypto@company.com',
            department: 'Finance',
            role: 'crypto-trader',
            position: 'Crypto Analyst',
            hireDate: '2023-08-20',
            salary: 80000
        }
    ];
    
    localStorage.setItem('employeeData', JSON.stringify(employeeData));
    
    // Initialize sample attendance correction requests
    const sampleCorrectionRequests = [
        {
            id: 'corr_001',
            username: 'aaron',
            fullName: 'Aaron Johnson',
            date: '2025-01-08',
            currentStatus: 'absent',
            requestedStatus: 'present',
            requestedTime: '09:15',
            reason: 'I was present but forgot to mark attendance. I have witness from my colleague.',
            status: 'pending',
            requestedAt: '2025-01-09T10:30:00Z'
        },
        {
            id: 'corr_002',
            username: 'crypto1',
            fullName: 'Crypto Trader',
            date: '2025-01-10',
            currentStatus: 'late',
            requestedStatus: 'present',
            requestedTime: '08:45',
            reason: 'I arrived on time but the system marked me as late due to technical issue.',
            status: 'approved',
            requestedAt: '2025-01-10T14:20:00Z',
            reviewedAt: '2025-01-10T16:00:00Z',
            reviewedBy: 'hr1'
        }
    ];
    
    localStorage.setItem('correctionRequests', JSON.stringify(sampleCorrectionRequests));
    
    console.log('Demo data initialized successfully!');
    console.log('- Leave balances set for all demo users');
    console.log('- Sample leave requests created');
    console.log('- 30 days of attendance data generated');
    console.log('- Employee data initialized');
    console.log('- Sample attendance correction requests created');
}

// Auto-initialize when script loads
if (typeof window !== 'undefined') {
    // Only initialize if no data exists
    if (!localStorage.getItem('leaveData') || JSON.parse(localStorage.getItem('leaveData')).length === 0) {
        initializeDemoData();
    }
}
document.addEventListener('DOMContentLoaded', () => {
    // Initialize admin panel
    initializeAdminPanel();
    
    // Setup event listeners
    setupEventListeners();
    
    // Start real-time updates
    startRealTimeUpdates();
});

function initializeAdminPanel() {
    // Check admin authentication
    checkAdminAuth();
    
    // Load initial dashboard data
    loadDashboardData();
    
    // Initialize charts and graphs
    initializeCharts();
}

function checkAdminAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token) {
        window.location.href = '/admin/login.html';
        return;
    }

    // Verify token
    fetch('/api/admin/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid admin token');
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        window.location.href = '/admin/login.html';
    });
}

async function loadDashboardData() {
    try {
        const response = await fetch('/api/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        const data = await response.json();
        updateDashboard(data);
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showErrorMessage('Failed to load dashboard data');
    }
}

function updateDashboard(data) {
    // Update statistics
    updateStatistics(data.stats);
    
    // Update recent activity
    updateRecentActivity(data.activity);
    
    // Update system status
    updateSystemStatus(data.system);
    
    // Update pending actions
    updatePendingActions(data.pending);
}

function updateStatistics(stats) {
    const statsContainer = document.querySelector('.stats-grid');
    if (!statsContainer) return;

    const statItems = statsContainer.querySelectorAll('.stat-item');
    statItems.forEach(item => {
        const label = item.querySelector('.stat-label').textContent.toLowerCase();
        const valueElement = item.querySelector('.stat-value');
        
        if (stats[label]) {
            valueElement.textContent = formatNumber(stats[label]);
            
            // Add trend indicator if available
            if (stats[`${label}_trend`]) {
                const trend = document.createElement('span');
                trend.className = `trend ${stats[`${label}_trend`] > 0 ? 'up' : 'down'}`;
                trend.textContent = `${Math.abs(stats[`${label}_trend`])}%`;
                valueElement.appendChild(trend);
            }
        }
    });
}

function updateRecentActivity(activity) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    activityList.innerHTML = activity.map(item => `
        <li class="activity-item">
            <span class="activity-type ${item.type}">${item.type}</span>
            <span class="activity-content">${item.content}</span>
            <span class="activity-time">${formatTimeAgo(item.timestamp)}</span>
        </li>
    `).join('');
}

function updateSystemStatus(system) {
    const statusItems = document.querySelectorAll('.status-item');
    statusItems.forEach(item => {
        const label = item.querySelector('.status-label').textContent.toLowerCase().replace(' ', '_');
        const progressBar = item.querySelector('.progress');
        const valueElement = item.querySelector('.status-value');
        
        if (system[label]) {
            const value = system[label];
            progressBar.style.width = `${value}%`;
            valueElement.textContent = `${value}%`;
            
            // Update color based on threshold
            if (value > 90) {
                progressBar.style.backgroundColor = 'var(--admin-danger)';
            } else if (value > 70) {
                progressBar.style.backgroundColor = 'var(--admin-warning)';
            }
        }
    });
}

function updatePendingActions(pending) {
    const actionList = document.querySelector('.action-list');
    if (!actionList) return;

    actionList.innerHTML = pending.map(action => `
        <div class="action-item">
            <span class="action-priority ${action.priority}">${action.priority}</span>
            <span class="action-content">${action.content}</span>
            <button class="review-btn" onclick="handleAction('${action.id}', '${action.type}')">${action.actionText || 'Review'}</button>
        </div>
    `).join('');
}

function startRealTimeUpdates() {
    // Connect to WebSocket for real-time updates
    const ws = new WebSocket('wss://your-domain.com/ws/admin');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'stats_update':
                updateStatistics(data.stats);
                break;
            case 'new_activity':
                prependActivity(data.activity);
                break;
            case 'system_update':
                updateSystemStatus(data.system);
                break;
            case 'new_pending_action':
                prependPendingAction(data.action);
                break;
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        showErrorMessage('Real-time updates disconnected');
    };
}

function setupEventListeners() {
    // Quick action buttons
    document.querySelectorAll('.action-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const action = e.target.textContent.toLowerCase().replace(' ', '_');
            handleQuickAction(action);
        });
    });

    // Navigation
    document.querySelectorAll('.admin-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = e.target.getAttribute('href').substring(1);
            loadSection(section);
        });
    });

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleLogout();
        });
    }
}

async function handleQuickAction(action) {
    try {
        const response = await fetch(`/api/admin/actions/${action}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            showSuccessMessage(data.message);
            
            // Refresh relevant section
            switch (action) {
                case 'new_release':
                    showReleaseModal();
                    break;
                case 'moderate_forum':
                    loadSection('forum-management');
                    break;
                case 'system_status':
                    loadSection('system');
                    break;
            }
        } else {
            throw new Error('Action failed');
        }
    } catch (error) {
        console.error('Error handling action:', error);
        showErrorMessage('Failed to perform action');
    }
}

async function loadSection(section) {
    try {
        const response = await fetch(`/api/admin/sections/${section}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        const data = await response.json();
        
        // Update content area
        const mainContent = document.querySelector('.admin-main');
        mainContent.innerHTML = data.content;
        
        // Update navigation
        document.querySelectorAll('.admin-nav a').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === `#${section}`) {
                link.classList.add('active');
            }
        });
        
        // Initialize section-specific features
        if (data.initScript) {
            eval(data.initScript);
        }
    } catch (error) {
        console.error('Error loading section:', error);
        showErrorMessage('Failed to load section');
    }
}

function handleLogout() {
    localStorage.removeItem('admin_token');
    window.location.href = '/admin/login.html';
}

// Utility functions
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatTimeAgo(timestamp) {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' years ago';
    
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' months ago';
    
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' days ago';
    
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' hours ago';
    
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutes ago';
    
    return Math.floor(seconds) + ' seconds ago';
}

function showErrorMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast error';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showSuccessMessage(message) {
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Initialize charts using Chart.js
function initializeCharts() {
    // User Growth Chart
    const userGrowthCtx = document.getElementById('userGrowthChart');
    if (userGrowthCtx) {
        new Chart(userGrowthCtx, {
            type: 'line',
            data: {
                labels: [], // Will be populated with dates
                datasets: [{
                    label: 'New Users',
                    data: [], // Will be populated with user counts
                    borderColor: 'var(--admin-secondary)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    // Download Statistics Chart
    const downloadStatsCtx = document.getElementById('downloadStatsChart');
    if (downloadStatsCtx) {
        new Chart(downloadStatsCtx, {
            type: 'bar',
            data: {
                labels: ['Android', 'Desktop'],
                datasets: [{
                    label: 'Downloads',
                    data: [], // Will be populated with download counts
                    backgroundColor: [
                        'var(--admin-success)',
                        'var(--admin-secondary)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}
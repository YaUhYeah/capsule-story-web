document.addEventListener('DOMContentLoaded', () => {
    // Initialize profile
    initializeProfile();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadProfileData();
});

function initializeProfile() {
    // Check authentication
    checkAuth();
    
    // Initialize navigation
    initializeNavigation();
}

function checkAuth() {
    const token = localStorage.getItem('user_token');
    if (!token) {
        window.location.href = '/login.html';
        return;
    }

    // Verify token
    fetch('/api/auth/verify', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Invalid token');
        }
    })
    .catch(error => {
        console.error('Auth error:', error);
        window.location.href = '/login.html';
    });
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.profile-nav a').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Avatar change
    const changeAvatarBtn = document.querySelector('.change-avatar-btn');
    if (changeAvatarBtn) {
        changeAvatarBtn.addEventListener('click', handleAvatarChange);
    }

    // Settings form
    const settingsForm = document.getElementById('profileSettingsForm');
    if (settingsForm) {
        settingsForm.addEventListener('submit', handleSettingsSubmit);
    }

    // Logout
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function loadProfileData() {
    try {
        const response = await fetch('/api/profile', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('user_token')}`
            }
        });
        
        const data = await response.json();
        updateProfile(data);
    } catch (error) {
        console.error('Error loading profile data:', error);
        showErrorMessage('Failed to load profile data');
    }
}

function updateProfile(data) {
    // Update basic info
    document.getElementById('username').textContent = data.username;
    document.getElementById('userRank').textContent = data.rank;
    document.getElementById('joinDate').textContent = formatDate(data.joinDate);
    document.getElementById('userAvatar').src = data.avatar || '../images/default-avatar.png';

    // Update statistics
    document.getElementById('forumPosts').textContent = data.stats.forumPosts;
    document.getElementById('wikiEdits').textContent = data.stats.wikiEdits;
    document.getElementById('reputation').textContent = data.stats.reputation;

    // Update game statistics
    document.getElementById('playTime').textContent = formatPlayTime(data.gameStats.playTime);
    document.getElementById('monstersTamed').textContent = data.gameStats.monstersTamed;
    document.getElementById('itemsCrafted').textContent = data.gameStats.itemsCrafted;
    document.getElementById('structuresBuilt').textContent = data.gameStats.structuresBuilt;

    // Update recent activity
    updateRecentActivity(data.recentActivity);

    // Update achievements
    updateAchievements(data.achievements);

    // Update game progress
    updateGameProgress(data.gameProgress);

    // Update inventory
    updateInventory(data.inventory);

    // Update settings form
    updateSettingsForm(data.settings);
}

function updateRecentActivity(activities) {
    const activityList = document.querySelector('.activity-list');
    if (!activityList) return;

    activityList.innerHTML = activities.map(activity => `
        <li class="activity-item">
            <div class="activity-icon ${activity.type}"></div>
            <div class="activity-content">
                <p>${activity.description}</p>
                <span class="activity-time">${formatTimeAgo(activity.timestamp)}</span>
            </div>
        </li>
    `).join('');
}

function updateAchievements(achievements) {
    const achievementGrid = document.querySelector('.achievements-grid');
    if (!achievementGrid) return;

    achievementGrid.innerHTML = achievements.map(achievement => `
        <div class="achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}">
            <div class="achievement-icon">
                <img src="${achievement.icon}" alt="${achievement.name}">
            </div>
            <h3>${achievement.name}</h3>
            <p>${achievement.description}</p>
            ${achievement.unlocked ? `
                <span class="unlock-date">Unlocked: ${formatDate(achievement.unlockedAt)}</span>
            ` : ''}
        </div>
    `).join('');
}

function updateGameProgress(progress) {
    // Update monster collection
    const monsterProgress = document.querySelector('.collection-progress .progress');
    const monsterText = document.querySelector('.collection-progress .progress-text');
    if (monsterProgress && monsterText) {
        const percentage = (progress.monstersCollected / progress.totalMonsters) * 100;
        monsterProgress.style.width = `${percentage}%`;
        monsterText.textContent = `${progress.monstersCollected}/${progress.totalMonsters} Monsters`;
    }

    // Update crafting progress
    const craftingProgress = document.querySelector('.crafting-progress .progress');
    const craftingText = document.querySelector('.crafting-progress .progress-text');
    if (craftingProgress && craftingText) {
        const percentage = (progress.recipesLearned / progress.totalRecipes) * 100;
        craftingProgress.style.width = `${percentage}%`;
        craftingText.textContent = `${progress.recipesLearned}/${progress.totalRecipes} Recipes`;
    }

    // Update monster grid
    const monsterGrid = document.querySelector('.monster-grid');
    if (monsterGrid) {
        monsterGrid.innerHTML = progress.monsters.map(monster => `
            <div class="monster-item ${monster.captured ? 'captured' : 'unknown'}">
                <img src="${monster.captured ? monster.icon : '../images/unknown-monster.png'}" 
                     alt="${monster.captured ? monster.name : '???'}">
                <span class="monster-name">${monster.captured ? monster.name : '???'}</span>
            </div>
        `).join('');
    }

    // Update recipe grid
    const recipeGrid = document.querySelector('.recipe-grid');
    if (recipeGrid) {
        recipeGrid.innerHTML = progress.recipes.map(recipe => `
            <div class="recipe-item ${recipe.learned ? 'learned' : 'unknown'}">
                <img src="${recipe.learned ? recipe.icon : '../images/unknown-recipe.png'}" 
                     alt="${recipe.learned ? recipe.name : '???'}">
                <span class="recipe-name">${recipe.learned ? recipe.name : '???'}</span>
            </div>
        `).join('');
    }
}

function updateInventory(inventory) {
    const inventoryGrid = document.querySelector('.inventory-grid');
    if (!inventoryGrid) return;

    inventoryGrid.innerHTML = inventory.map(item => `
        <div class="inventory-item">
            <img src="${item.icon}" alt="${item.name}">
            <span class="item-name">${item.name}</span>
            <span class="item-quantity">x${item.quantity}</span>
            ${item.equipped ? '<span class="equipped-badge">Equipped</span>' : ''}
        </div>
    `).join('');
}

function updateSettingsForm(settings) {
    // Update account information
    document.getElementById('displayName').value = settings.displayName;
    document.getElementById('email').value = settings.email;

    // Update privacy settings
    document.getElementById('showOnline').checked = settings.privacy.showOnline;
    document.getElementById('showProgress').checked = settings.privacy.showProgress;
    document.getElementById('showInventory').checked = settings.privacy.showInventory;

    // Update notification settings
    document.getElementById('emailNotif').checked = settings.notifications.email;
    document.getElementById('forumNotif').checked = settings.notifications.forum;
    document.getElementById('achievementNotif').checked = settings.notifications.achievements;
}

function handleNavigation(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    
    // Update navigation
    document.querySelectorAll('.profile-nav a').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Show target section
    document.querySelectorAll('.profile-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(targetId).classList.add('active');
}

async function handleAvatarChange() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/api/profile/avatar', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('user_token')}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                document.getElementById('userAvatar').src = data.avatarUrl;
                showSuccessMessage('Avatar updated successfully');
            } else {
                throw new Error('Failed to update avatar');
            }
        } catch (error) {
            console.error('Error updating avatar:', error);
            showErrorMessage('Failed to update avatar');
        }
    };

    input.click();
}

async function handleSettingsSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const settings = {
        displayName: formData.get('displayName'),
        email: formData.get('email'),
        privacy: {
            showOnline: formData.get('showOnline') === 'on',
            showProgress: formData.get('showProgress') === 'on',
            showInventory: formData.get('showInventory') === 'on'
        },
        notifications: {
            email: formData.get('emailNotif') === 'on',
            forum: formData.get('forumNotif') === 'on',
            achievements: formData.get('achievementNotif') === 'on'
        }
    };

    try {
        const response = await fetch('/api/profile/settings', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('user_token')}`
            },
            body: JSON.stringify(settings)
        });

        if (response.ok) {
            showSuccessMessage('Settings saved successfully');
        } else {
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('Error saving settings:', error);
        showErrorMessage('Failed to save settings');
    }
}

function handleLogout() {
    localStorage.removeItem('user_token');
    window.location.href = '/login.html';
}

// Utility functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatPlayTime(minutes) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hours`;
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
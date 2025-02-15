document.addEventListener('DOMContentLoaded', () => {
    // New Topic Button
    const newTopicBtn = document.querySelector('.new-topic-btn');
    if (newTopicBtn) {
        newTopicBtn.addEventListener('click', () => {
            if (isUserLoggedIn()) {
                showNewTopicModal();
            } else {
                showLoginPrompt();
            }
        });
    }

    // Search functionality
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleSearch, 300));
    }

    // Initialize forum features
    initializeForumFeatures();
});

function showNewTopicModal() {
    const modal = document.createElement('div');
    modal.className = 'modal new-topic-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Create New Topic</h2>
            <form id="newTopicForm">
                <select name="category" required>
                    <option value="">Select Category</option>
                    <option value="general">General Discussion</option>
                    <option value="help">Help & Support</option>
                    <option value="gameplay">Gameplay Discussion</option>
                    <option value="showcase">Creations Showcase</option>
                </select>
                <input type="text" name="title" placeholder="Topic Title" required>
                <textarea name="content" placeholder="Topic Content" required></textarea>
                <div class="form-actions">
                    <button type="submit">Create Topic</button>
                    <button type="button" onclick="closeModal()">Cancel</button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    const form = modal.querySelector('#newTopicForm');
    form.addEventListener('submit', handleNewTopic);
}

async function handleNewTopic(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);

    try {
        const response = await fetch('/api/forum/topics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('user_token')}`
            },
            body: JSON.stringify(Object.fromEntries(formData))
        });

        if (response.ok) {
            closeModal();
            window.location.reload();
        } else {
            throw new Error('Failed to create topic');
        }
    } catch (error) {
        alert('Failed to create topic. Please try again.');
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function handleSearch(e) {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length < 3) return;

    try {
        const response = await fetch(`/api/forum/search?q=${encodeURIComponent(searchTerm)}`);
        const results = await response.json();
        displaySearchResults(results);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

function displaySearchResults(results) {
    const forumList = document.querySelector('.forum-list');
    if (!results.length) {
        forumList.innerHTML = '<p class="no-results">No results found</p>';
        return;
    }

    const resultsHTML = results.map(result => `
        <div class="forum-item">
            <div class="forum-icon ${result.category.toLowerCase()}"></div>
            <div class="forum-info">
                <h3><a href="/forum/topic/${result.id}">${result.title}</a></h3>
                <p>${result.excerpt}</p>
            </div>
            <div class="forum-stats">
                <span>Replies: ${result.replies}</span>
                <span>Views: ${result.views}</span>
            </div>
        </div>
    `).join('');

    forumList.innerHTML = resultsHTML;
}

function initializeForumFeatures() {
    // Initialize real-time updates for online users
    initializeWebSocket();
    
    // Initialize forum statistics
    updateForumStats();
    
    // Add click handlers for forum items
    addForumItemHandlers();
}

function initializeWebSocket() {
    const ws = new WebSocket('wss://your-domain.com/ws/forum');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'online_users':
                updateOnlineUsers(data.users);
                break;
            case 'new_post':
                handleNewPost(data.post);
                break;
            case 'user_typing':
                showUserTyping(data.user, data.topicId);
                break;
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function updateOnlineUsers(users) {
    const userList = document.querySelector('.user-list');
    if (!userList) return;

    userList.innerHTML = users.map(user => `
        <li class="${user.role}">${user.username}</li>
    `).join('');
}

function handleNewPost(post) {
    // Add new post to the current view if it belongs to the current topic
    const currentTopicId = getCurrentTopicId();
    if (currentTopicId && currentTopicId === post.topicId) {
        appendNewPost(post);
    }
}

function showUserTyping(user, topicId) {
    const currentTopicId = getCurrentTopicId();
    if (currentTopicId && currentTopicId === topicId) {
        const typingIndicator = document.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.textContent = `${user} is typing...`;
            setTimeout(() => {
                typingIndicator.textContent = '';
            }, 3000);
        }
    }
}

async function updateForumStats() {
    try {
        const response = await fetch('/api/forum/stats');
        const stats = await response.json();
        
        const statsElement = document.querySelector('.statistics ul');
        if (statsElement) {
            statsElement.innerHTML = `
                <li>Total Topics: ${stats.totalTopics}</li>
                <li>Total Posts: ${stats.totalPosts}</li>
                <li>Members: ${stats.totalMembers}</li>
                <li>Newest Member: ${stats.newestMember}</li>
            `;
        }
    } catch (error) {
        console.error('Failed to update forum stats:', error);
    }
}

function addForumItemHandlers() {
    const forumItems = document.querySelectorAll('.forum-item');
    forumItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return; // Don't interfere with link clicks
            
            const forumId = item.dataset.forumId;
            if (forumId) {
                window.location.href = `/forum/topics/${forumId}`;
            }
        });
    });
}
document.addEventListener('DOMContentLoaded', () => {
    // Header scroll effect
    const header = document.querySelector('.main-header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll <= 0) {
            header.classList.remove('scroll-up');
            return;
        }
        
        if (currentScroll > lastScroll && !header.classList.contains('scroll-down')) {
            header.classList.remove('scroll-up');
            header.classList.add('scroll-down');
        } else if (currentScroll < lastScroll && header.classList.contains('scroll-down')) {
            header.classList.remove('scroll-down');
            header.classList.add('scroll-up');
        }
        lastScroll = currentScroll;
    });

    // Download buttons functionality
    const downloadButtons = document.querySelectorAll('.download-button');
    downloadButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            if (!isUserLoggedIn()) {
                e.preventDefault();
                showLoginPrompt();
            }
        });
    });

    // Login functionality
    const loginBtn = document.querySelector('.login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showLoginModal();
        });
    }

    // Profile functionality
    const profileBtn = document.querySelector('.profile-btn');
    if (profileBtn) {
        profileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (isUserLoggedIn()) {
                window.location.href = '/profile';
            } else {
                showLoginPrompt();
            }
        });
    }
});

// Auth utilities
function isUserLoggedIn() {
    return !!localStorage.getItem('user_token');
}

function showLoginPrompt() {
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Login Required</h2>
            <p>Please log in to access this feature.</p>
            <button onclick="showLoginModal()">Login</button>
            <button onclick="closeModal()">Cancel</button>
        </div>
    `;
    document.body.appendChild(modal);
}
// Improved login modal implementation
function showLoginModal() {
    // Remove any existing login modal
    closeModal();
  
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h2>Login</h2>
        <form id="loginForm">
          <div class="form-group">
            <input type="text" name="username" placeholder="Username" required />
          </div>
          <div class="form-group">
            <input type="password" name="password" placeholder="Password" required />
          </div>
          <div class="form-actions">
            <button type="submit" class="submit-btn">Login</button>
            <button type="button" class="cancel-btn" onclick="closeModal()">Cancel</button>
          </div>
        </form>
        <p>Don't have an account? <a href="register.html">Register here</a></p>
        <p>Or login with <button id="discordLoginBtn" class="social-btn">Discord</button></p>
      </div>
    `;
    document.body.appendChild(modal);
  
    // Attach event listeners
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', handleLogin);
  
    document.getElementById('discordLoginBtn').addEventListener('click', function () {
      window.location.href = '/api/discord/login';
    });
  }
  
  function closeModal() {
    const existingModal = document.querySelector('.login-modal');
    if (existingModal) {
      existingModal.remove();
    }
  }
  
  async function handleLogin(e) {
    e.preventDefault();
    const form = e.target;
    const username = form.username.value;
    const password = form.password.value;
  
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });
  
      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('user_token', data.access_token);
        closeModal();
        window.location.href = '/profile'; // redirect to profile after login
      } else {
        const errorData = await response.json();
        alert(`Login failed: ${errorData.detail}`);
      }
    } catch (error) {
      alert('Login failed. Please try again.');
    }
  }
  

// Version check and update notification
async function checkForUpdates() {
    try {
        const response = await fetch('/api/version');
        const { android_version, desktop_version } = await response.json();
        
        const androidCard = document.querySelector('.download-card:first-child p');
        const desktopCard = document.querySelector('.download-card:last-child p');
        
        if (androidCard) androidCard.textContent = `Latest version: ${android_version}`;
        if (desktopCard) desktopCard.textContent = `Latest version: ${desktop_version}`;
    } catch (error) {
        console.error('Failed to check for updates:', error);
    }
}
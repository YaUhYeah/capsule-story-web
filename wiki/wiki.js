document.addEventListener('DOMContentLoaded', () => {
    // Initialize Wiki features
    initializeWiki();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial content
    loadWikiContent();
});

function initializeWiki() {
    // Initialize search functionality
    const searchInput = document.getElementById('wikiSearch');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleWikiSearch, 300));
    }

    // Initialize edit button
    const editBtn = document.getElementById('editPage');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            if (isUserLoggedIn()) {
                showEditModal();
            } else {
                showLoginPrompt();
            }
        });
    }

    // Initialize history button
    const historyBtn = document.getElementById('pageHistory');
    if (historyBtn) {
        historyBtn.addEventListener('click', showPageHistory);
    }

    // Setup table of contents
    generateTableOfContents();
}

function setupEventListeners() {
    // Watch page button
    const watchBtn = document.querySelector('.watch-btn');
    if (watchBtn) {
        watchBtn.addEventListener('click', togglePageWatch);
    }

    // Report issue button
    const reportBtn = document.querySelector('.report-btn');
    if (reportBtn) {
        reportBtn.addEventListener('click', showReportModal);
    }

    // Handle navigation
    document.querySelectorAll('.wiki-nav a').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
}

async function loadWikiContent(page = 'home') {
    try {
        const response = await fetch(`/api/wiki/pages/${page}`);
        const data = await response.json();
        
        if (response.ok) {
            updateWikiContent(data);
            updatePageMetadata(data.metadata);
        } else {
            throw new Error('Failed to load wiki content');
        }
    } catch (error) {
        console.error('Error loading wiki content:', error);
        showErrorMessage('Failed to load content. Please try again later.');
    }
}

function updateWikiContent(data) {
    const article = document.querySelector('.wiki-article');
    if (article) {
        article.innerHTML = marked(data.content); // Using marked.js for Markdown rendering
        highlightCode(); // Syntax highlighting for code blocks
        processWikiLinks(); // Process internal wiki links
    }
}

function updatePageMetadata(metadata) {
    const pageInfo = document.querySelector('.page-info');
    if (pageInfo) {
        pageInfo.innerHTML = `
            <span>Last edited: ${formatDate(metadata.lastEdited)}</span>
            <span>Contributors: ${metadata.contributors.length}</span>
        `;
    }

    // Update watch button state
    const watchBtn = document.querySelector('.watch-btn');
    if (watchBtn) {
        watchBtn.classList.toggle('active', metadata.isWatched);
        watchBtn.textContent = metadata.isWatched ? 'Unwatch Page' : 'Watch Page';
    }
}

function showEditModal() {
    const modal = document.createElement('div');
    modal.className = 'modal edit-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Edit Wiki Page</h2>
            <div class="edit-tabs">
                <button class="tab-btn active" data-tab="edit">Edit</button>
                <button class="tab-btn" data-tab="preview">Preview</button>
            </div>
            <div class="tab-content">
                <div class="tab-pane active" id="edit">
                    <textarea id="wikiEditor"></textarea>
                </div>
                <div class="tab-pane" id="preview">
                    <div id="previewContent"></div>
                </div>
            </div>
            <div class="edit-tools">
                <button onclick="insertTemplate('table')">Insert Table</button>
                <button onclick="insertTemplate('code')">Insert Code Block</button>
                <button onclick="insertTemplate('image')">Insert Image</button>
            </div>
            <div class="form-actions">
                <button onclick="saveWikiChanges()">Save Changes</button>
                <button onclick="closeModal()">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Initialize editor
    initializeWikiEditor();
}

function initializeWikiEditor() {
    const editor = document.getElementById('wikiEditor');
    if (!editor) return;

    // Load current content
    fetch(`/api/wiki/raw/${getCurrentPage()}`)
        .then(response => response.text())
        .then(content => {
            editor.value = content;
        })
        .catch(error => {
            console.error('Error loading page content:', error);
            showErrorMessage('Failed to load page content');
        });

    // Setup preview functionality
    const previewBtn = document.querySelector('[data-tab="preview"]');
    previewBtn.addEventListener('click', () => {
        const previewContent = document.getElementById('previewContent');
        previewContent.innerHTML = marked(editor.value);
        highlightCode();
    });
}

async function saveWikiChanges() {
    const editor = document.getElementById('wikiEditor');
    if (!editor) return;

    const content = editor.value;
    const page = getCurrentPage();

    try {
        const response = await fetch(`/api/wiki/pages/${page}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('user_token')}`
            },
            body: JSON.stringify({
                content,
                editSummary: prompt('Enter a brief summary of your changes:')
            })
        });

        if (response.ok) {
            closeModal();
            loadWikiContent(page);
            showSuccessMessage('Changes saved successfully');
        } else {
            throw new Error('Failed to save changes');
        }
    } catch (error) {
        console.error('Error saving wiki changes:', error);
        showErrorMessage('Failed to save changes. Please try again.');
    }
}

function showPageHistory() {
    const modal = document.createElement('div');
    modal.className = 'modal history-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <h2>Page History</h2>
            <div class="history-list">Loading...</div>
            <button onclick="closeModal()">Close</button>
        </div>
    `;
    document.body.appendChild(modal);

    // Load page history
    loadPageHistory();
}

async function loadPageHistory() {
    try {
        const response = await fetch(`/api/wiki/history/${getCurrentPage()}`);
        const history = await response.json();
        
        const historyList = document.querySelector('.history-list');
        if (historyList) {
            historyList.innerHTML = history.map(revision => `
                <div class="revision-item">
                    <div class="revision-info">
                        <span class="revision-date">${formatDate(revision.date)}</span>
                        <span class="revision-author">${revision.author}</span>
                    </div>
                    <div class="revision-summary">${revision.summary}</div>
                    <div class="revision-actions">
                        <button onclick="viewRevision('${revision.id}')">View</button>
                        <button onclick="restoreRevision('${revision.id}')">Restore</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading page history:', error);
        showErrorMessage('Failed to load page history');
    }
}

async function handleWikiSearch(e) {
    const searchTerm = e.target.value.trim();
    if (searchTerm.length < 3) return;

    try {
        const response = await fetch(`/api/wiki/search?q=${encodeURIComponent(searchTerm)}`);
        const results = await response.json();
        
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        searchResults.innerHTML = results.map(result => `
            <div class="search-result">
                <a href="/wiki/${result.slug}">${result.title}</a>
                <p>${result.excerpt}</p>
            </div>
        `).join('') || '<p>No results found</p>';

        // Show results in a dropdown
        const searchInput = document.getElementById('wikiSearch');
        const existingResults = document.querySelector('.search-results');
        if (existingResults) {
            existingResults.remove();
        }
        searchInput.parentNode.appendChild(searchResults);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

function generateTableOfContents() {
    const article = document.querySelector('.wiki-article');
    const headings = article.querySelectorAll('h2, h3');
    
    const toc = document.createElement('nav');
    toc.className = 'table-of-contents';
    toc.innerHTML = '<h2>Contents</h2><ul></ul>';
    
    const tocList = toc.querySelector('ul');
    
    headings.forEach((heading, index) => {
        const id = heading.id || `section-${index}`;
        heading.id = id;
        
        const listItem = document.createElement('li');
        listItem.className = `toc-${heading.tagName.toLowerCase()}`;
        listItem.innerHTML = `<a href="#${id}">${heading.textContent}</a>`;
        tocList.appendChild(listItem);
    });
    
    article.insertBefore(toc, article.firstChild);
}

// Utility functions
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

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCurrentPage() {
    const path = window.location.pathname;
    return path.split('/').pop() || 'home';
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
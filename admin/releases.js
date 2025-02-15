document.addEventListener('DOMContentLoaded', () => {
    // Initialize releases management
    initializeReleases();
    
    // Setup event listeners
    setupEventListeners();
    
    // Load initial data
    loadReleases();
});

function initializeReleases() {
    // Check admin authentication
    checkAdminAuth();
}

function setupEventListeners() {
    // New release button
    const newReleaseBtn = document.querySelector('.new-release-btn');
    if (newReleaseBtn) {
        newReleaseBtn.addEventListener('click', showReleaseModal);
    }

    // Release form
    const releaseForm = document.getElementById('releaseForm');
    if (releaseForm) {
        releaseForm.addEventListener('submit', handleReleaseSubmit);
    }

    // File input
    const gameFile = document.getElementById('gameFile');
    if (gameFile) {
        gameFile.addEventListener('change', handleFileSelect);
    }

    // Cancel button
    const cancelBtn = document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', hideReleaseModal);
    }
}

async function loadReleases() {
    try {
        const response = await fetch('/api/admin/releases', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        const data = await response.json();
        updateReleasesList(data);
    } catch (error) {
        console.error('Error loading releases:', error);
        showErrorMessage('Failed to load releases');
    }
}

function updateReleasesList(data) {
    // Update Android releases
    const androidList = document.getElementById('androidReleases');
    if (androidList) {
        androidList.innerHTML = data.android.map(release => createReleaseItem(release)).join('');
    }

    // Update Desktop releases
    const desktopList = document.getElementById('desktopReleases');
    if (desktopList) {
        desktopList.innerHTML = data.desktop.map(release => createReleaseItem(release)).join('');
    }
}

function createReleaseItem(release) {
    return `
        <div class="release-item">
            <div class="release-header">
                <span class="release-version">v${release.version}</span>
                <span class="release-type ${release.type}">${release.type}</span>
            </div>
            <div class="release-info">
                <div class="release-date">${formatDate(release.releaseDate)}</div>
                <div class="release-notes">${marked(release.releaseNotes)}</div>
            </div>
            <div class="release-stats">
                <div class="stat-item">
                    <img src="../images/download-icon.svg" class="stat-icon" alt="Downloads">
                    <span>${formatNumber(release.downloads)} downloads</span>
                </div>
                <div class="stat-item">
                    <img src="../images/size-icon.svg" class="stat-icon" alt="File Size">
                    <span>${formatFileSize(release.fileSize)}</span>
                </div>
            </div>
            <div class="release-actions">
                <button class="release-btn download-btn" onclick="downloadRelease('${release.id}')">
                    Download
                </button>
                <button class="release-btn edit-btn" onclick="editRelease('${release.id}')">
                    Edit
                </button>
                <button class="release-btn delete-btn" onclick="deleteRelease('${release.id}')">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function showReleaseModal() {
    const modal = document.getElementById('releaseModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function hideReleaseModal() {
    const modal = document.getElementById('releaseModal');
    if (modal) {
        modal.style.display = 'none';
        resetForm();
    }
}

function resetForm() {
    const form = document.getElementById('releaseForm');
    if (form) {
        form.reset();
        
        // Reset checksums
        document.getElementById('md5Checksum').textContent = '-';
        document.getElementById('sha256Checksum').textContent = '-';
        
        // Reset progress bar
        const progressBar = document.querySelector('.upload-progress');
        if (progressBar) {
            progressBar.style.display = 'none';
            progressBar.querySelector('.progress').style.width = '0%';
            progressBar.querySelector('.progress-text').textContent = '0%';
        }
    }
}

async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show progress bar
    const progressBar = document.querySelector('.upload-progress');
    if (progressBar) {
        progressBar.style.display = 'block';
    }

    // Calculate checksums
    try {
        const checksums = await calculateChecksums(file);
        document.getElementById('md5Checksum').textContent = checksums.md5;
        document.getElementById('sha256Checksum').textContent = checksums.sha256;
    } catch (error) {
        console.error('Error calculating checksums:', error);
        showErrorMessage('Failed to calculate file checksums');
    }
}

async function calculateChecksums(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const arrayBuffer = e.target.result;
                const md5 = await crypto.subtle.digest('MD5', arrayBuffer);
                const sha256 = await crypto.subtle.digest('SHA-256', arrayBuffer);

                resolve({
                    md5: arrayBufferToHex(md5),
                    sha256: arrayBufferToHex(sha256)
                });
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function handleReleaseSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const file = formData.get('gameFile');
    
    if (!file) {
        showErrorMessage('Please select a game file');
        return;
    }

    try {
        // Start upload with progress tracking
        const response = await uploadWithProgress(formData);
        
        if (response.ok) {
            const data = await response.json();
            showSuccessMessage('Release published successfully');
            hideReleaseModal();
            loadReleases(); // Refresh the list
        } else {
            throw new Error('Failed to publish release');
        }
    } catch (error) {
        console.error('Error publishing release:', error);
        showErrorMessage('Failed to publish release');
    }
}

async function uploadWithProgress(formData) {
    const xhr = new XMLHttpRequest();
    
    return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                updateProgress(percentComplete);
            }
        });

        xhr.addEventListener('load', () => resolve({
            ok: xhr.status >= 200 && xhr.status < 300,
            json: () => JSON.parse(xhr.responseText)
        }));

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        xhr.open('POST', '/api/admin/releases');
        xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('admin_token')}`);
        xhr.send(formData);
    });
}

function updateProgress(percent) {
    const progress = document.querySelector('.upload-progress .progress');
    const progressText = document.querySelector('.upload-progress .progress-text');
    
    if (progress && progressText) {
        progress.style.width = `${percent}%`;
        progressText.textContent = `${Math.round(percent)}%`;
    }
}

async function downloadRelease(releaseId) {
    try {
        const response = await fetch(`/api/admin/releases/${releaseId}/download`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = response.headers.get('Content-Disposition').split('filename=')[1];
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            throw new Error('Failed to download release');
        }
    } catch (error) {
        console.error('Error downloading release:', error);
        showErrorMessage('Failed to download release');
    }
}

async function editRelease(releaseId) {
    try {
        const response = await fetch(`/api/admin/releases/${releaseId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        if (response.ok) {
            const release = await response.json();
            populateReleaseForm(release);
            showReleaseModal();
        } else {
            throw new Error('Failed to load release data');
        }
    } catch (error) {
        console.error('Error loading release:', error);
        showErrorMessage('Failed to load release data');
    }
}

function populateReleaseForm(release) {
    const form = document.getElementById('releaseForm');
    if (!form) return;

    form.platform.value = release.platform;
    form.version.value = release.version;
    form.releaseType.value = release.type;
    form.releaseNotes.value = release.releaseNotes;

    // Update checksums
    document.getElementById('md5Checksum').textContent = release.checksums.md5;
    document.getElementById('sha256Checksum').textContent = release.checksums.sha256;
}

async function deleteRelease(releaseId) {
    if (!confirm('Are you sure you want to delete this release? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/releases/${releaseId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
            }
        });
        
        if (response.ok) {
            showSuccessMessage('Release deleted successfully');
            loadReleases(); // Refresh the list
        } else {
            throw new Error('Failed to delete release');
        }
    } catch (error) {
        console.error('Error deleting release:', error);
        showErrorMessage('Failed to delete release');
    }
}

// Utility functions
function arrayBufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}

function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
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
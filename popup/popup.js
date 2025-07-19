// Popup JavaScript for Offline Bookmark Manager
class OfflineBookmarkPopup {
    constructor() {
        this.currentTab = null;
        this.storage = null;
        this.init();
    }

    async init() {
        try {
            // Initialize storage
            await this.initStorage();
            
            // Get current tab info
            await this.getCurrentTab();
            
            // Load UI data
            await this.loadUIData();
            
            // Set up event listeners
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Error initializing popup:', error);
            this.showStatus('Error initializing extension', 'error');
        }
    }

    async initStorage() {
        // Initialize Dexie database
        this.storage = new Dexie('OfflineBookmarks');
        this.storage.version(1).stores({
            pages: '++id, url, title, content, savedAt, tags, size',
            settings: 'key, value'
        });
        
        await this.storage.open();
    }

    async getCurrentTab() {
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            this.currentTab = tabs[0];
            
            // Update UI with current page info
            document.getElementById('page-title').textContent = this.currentTab.title || 'Untitled';
            document.getElementById('page-url').textContent = this.currentTab.url || '';
            
        } catch (error) {
            console.error('Error getting current tab:', error);
            document.getElementById('page-title').textContent = 'Error loading page info';
        }
    }

    async loadUIData() {
        try {
            // Load stats
            const totalPages = await this.storage.pages.count();
            document.getElementById('total-pages').textContent = totalPages;

            // Load recent saves (this week)
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            
            const recentSaves = await this.storage.pages
                .where('savedAt')
                .above(oneWeekAgo.getTime())
                .count();
            
            document.getElementById('recent-saves').textContent = recentSaves;

            // Load storage info (simplified for MVP)
            await this.updateStorageInfo();
            
        } catch (error) {
            console.error('Error loading UI data:', error);
        }
    }

    async updateStorageInfo() {
        try {
            // Get storage usage estimate
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                const usedMB = Math.round((estimate.usage || 0) / (1024 * 1024));
                const quotaMB = Math.round((estimate.quota || 0) / (1024 * 1024));
                
                document.getElementById('storage-used').textContent = usedMB;
                document.getElementById('storage-limit').textContent = quotaMB;
            }
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }

    setupEventListeners() {
        // Save page button
        const saveBtn = document.getElementById('save-page-btn');
        saveBtn.addEventListener('click', () => this.savePage());

        // View all pages button
        const viewAllBtn = document.getElementById('view-all-btn');
        viewAllBtn.addEventListener('click', () => this.openReader());

        // Settings button (placeholder for now)
        const settingsBtn = document.getElementById('settings-btn');
        settingsBtn.addEventListener('click', () => {
            this.showStatus('Settings coming in Phase 2!', 'success');
        });
    }

    async savePage() {
        if (!this.currentTab || !this.currentTab.url) {
            this.showStatus('No valid page to save', 'error');
            return;
        }

        // Check for unsupported URLs
        if (this.currentTab.url.startsWith('chrome://') || 
            this.currentTab.url.startsWith('chrome-extension://') ||
            this.currentTab.url.startsWith('moz-extension://')) {
            this.showStatus('Cannot save browser internal pages', 'error');
            return;
        }

        try {
            // Show loading state
            this.setSaveButtonState('loading');
            this.showStatus('Saving page...', 'loading');

            // Send message with retry logic
            const response = await this.sendMessageWithTimeout({
                action: 'savePage',
                tab: {
                    url: this.currentTab.url,
                    title: this.currentTab.title,
                    id: this.currentTab.id
                }
            }, 15000); // Increased timeout

            if (response.success) {
                this.showStatus('Page saved successfully!', 'success');
                await this.loadUIData();
            } else {
                throw new Error(response.error || 'Unknown error');
            }

        } catch (error) {
            console.error('Error saving page:', error);
            let errorMessage = this.getErrorMessage(error.message);
            this.showStatus(errorMessage, 'error');
        } finally {
            this.setSaveButtonState('normal');
        }
    }

    getErrorMessage(errorText) {
        if (errorText.includes('Content capture returned null')) {
            return 'Could not capture page content. Try refreshing the page.';
        } else if (errorText.includes('Cannot access tab')) {
            return 'Cannot access this page. Try a different page.';
        } else if (errorText.includes('Script injection failed')) {
            return 'Page blocked content access. This page cannot be saved.';
        } else if (errorText.includes('browser internal pages')) {
            return 'Browser internal pages cannot be saved.';
        } else if (errorText.includes('Document still loading')) {
            return 'Page is still loading. Please wait and try again.';
        } else {
            return 'Failed to save page: ' + errorText;
        }
    }

    // Add retry wrapper
    async sendMessageWithRetry(message, maxRetries = 3) {
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await this.sendMessageWithTimeout(message, 10000);
                return response;
            } catch (error) {
                if (i === maxRetries - 1) throw error;
                
                // Wait before retry
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
    }

    // Add timeout wrapper for chrome.runtime.sendMessage
    sendMessageWithTimeout(message, timeoutMs = 5000) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Message timeout'));
            }, timeoutMs);

            chrome.runtime.sendMessage(message, (response) => {
                clearTimeout(timeout);
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(response);
                }
            });
        });
    }


    setSaveButtonState(state) {
        const saveBtn = document.getElementById('save-page-btn');
        const saveIcon = saveBtn.querySelector('.save-icon');
        const saveText = saveBtn.querySelector('.save-text');

        switch (state) {
            case 'loading':
                saveBtn.disabled = true;
                saveBtn.classList.add('loading');
                saveIcon.textContent = '⏳';
                saveText.textContent = 'Saving...';
                break;
            case 'normal':
            default:
                saveBtn.disabled = false;
                saveBtn.classList.remove('loading');
                saveIcon.textContent = '📁';
                saveText.textContent = 'Save Current Page';
                break;
        }
    }

    showStatus(message, type) {
        const statusEl = document.getElementById('save-status');
        statusEl.textContent = message;
        statusEl.className = `save-status ${type}`;
        statusEl.classList.remove('hidden');

        // Auto-hide after 3 seconds
        setTimeout(() => {
            statusEl.classList.add('hidden');
        }, 3000);
    }

    openReader() {
        // Open reader page in new tab
        chrome.tabs.create({
            url: chrome.runtime.getURL('reader/reader.html')
        });
        window.close(); // Close popup
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OfflineBookmarkPopup();
});

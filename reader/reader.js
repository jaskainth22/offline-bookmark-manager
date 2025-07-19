// Reader interface for Offline Bookmark Manager
class OfflineBookmarkReader {
    constructor() {
        this.storage = null;
        this.currentView = 'list';
        this.currentPage = null;
        this.selectedPages = new Set();
        this.allPages = [];
        this.filteredPages = [];
        this.currentSort = 'savedAt-desc';
        this.fontSize = 16;
        this.darkMode = false;
        
        this.init();
    }

    async init() {
        try {
            await this.initStorage();
            await this.loadPages();
            this.setupEventListeners();
            await this.updateStorageInfo();
            this.loadPreferences();
            
            // Apply dark mode immediately after loading preferences
            this.applyDarkMode();
            
        } catch (error) {
            console.error('Error initializing reader:', error);
            this.showError('Failed to initialize reader interface');
        }
    }

    async initStorage() {
        this.storage = new OfflineBookmarkStorage();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for storage to initialize
    }

    async loadPages() {
        try {
            this.showLoading();
            
            // Get all pages from storage
            this.allPages = await this.storage.getAllPages(1000); // Load up to 1000 pages
            this.filteredPages = [...this.allPages];
            
            // Update UI
            this.updatePageCount();
            this.sortAndDisplayPages();
            
        } catch (error) {
            console.error('Error loading pages:', error);
            this.showError('Failed to load saved pages');
        }
    }

    sortAndDisplayPages() {
        // Sort pages
        this.filteredPages.sort(this.getSortFunction());
        
        // Display based on current view
        if (this.currentView === 'list') {
            this.displayListView();
        } else if (this.currentView === 'grid') {
            this.displayGridView();
        }
    }

    getSortFunction() {
        const [field, direction] = this.currentSort.split('-');
        
        return (a, b) => {
            let aVal = a[field];
            let bVal = b[field];
            
            if (field === 'title' || field === 'url') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            
            if (direction === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        };
    }

    displayListView() {
        const container = document.getElementById('pages-list');
        
        if (this.filteredPages.length === 0) {
            container.innerHTML = '<div class="empty-message">No saved pages found. Start saving pages to see them here!</div>';
            return;
        }
        
        const pagesHTML = this.filteredPages.map(page => this.createPageListItem(page)).join('');
        container.innerHTML = pagesHTML;
        
        // Add event listeners to page items
        this.attachPageListeners();
    }

    createPageListItem(page) {
        const savedDate = new Date(page.savedAt).toLocaleDateString();
        const size = this.formatFileSize(page.size);
        const favicon = page.favicon ? `<img src="${page.favicon}" class="page-favicon" onerror="this.style.display='none'">` : '<div class="page-favicon">📄</div>';
        
        return `
            <div class="page-item" data-page-id="${page.id}">
                <input type="checkbox" class="page-checkbox" data-page-id="${page.id}">
                ${favicon}
                <div class="page-info">
                    <div class="page-title">${this.escapeHtml(page.title)}</div>
                    <div class="page-url">${this.escapeHtml(page.url)}</div>
                    <div class="page-meta">
                        <span>Saved: ${savedDate}</span>
                        <span>Size: ${size}</span>
                    </div>
                </div>
                <div class="page-actions">
                    <button class="page-action-btn" onclick="reader.openPage(${page.id})">Read</button>
                    <button class="page-action-btn danger" onclick="reader.deletePage(${page.id})">Delete</button>
                </div>
            </div>
        `;
    }

    displayGridView() {
        const container = document.getElementById('pages-grid');
        
        if (this.filteredPages.length === 0) {
            container.innerHTML = '<div class="empty-message">No saved pages found.</div>';
            return;
        }
        
        const pagesHTML = this.filteredPages.map(page => this.createPageGridItem(page)).join('');
        container.innerHTML = pagesHTML;
    }

    createPageGridItem(page) {
        const savedDate = new Date(page.savedAt).toLocaleDateString();
        const size = this.formatFileSize(page.size);
        
        return `
            <div class="grid-item" data-page-id="${page.id}" onclick="reader.openPage(${page.id})">
                <div class="grid-item-content">
                    <div class="grid-title">${this.escapeHtml(page.title)}</div>
                    <div class="grid-url">${this.escapeHtml(page.url)}</div>
                    <div class="grid-meta">
                        <span>${savedDate}</span>
                        <span>${size}</span>
                    </div>
                </div>
            </div>
        `;
    }

    async openPage(pageId) {
        try {
            const page = await this.storage.getPage(pageId);
            if (!page) {
                this.showError('Page not found');
                return;
            }
            
            this.currentPage = page;
            this.switchToReadingView();
            
        } catch (error) {
            console.error('Error opening page:', error);
            this.showError('Failed to open page');
        }
    }

    switchToReadingView() {
        // Switch views
        document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
        document.getElementById('reading-view').classList.add('active');
        
        // Update nav
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('reading-view-btn').classList.add('active', 'hidden');
        
        // Load content
        const contentContainer = document.getElementById('reading-content');
        contentContainer.innerHTML = this.currentPage.content;
        
        // Apply current preferences
        this.applyReadingPreferences();
    }

    switchToListView() {
        document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
        document.getElementById('list-view').classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('list-view-btn').classList.add('active');
        document.getElementById('reading-view-btn').classList.add('hidden');
        
        this.currentView = 'list';
    }

    switchToGridView() {
        document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
        document.getElementById('grid-view').classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById('grid-view-btn').classList.add('active');
        document.getElementById('reading-view-btn').classList.add('hidden');
        
        this.currentView = 'grid';
        this.displayGridView();
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('list-view-btn').addEventListener('click', () => this.switchToListView());
        document.getElementById('grid-view-btn').addEventListener('click', () => this.switchToGridView());
        document.getElementById('back-to-list').addEventListener('click', () => this.switchToListView());
        
        // Search
        document.getElementById('search-input').addEventListener('input', (e) => this.handleSearch(e.target.value));
        document.getElementById('search-btn').addEventListener('click', () => this.handleSearch(document.getElementById('search-input').value));
        
        // Sort
        document.getElementById('sort-select').addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.sortAndDisplayPages();
        });
        
        // Bulk actions
        document.getElementById('select-all-btn').addEventListener('click', () => this.selectAllPages());
        document.getElementById('delete-selected-btn').addEventListener('click', () => this.deleteSelectedPages());
        
        // Reading controls
        document.getElementById('font-decrease').addEventListener('click', () => this.adjustFontSize(-2));
        document.getElementById('font-increase').addEventListener('click', () => this.adjustFontSize(2));
        document.getElementById('dark-mode-toggle').addEventListener('click', () => this.toggleDarkMode());
        
        // Refresh
        document.getElementById('refresh-btn').addEventListener('click', () => this.loadPages());
        
        // Modal
        document.getElementById('modal-cancel').addEventListener('click', () => this.hideModal());
        document.getElementById('modal-confirm').addEventListener('click', () => this.confirmModalAction());
    }

    attachPageListeners() {
        // Checkbox listeners
        document.querySelectorAll('.page-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const pageId = parseInt(e.target.dataset.pageId);
                if (e.target.checked) {
                    this.selectedPages.add(pageId);
                } else {
                    this.selectedPages.delete(pageId);
                }
                this.updateBulkActions();
            });
        });
        
        // Page item click listeners (excluding action buttons)
        document.querySelectorAll('.page-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.classList.contains('page-action-btn') || e.target.classList.contains('page-checkbox')) {
                    return;
                }
                const pageId = parseInt(item.dataset.pageId);
                this.openPage(pageId);
            });
        });
    }

    // Utility methods
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updatePageCount() {
        document.getElementById('total-count').textContent = this.allPages.length;
    }

    showLoading() {
        document.getElementById('pages-list').innerHTML = '<div class="loading-message">Loading saved pages...</div>';
    }

    showError(message) {
        document.getElementById('pages-list').innerHTML = `<div class="empty-message">Error: ${message}</div>`;
    }

    async updateStorageInfo() {
        try {
            const stats = await this.storage.getStorageStats();
            const usedMB = Math.round(stats.usedBytes / (1024 * 1024));
            const quotaMB = Math.round(stats.quotaBytes / (1024 * 1024));
            const percentage = (stats.usedBytes / stats.quotaBytes) * 100;
            
            document.getElementById('storage-used').textContent = usedMB;
            document.getElementById('storage-quota').textContent = quotaMB;
            document.getElementById('storage-progress').style.width = percentage + '%';
            
        } catch (error) {
            console.error('Error updating storage info:', error);
        }
    }

    // Additional methods for search, delete, preferences, etc.
    handleSearch(query) {
        if (!query.trim()) {
            this.filteredPages = [...this.allPages];
        } else {
            const searchTerm = query.toLowerCase();
            this.filteredPages = this.allPages.filter(page => 
                page.title.toLowerCase().includes(searchTerm) ||
                page.url.toLowerCase().includes(searchTerm) ||
                page.content.toLowerCase().includes(searchTerm)
            );
        }
        this.sortAndDisplayPages();
    }

    async deletePage(pageId) {
        this.showModal(
            'Delete Page',
            'Are you sure you want to delete this saved page? This action cannot be undone.',
            () => this.confirmDeletePage(pageId)
        );
    }

    async confirmDeletePage(pageId) {
        try {
            await this.storage.deletePage(pageId);
            await this.loadPages(); // Refresh the list
            this.hideModal();
        } catch (error) {
            console.error('Error deleting page:', error);
            this.showError('Failed to delete page');
        }
    }

    showModal(title, message, confirmAction) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        document.getElementById('confirm-modal').classList.remove('hidden');
        this.pendingModalAction = confirmAction;
    }

    hideModal() {
        document.getElementById('confirm-modal').classList.add('hidden');
        this.pendingModalAction = null;
    }

    confirmModalAction() {
        if (this.pendingModalAction) {
            this.pendingModalAction();
        }
    }

    selectAllPages() {
        const checkboxes = document.querySelectorAll('.page-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedPages.add(parseInt(checkbox.dataset.pageId));
        });
        this.updateBulkActions();
    }

    updateBulkActions() {
        const deleteBtn = document.getElementById('delete-selected-btn');
        deleteBtn.disabled = this.selectedPages.size === 0;
        deleteBtn.textContent = `Delete Selected (${this.selectedPages.size})`;
    }

    async deleteSelectedPages() {
        if (this.selectedPages.size === 0) return;
        
        this.showModal(
            'Delete Multiple Pages',
            `Are you sure you want to delete ${this.selectedPages.size} selected pages? This action cannot be undone.`,
            () => this.confirmDeleteSelected()
        );
    }

    async confirmDeleteSelected() {
        try {
            for (const pageId of this.selectedPages) {
                await this.storage.deletePage(pageId);
            }
            this.selectedPages.clear();
            await this.loadPages();
            this.hideModal();
        } catch (error) {
            console.error('Error deleting selected pages:', error);
            this.showError('Failed to delete selected pages');
        }
    }

    adjustFontSize(change) {
        this.fontSize = Math.max(12, Math.min(24, this.fontSize + change));
        this.applyReadingPreferences();
        this.savePreferences();
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
        this.applyDarkMode();
        this.savePreferences();
        
        // Update button text
        const darkModeBtn = document.getElementById('dark-mode-toggle');
        darkModeBtn.textContent = this.darkMode ? '☀️' : '🌙';
    }

    applyReadingPreferences() {
        const content = document.getElementById('reading-content');
        if (content) {
            content.style.fontSize = this.fontSize + 'px';
        }
        this.applyDarkMode();
    }

    applyDarkMode() {
        const body = document.body;
        const html = document.documentElement;
        
        if (this.darkMode) {
            html.setAttribute('data-theme', 'dark');
            body.classList.add('dark-mode');
        } else {
            html.setAttribute('data-theme', 'light');
            body.classList.remove('dark-mode');
        }
        
        // Apply to reading content if it exists
        const readingContent = document.getElementById('reading-content');
        if (readingContent) {
            if (this.darkMode) {
                this.applyDarkModeToContent(readingContent);
            } else {
                this.removeDarkModeFromContent(readingContent);
            }
        }
    }

    applyDarkModeToContent(contentElement) {
    // Override inline styles that might conflict with dark mode
        const allElements = contentElement.querySelectorAll('*');
        
        allElements.forEach(element => {
            if (this.darkMode) {
                // Store original styles for restoration
                if (!element.dataset.originalStyle) {
                    element.dataset.originalStyle = element.style.cssText || '';
                }
                
                // Apply dark mode overrides
                const computedStyle = window.getComputedStyle(element);
                const bgColor = computedStyle.backgroundColor;
                const textColor = computedStyle.color;
                
                // Override light backgrounds
                if (bgColor === 'rgb(255, 255, 255)' || bgColor === 'white') {
                    element.style.backgroundColor = 'var(--bg-primary)';
                }
                
                // Override dark text colors
                if (textColor === 'rgb(0, 0, 0)' || textColor === 'black' || textColor.startsWith('rgb(') && this.isLightColor(textColor)) {
                    element.style.color = 'var(--text-primary)';
                }
            }
        });
    }

    isLightColor(color) {
        // Extract RGB values and calculate brightness
        const rgb = color.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
            const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
            return brightness > 128;
        }
        return false;
    }

    removeDarkModeFromContent(contentElement) {
        // Restore original styles
        const allElements = contentElement.querySelectorAll('*');
        
        allElements.forEach(element => {
            if (element.dataset.originalStyle !== undefined) {
                element.style.cssText = element.dataset.originalStyle;
                delete element.dataset.originalStyle;
            }
        });
    }

    loadPreferences() {
        const saved = localStorage.getItem('offline-bookmark-preferences');
        if (saved) {
            const prefs = JSON.parse(saved);
            this.fontSize = prefs.fontSize || 16;
            this.darkMode = prefs.darkMode || false;
        }
    }

    savePreferences() {
        const prefs = {
            fontSize: this.fontSize,
            darkMode: this.darkMode
        };
        localStorage.setItem('offline-bookmark-preferences', JSON.stringify(prefs));
    }

    sanitizeAndDisplayContent(htmlContent) {
        // Create a temporary container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Remove any remaining problematic elements
        const problematicSelectors = [
            'script', 'style', 'link', 'meta', 'head',
            '[style*="position: fixed"]',
            '[style*="position: absolute"]',
            '.gb_', '#gb', '[jscontroller]'
        ];
        
        problematicSelectors.forEach(selector => {
            tempDiv.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Apply reading-friendly structure
        const readingContent = document.getElementById('reading-content');
        readingContent.innerHTML = '';
        
        // Create a properly structured reading container
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'content-wrapper';
        contentWrapper.innerHTML = tempDiv.innerHTML;
        
        readingContent.appendChild(contentWrapper);
        
        // Apply enhanced reading styles
        this.applyReadingStyles();
    }

    applyReadingStyles() {
        const readingContent = document.getElementById('reading-content');
        
        // Override any remaining problematic styles
        const allElements = readingContent.querySelectorAll('*');
        allElements.forEach(element => {
            // Reset positioning
            element.style.position = 'static';
            element.style.float = 'none';
            element.style.clear = 'both';
            
            // Reset layout
            element.style.width = 'auto';
            element.style.height = 'auto';
            element.style.margin = '16px 0';
            element.style.padding = '0';
            
            // Apply reading typography
            if (element.tagName === 'P') {
                element.style.lineHeight = '1.7';
                element.style.marginBottom = '16px';
            }
            
            if (['H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(element.tagName)) {
                element.style.marginTop = '24px';
                element.style.marginBottom = '12px';
                element.style.fontWeight = 'bold';
            }
        });
    }

}

// Initialize reader when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.reader = new OfflineBookmarkReader();
});

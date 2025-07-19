// Storage management for Offline Bookmark Manager
class OfflineBookmarkStorage {
    constructor() {
        this.db = null;
        this.init();
    }

    async init() {
        // Initialize Dexie database
        this.db = new Dexie('OfflineBookmarks');
        
        this.db.version(1).stores({
            pages: '++id, url, title, content, savedAt, tags, size, favicon',
            settings: 'key, value'
        });

        await this.db.open();
        
        // Initialize default settings
        await this.initializeSettings();
    }

    async initializeSettings() {
        const defaultSettings = {
            captureImages: true,
            captureCSS: true,
            maxPageSize: 10, // MB
            autoCleanup: false
        };

        for (const [key, value] of Object.entries(defaultSettings)) {
            const existing = await this.db.settings.get(key);
            if (!existing) {
                await this.db.settings.add({ key, value });
            }
        }
    }

    async savePage(pageData) {
        try {
            // Prepare page object
            const page = {
                url: pageData.url,
                title: pageData.title || 'Untitled',
                content: pageData.content || '',
                savedAt: Date.now(),
                tags: pageData.tags || [],
                size: this.calculateSize(pageData.content),
                favicon: pageData.favicon || ''
            };

            // Check storage quota before saving
            await this.checkStorageQuota(page.size);

            // Save to database
            const id = await this.db.pages.add(page);
            
            return { success: true, id, page };
            
        } catch (error) {
            console.error('Error saving page:', error);
            throw error;
        }
    }

    async getPage(id) {
        return await this.db.pages.get(id);
    }

    async getAllPages(limit = 50, offset = 0) {
        return await this.db.pages
            .orderBy('savedAt')
            .reverse()
            .offset(offset)
            .limit(limit)
            .toArray();
    }

    async deletePage(id) {
        return await this.db.pages.delete(id);
    }

    async getStorageStats() {
        const totalPages = await this.db.pages.count();
        const pages = await this.db.pages.toArray();
        const totalSize = pages.reduce((acc, page) => acc + (page.size || 0), 0);
        
        let storageEstimate = {};
        // Use navigator.storage instead of window
        if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
            storageEstimate = await navigator.storage.estimate();
        }

        return {
            totalPages,
            totalSize,
            usedBytes: storageEstimate.usage || 0,
            quotaBytes: storageEstimate.quota || 0
        };
    }

    calculateSize(content) {
        // Simple size calculation in bytes
        return new Blob([content]).size;
    }

    async checkStorageQuota(additionalSize) {
        const stats = await this.getStorageStats();
        const projectedUsage = stats.usedBytes + additionalSize;
        const quotaThreshold = stats.quotaBytes * 0.9; // 90% threshold

        if (projectedUsage > quotaThreshold) {
            throw new Error('Storage quota exceeded. Please delete some saved pages.');
        }
    }

    async getSetting(key) {
        const setting = await this.db.settings.get(key);
        return setting ? setting.value : null;
    }

    async setSetting(key, value) {
        await this.db.settings.put({ key, value });
    }
}

// Export for service worker context - REMOVE the window reference
// OLD: window.OfflineBookmarkStorage = OfflineBookmarkStorage;
// NEW: Export for both contexts
if (typeof self !== 'undefined') {
    self.OfflineBookmarkStorage = OfflineBookmarkStorage;
}
if (typeof window !== 'undefined') {
    window.OfflineBookmarkStorage = OfflineBookmarkStorage;
}

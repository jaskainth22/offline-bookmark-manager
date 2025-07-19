# Offline Bookmark Manager MVP - Tech Stack & Implementation

## Recommended Tech Stack

### Core Technologies
```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Extension                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend: Vanilla JS + Modern Web APIs                    │
│  Storage: IndexedDB + File System Access API               │
│  Bundler: Webpack/Vite (optional for MVP)                  │
│  Manifest: V3 (Chrome, Edge, Firefox compatible)           │
└─────────────────────────────────────────────────────────────┘
```

### Why This Stack?

**1. Vanilla JavaScript (No Framework)**
- **Pros**: 
  - Smaller bundle size (critical for extensions)
  - Direct DOM manipulation efficiency
  - No framework learning curve
  - Better performance for simple UI
  - Easier debugging in extension context

**2. Modern Web APIs**
- IndexedDB for structured data storage
- File System Access API for large files
- Web Workers for background processing
- Compression API for storage optimization

**3. No Build Tools for MVP**
- Faster development iteration
- Simpler debugging
- Direct browser compatibility
- Easy to understand for contributors

## Project Structure

```
offline-bookmark-manager/
├── manifest.json              # Extension configuration
├── popup/                     # Extension popup UI
│   ├── popup.html
│   ├── popup.js
│   └── popup.css
├── content/                   # Content script (runs on pages)
│   ├── content.js
│   └── content.css
├── background/                # Background service worker
│   └── background.js
├── reader/                    # Offline reader interface
│   ├── reader.html
│   ├── reader.js
│   └── reader.css
├── storage/                   # Storage management
│   ├── storage.js
│   └── compression.js
├── utils/                     # Utility functions
│   ├── dom-utils.js
│   ├── url-utils.js
│   └── content-capture.js
├── icons/                     # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── lib/                       # Third-party libraries
    └── dexie.min.js          # IndexedDB wrapper
```

## MVP Feature Breakdown

### Phase 1: Core Functionality (2-3 weeks)
1. **Basic Page Saving**
   - Save HTML content and title
   - Basic metadata extraction
   - Simple popup interface

2. **Local Storage**
   - IndexedDB setup with Dexie
   - Basic CRUD operations
   - Storage quota monitoring

3. **Reader Interface**
   - Simple saved pages list
   - Basic content viewer
   - Search functionality

### Phase 2: Enhanced Features (2-3 weeks)
1. **Resource Capture**
   - Image downloading and storage
   - CSS extraction and inlining
   - Link conversion (relative to absolute)

2. **Better UI/UX**
   - Improved popup design
   - Better reader interface
   - Loading states and error handling

3. **Organization**
   - Basic tagging system
   - Date-based filtering
   - Delete functionality

## Implementation Details

### 1. Manifest.json Configuration
```json
{
  "manifest_version": 3,
  "name": "Offline Bookmark Manager",
  "version": "1.0.0",
  "description": "Save web pages for offline reading",
  
  "permissions": [
    "activeTab",
    "storage",
    "unlimitedStorage"
  ],
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "background": {
    "service_worker": "background/background.js"
  },
  
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/content.js"],
    "css": ["content/content.css"]
  }],
  
  "web_accessible_resources": [{
    "resources": ["reader/reader.html"],
    "matches": ["<all_urls>"]
  }]
}
```

### 2. Storage Layer (Using Dexie for IndexedDB)
```javascript
// storage/storage.js
class BookmarkStorage {
  constructor() {
    this.db = new Dexie('OfflineBookmarks');
    this.db.version(1).stores({
      pages: '++id, url, title, timestamp, tags, size',
      resources: '++id, url, type, data, pageId'
    });
  }

  async savePage(pageData) {
    const pageId = await this.db.pages.add({
      url: pageData.url,
      title: pageData.title,
      content: pageData.html,
      timestamp: Date.now(),
      tags: pageData.tags || [],
      size: new Blob([pageData.html]).size
    });

    // Save resources
    for (const resource of pageData.resources || []) {
      await this.db.resources.add({
        ...resource,
        pageId: pageId
      });
    }

    return pageId;
  }

  async getPage(id) {
    const page = await this.db.pages.get(id);
    if (page) {
      page.resources = await this.db.resources.where('pageId').equals(id).toArray();
    }
    return page;
  }

  async getAllPages() {
    return await this.db.pages.orderBy('timestamp').reverse().toArray();
  }

  async deletePage(id) {
    await this.db.transaction('rw', this.db.pages, this.db.resources, async () => {
      await this.db.pages.delete(id);
      await this.db.resources.where('pageId').equals(id).delete();
    });
  }

  async searchPages(query) {
    return await this.db.pages.filter(page => 
      page.title.toLowerCase().includes(query.toLowerCase()) ||
      page.content.toLowerCase().includes(query.toLowerCase())
    ).toArray();
  }
}
```

### 3. Content Capture System
```javascript
// utils/content-capture.js
class ContentCapture {
  static async capturePage() {
    const pageData = {
      url: window.location.href,
      title: document.title,
      html: await this.processHTML(),
      resources: await this.captureBasicResources(),
      timestamp: Date.now()
    };
    
    return pageData;
  }

  static async processHTML() {
    // Clone document and clean it
    const doc = document.cloneNode(true);
    
    // Remove scripts and tracking
    this.removeScripts(doc);
    this.removeTracking(doc);
    
    // Convert relative URLs to absolute
    this.convertRelativeUrls(doc);
    
    return doc.documentElement.outerHTML;
  }

  static removeScripts(doc) {
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => script.remove());
  }

  static removeTracking(doc) {
    const trackers = doc.querySelectorAll([
      '[href*="google-analytics"]',
      '[src*="googletagmanager"]',
      '[src*="facebook.com/tr"]'
    ].join(', '));
    trackers.forEach(tracker => tracker.remove());
  }

  static convertRelativeUrls(doc) {
    const base = window.location.origin;
    
    // Convert image sources
    const images = doc.querySelectorAll('img[src]');
    images.forEach(img => {
      if (img.src.startsWith('/')) {
        img.src = base + img.src;
      }
    });
    
    // Convert link hrefs
    const links = doc.querySelectorAll('a[href]');
    links.forEach(link => {
      if (link.href.startsWith('/')) {
        link.href = base + link.href;
      }
    });
  }

  static async captureBasicResources() {
    const resources = [];
    
    // For MVP, just capture small images
    const images = document.querySelectorAll('img');
    for (const img of images) {
      try {
        const resource = await this.captureImage(img.src);
        if (resource && resource.size < 1024 * 1024) { // 1MB limit
          resources.push(resource);
        }
      } catch (e) {
        console.warn('Failed to capture image:', img.src);
      }
    }
    
    return resources;
  }

  static async captureImage(src) {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);
      
      return {
        url: src,
        type: 'image',
        data: dataUrl,
        size: blob.size
      };
    } catch (e) {
      return null;
    }
  }

  static blobToDataUrl(blob) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  }
}
```

### 4. Simple Popup Interface
```html
<!-- popup/popup.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div class="popup-container">
    <div class="header">
      <h3>Offline Bookmarks</h3>
    </div>
    
    <div class="current-page">
      <button id="saveBtn" class="save-btn">
        📑 Save Current Page
      </button>
      <div id="saveStatus" class="status"></div>
    </div>
    
    <div class="actions">
      <button id="viewSavedBtn" class="action-btn">
        📚 View Saved Pages
      </button>
      <button id="settingsBtn" class="action-btn">
        ⚙️ Settings
      </button>
    </div>
    
    <div class="footer">
      <div class="storage-info">
        <span id="storageUsed">0</span> pages saved
      </div>
    </div>
  </div>
  
  <script src="../lib/dexie.min.js"></script>
  <script src="../storage/storage.js"></script>
  <script src="popup.js"></script>
</body>
</html>
```

### 5. Background Service Worker
```javascript
// background/background.js
let storage;

// Initialize storage
chrome.runtime.onStartup.addListener(async () => {
  storage = new BookmarkStorage();
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'savePage':
      handleSavePage(message.data).then(sendResponse);
      return true; // Indicates async response
    
    case 'getPages':
      handleGetPages().then(sendResponse);
      return true;
    
    case 'deletePage':
      handleDeletePage(message.id).then(sendResponse);
      return true;
  }
});

async function handleSavePage(pageData) {
  try {
    if (!storage) storage = new BookmarkStorage();
    const pageId = await storage.savePage(pageData);
    return { success: true, pageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleGetPages() {
  try {
    if (!storage) storage = new BookmarkStorage();
    const pages = await storage.getAllPages();
    return { success: true, pages };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function handleDeletePage(pageId) {
  try {
    if (!storage) storage = new BookmarkStorage();
    await storage.deletePage(pageId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

## Development Workflow

### 1. Setup
```bash
# Create project structure
mkdir offline-bookmark-manager
cd offline-bookmark-manager

# Create directories
mkdir popup content background reader storage utils icons lib

# Download Dexie.js
curl -o lib/dexie.min.js https://cdn.jsdelivr.net/npm/dexie@3.2.4/dist/dexie.min.js
```

### 2. Testing
1. Load extension in Chrome (`chrome://extensions/`)
2. Test on various websites
3. Check storage usage
4. Test offline functionality

### 3. Optimization Points for Later
- Bundle with Webpack/Vite for production
- Add TypeScript for better development experience
- Implement proper error handling
- Add comprehensive testing
- Performance monitoring

## Why This Stack Works for MVP

1. **Fast Development**: No build setup needed initially
2. **Direct Browser Integration**: Native extension APIs
3. **Offline-First**: Everything works without internet
4. **Scalable**: Easy to add React/Vue later if needed
5. **Cross-Browser**: Works on Chrome, Firefox, Edge

This approach lets you build and test the core functionality quickly while keeping the door open for more sophisticated tools as the project grows.

Ready to start implementing? We can begin with the manifest.json and basic popup interface!
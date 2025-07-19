// Import required dependencies using importScripts
importScripts('../lib/dexie.min.js', '../storage/storage.js');

// Enhanced capture function with article detection
async function capturePageContentEnhanced() {
    console.log('🚀 Starting enhanced content capture...');
    
    // Helper function 1: Detect if page is an article
    function detectArticleContent(doc) {
        const articleIndicators = [
            'article',
            '[itemtype*="Article"]',
            '.post-content',
            '.entry-content', 
            '.article-content',
            'main',
            '[role="main"]'
        ];
        
        const hasArticleStructure = articleIndicators.some(selector => {
            const element = doc.querySelector(selector);
            return element && element.textContent.trim().length > 200;
        });
        
        // Check for article-like content
        const paragraphs = doc.querySelectorAll('p');
        const totalTextLength = Array.from(paragraphs)
            .reduce((total, p) => total + p.textContent.length, 0);
        
        const hasSubstantialText = totalTextLength > 500;
        const hasMultipleParagraphs = paragraphs.length >= 3;
        
        return hasArticleStructure || (hasSubstantialText && hasMultipleParagraphs);
    }

    // Helper function 2: Extract main article content
    function extractArticleContent(doc) {
        // Try to find main content area
        const contentSelectors = [
            'article',
            '[role="main"]',
            'main',
            '.post-content',
            '.entry-content',
            '.article-content',
            '.content',
            '#content',
            '.article-body'
        ];
        
        let mainElement = null;
        
        for (const selector of contentSelectors) {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim().length > 200) {
                mainElement = element;
                break;
            }
        }
        
        // Fallback: find the element with most text content
        if (!mainElement) {
            const candidates = doc.querySelectorAll('div, section');
            let bestCandidate = null;
            let maxTextLength = 0;
            
            candidates.forEach(candidate => {
                const textLength = candidate.textContent.trim().length;
                if (textLength > maxTextLength && textLength > 200) {
                    maxTextLength = textLength;
                    bestCandidate = candidate;
                }
            });
            
            mainElement = bestCandidate;
        }
        
        if (!mainElement) {
            throw new Error('Could not find main content');
        }
        
        // Clean the extracted content
        return cleanArticleContent(mainElement.cloneNode(true));
    }

    // Helper function 3: Clean article content
    function cleanArticleContent(element) {
        // Remove unwanted elements but keep article structure
        const unwantedSelectors = [
            'script',
            'style',
            'iframe',
            'embed',
            'object',
            '.advertisement',
            '.ads',
            '.social-share',
            '.comments',
            'nav',
            'header:not(.article-header)',
            'footer:not(.article-footer)',
            '.sidebar',
            '[class*="menu"]'
        ];
        
        unwantedSelectors.forEach(selector => {
            element.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Clean attributes but preserve important ones
        element.querySelectorAll('*').forEach(el => {
            const keepAttributes = ['href', 'src', 'alt', 'title'];
            const attributes = Array.from(el.attributes);
            
            attributes.forEach(attr => {
                if (!keepAttributes.includes(attr.name)) {
                    el.removeAttribute(attr.name);
                }
            });
        });
        
        // Fix images
        element.querySelectorAll('img').forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            // If image fails to load, hide it
            img.onerror = function() {
                this.style.display = 'none';
            };
        });
        
        return element;
    }

    // Helper function 4: Create clean article HTML
    function createCleanArticleHTML(content, title, url) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        line-height: 1.7;
                        color: #333;
                        background: #fff;
                        max-width: 700px;
                        margin: 0 auto;
                        padding: 20px;
                        font-size: 16px;
                    }
                    
                    h1, h2, h3, h4, h5, h6 {
                        color: #1a1a1a;
                        margin-top: 32px;
                        margin-bottom: 16px;
                        line-height: 1.3;
                    }
                    
                    h1 {
                        font-size: 32px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 16px;
                        margin-bottom: 32px;
                    }
                    
                    h2 { font-size: 24px; }
                    h3 { font-size: 20px; }
                    
                    p {
                        margin-bottom: 20px;
                        line-height: 1.7;
                    }
                    
                    img {
                        max-width: 100%;
                        height: auto;
                        margin: 24px 0;
                        display: block;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        border-radius: 4px;
                    }
                    
                    a {
                        color: #1a73e8;
                        text-decoration: underline;
                    }
                    
                    a:hover {
                        text-decoration: none;
                    }
                    
                    blockquote {
                        border-left: 4px solid #1a73e8;
                        padding-left: 20px;
                        margin: 24px 0;
                        font-style: italic;
                        color: #666;
                    }
                    
                    ul, ol {
                        margin: 20px 0;
                        padding-left: 40px;
                    }
                    
                    li {
                        margin-bottom: 8px;
                    }
                    
                    pre, code {
                        background: #f5f5f5;
                        border-radius: 4px;
                        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                    }
                    
                    pre {
                        padding: 16px;
                        overflow-x: auto;
                        margin: 20px 0;
                    }
                    
                    code {
                        padding: 2px 6px;
                        font-size: 14px;
                    }
                    
                    table {
                        border-collapse: collapse;
                        width: 100%;
                        margin: 20px 0;
                    }
                    
                    th, td {
                        border: 1px solid #ddd;
                        padding: 12px;
                        text-align: left;
                    }
                    
                    th {
                        background: #f8f9fa;
                        font-weight: 600;
                    }
                    
                    .article-meta {
                        color: #666;
                        font-size: 14px;
                        border-bottom: 1px solid #eee;
                        padding-bottom: 16px;
                        margin-bottom: 32px;
                    }
                    
                    @media (max-width: 768px) {
                        body {
                            padding: 16px;
                            font-size: 15px;
                        }
                        
                        h1 {
                            font-size: 28px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="article-meta">
                    <strong>Source:</strong> <a href="${url}">${url}</a>
                </div>
                
                <h1>${title}</h1>
                
                <div class="article-content">
                    ${content.innerHTML}
                </div>
            </body>
            </html>
        `;
    }

    // Helper function 5: Capture article content
    function captureArticleContent(title, url, favicon) {
        try {
            // Extract main content
            const mainContent = extractArticleContent(document);
            
            // Create clean article HTML
            const cleanHTML = createCleanArticleHTML(mainContent, title, url);
            
            return createResult(true, {
                html: cleanHTML,
                favicon: favicon,
                title: title,
                url: url,
                resources: {}, // Skip resource capture for articles
                captureType: 'article'
            });
            
        } catch (error) {
            console.error('Error in article capture:', error);
            // Fallback to basic capture
            return fallbackCapture(title, url, favicon);
        }
    }

    // Helper function 6: Fallback capture
    function fallbackCapture(title, url, favicon) {
        const doc = document;
        
        // Remove unwanted elements
        const tempDoc = doc.cloneNode(true);
        const unwanted = tempDoc.querySelectorAll('script, style, nav, header, footer, aside');
        unwanted.forEach(el => el.remove());
        
        // Get main content areas
        const content = tempDoc.querySelector('main, article, #content, .content') || tempDoc.body;
        
        const simplePage = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${title}</title>
                <style>
                    body { 
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        max-width: 600px; 
                        margin: 20px auto; 
                        padding: 20px; 
                        line-height: 1.6; 
                        color: #333;
                    }
                    h1, h2, h3 { color: #1a73e8; margin-top: 24px; }
                    p { margin-bottom: 16px; }
                    a { color: #1a73e8; }
                    img { max-width: 100%; height: auto; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                <p><strong>Original URL:</strong> ${url}</p>
                <hr>
                ${content.innerHTML}
            </body>
            </html>
        `;
        
        return createResult(true, {
            html: simplePage,
            favicon: favicon,
            title: title + ' (Text Only)',
            url: url,
            resources: {},
            captureType: 'fallback'
        });
    }

    // Helper function 7: Create result object
    const createResult = (success, data = {}) => {
        const result = {
            html: data.html || '',
            favicon: data.favicon || '',
            title: data.title || document?.title || 'Untitled',
            url: data.url || window?.location?.href || '',
            resources: data.resources || {},
            captureType: data.captureType || 'basic',
            success: success,
            error: data.error || null
        };
        console.log('📦 Creating result object:', {
            success: result.success,
            hasHtml: !!result.html,
            captureType: result.captureType
        });
        return result;
    };
    
    // MAIN CAPTURE LOGIC
    try {
        if (!document || !document.documentElement) {
            return createResult(false, { error: 'No document available' });
        }
        
        if (document.readyState === 'loading') {
            return createResult(false, {
                error: 'Document still loading',
                html: document.documentElement.outerHTML || ''
            });
        }
        
        const pageTitle = document.title || 'Untitled';
        const pageUrl = window.location.href || '';
        console.log('📄 Processing page:', pageTitle);
        
        // Get favicon
        let faviconUrl = '';
        try {
            const faviconElement = document.querySelector('link[rel*="icon"]');
            if (faviconElement && faviconElement.href) {
                faviconUrl = faviconElement.href;
            }
        } catch (faviconError) {
            console.warn('⚠️ Error getting favicon:', faviconError);
        }
        
        // CHECK IF PAGE IS AN ARTICLE
        const isArticlePage = detectArticleContent(document);
        
        if (isArticlePage) {
            console.log('📰 Detected article page - using article-first approach');
            return captureArticleContent(pageTitle, pageUrl, faviconUrl);
        } else {
            console.log('🌐 Non-article page - using fallback approach');
            return fallbackCapture(pageTitle, pageUrl, faviconUrl);
        }
        
    } catch (error) {
        console.error('❌ Critical error in enhanced content capture:', error);
        return createResult(false, {
            error: error.message || 'Unknown error in enhanced content capture',
            html: document?.documentElement?.outerHTML || '<html><body><p>Error occurred</p></body></html>',
            title: document?.title || 'Error',
            url: window?.location?.href || ''
        });
    }
}

// Basic fallback capture function
function capturePageContent() {
    console.log('🔄 Starting basic content capture...');
    
    const createResult = (success, data = {}) => {
        return {
            html: data.html || '',
            favicon: data.favicon || '',
            title: data.title || document?.title || 'Untitled',
            url: data.url || window?.location?.href || '',
            success: success,
            error: data.error || null
        };
    };
    
    try {
        const pageTitle = document.title || 'Untitled';
        const pageUrl = window.location.href || '';
        
        // Get favicon
        let faviconUrl = '';
        try {
            const faviconElement = document.querySelector('link[rel*="icon"]');
            if (faviconElement && faviconElement.href) {
                faviconUrl = faviconElement.href;
            }
        } catch (faviconError) {
            console.warn('Error getting favicon:', faviconError);
        }
        
        // Simple HTML capture with basic cleaning
        let htmlContent = document.documentElement.outerHTML;
        
        // Basic script removal
        htmlContent = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        
        return createResult(true, {
            html: htmlContent,
            favicon: faviconUrl,
            title: pageTitle,
            url: pageUrl
        });
        
    } catch (error) {
        console.error('Error in basic capture:', error);
        return createResult(false, {
            error: error.message || 'Unknown error',
            html: document?.documentElement?.outerHTML || '',
            title: document?.title || 'Error',
            url: window?.location?.href || ''
        });
    }
}

// Background service worker class
class OfflineBookmarkBackground {
    constructor() {
        this.storage = null;
        this.enhancedCaptureEnabled = true;
        this.init();
    }

    async init() {
        try {
            this.storage = new OfflineBookmarkStorage();
            
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
                return true;
            });

            console.log('🚀 Enhanced Offline Bookmark Manager background script initialized');
        } catch (error) {
            console.error('❌ Error initializing background script:', error);
        }
    }

    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'savePage':
                    await this.handleSavePage(request, sender, sendResponse);
                    break;
                case 'getPage':
                    await this.handleGetPage(request, sender, sendResponse);
                    break;
                case 'getAllPages':
                    await this.handleGetAllPages(request, sender, sendResponse);
                    break;
                case 'deletePage':
                    await this.handleDeletePage(request, sender, sendResponse);
                    break;
                case 'toggleEnhancedCapture':
                    this.enhancedCaptureEnabled = !this.enhancedCaptureEnabled;
                    sendResponse({ 
                        success: true, 
                        enhancedCapture: this.enhancedCaptureEnabled 
                    });
                    break;
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    isPageSaveable(url) {
        const unsaveablePatterns = [
            /^chrome:\/\//,
            /^chrome-extension:\/\//,
            /^moz-extension:\/\//,
            /^about:/,
            /^file:/,
            /^data:/,
            /^blob:/
        ];
        
        return !unsaveablePatterns.some(pattern => pattern.test(url));
    }

    async handleSavePage(request, sender, sendResponse) {
        try {
            const { tab } = request;
            console.log('📥 Starting page save for tab:', tab);
            
            if (!tab || !tab.id) {
                throw new Error('Invalid tab information');
            }
            
            if (!this.isPageSaveable(tab.url)) {
                throw new Error('This type of page cannot be saved');
            }
            
            console.log('💉 Injecting content script...');
            
            // Use enhanced capture with article detection
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: capturePageContentEnhanced
            });
            
            console.log('📤 Script results:', results);
            
            if (!results || results.length === 0) {
                throw new Error('Script execution returned no results');
            }
            
            const scriptResult = results[0];
            if (!scriptResult) {
                throw new Error('Script result is undefined');
            }
            
            const capturedContent = scriptResult.result;
            
            if (capturedContent === null || capturedContent === undefined) {
                throw new Error('Content capture returned null/undefined');
            }
            
            console.log('✅ Captured content:', {
                hasHtml: !!capturedContent.html,
                captureType: capturedContent.captureType,
                success: capturedContent.success
            });
            
            if (!capturedContent.success) {
                throw new Error(`Content capture failed: ${capturedContent.error || 'Unknown error'}`);
            }
            
            if (!capturedContent.html || capturedContent.html.trim() === '') {
                throw new Error('No HTML content captured');
            }
            
            const pageData = {
                url: capturedContent.url || tab.url,
                title: capturedContent.title || tab.title || 'Untitled',
                content: capturedContent.html,
                favicon: capturedContent.favicon || '',
                resources: capturedContent.resources || {},
                captureType: capturedContent.captureType || 'enhanced'
            };
            
            console.log('💾 Saving page data:', {
                url: pageData.url,
                title: pageData.title,
                contentLength: Math.round(pageData.content.length / 1024) + ' KB',
                captureType: pageData.captureType
            });
            
            const result = await this.storage.savePage(pageData);
            console.log('✅ Page saved successfully as:', pageData.captureType);
            
            sendResponse({ 
                success: true, 
                captureType: pageData.captureType,
                ...result 
            });
            
        } catch (error) {
            console.error('❌ Error in handleSavePage:', error);
            
            // Fallback to basic capture if enhanced fails
            if (this.enhancedCaptureEnabled && error.message.includes('enhanced')) {
                console.log('⚠️ Falling back to basic capture...');
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: request.tab.id },
                        function: capturePageContent
                    });
                    
                    if (results && results[0] && results[0].result) {
                        const basicContent = results[0].result;
                        const pageData = {
                            url: basicContent.url || request.tab.url,
                            title: basicContent.title || request.tab.title,
                            content: basicContent.html,
                            favicon: basicContent.favicon || '',
                            captureType: 'basic'
                        };
                        
                        const result = await this.storage.savePage(pageData);
                        return sendResponse({ success: true, captureType: 'basic', ...result });
                    }
                } catch (fallbackError) {
                    console.error('Fallback capture also failed:', fallbackError);
                }
            }
            
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleGetPage(request, sender, sendResponse) {
        try {
            const page = await this.storage.getPage(request.id);
            sendResponse({ success: true, page });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleGetAllPages(request, sender, sendResponse) {
        try {
            const pages = await this.storage.getAllPages(request.limit, request.offset);
            sendResponse({ success: true, pages });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    async handleDeletePage(request, sender, sendResponse) {
        try {
            await this.storage.deletePage(request.id);
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
}

// Initialize background script
const backgroundScript = new OfflineBookmarkBackground();




// // Import required dependencies using importScripts
// importScripts('../lib/dexie.min.js', '../storage/storage.js');

// // Enhanced capture function with all helper functions nested inside
// async function capturePageContentEnhanced() {
//     console.log('🚀 Starting enhanced content capture...');
    
//     // Helper function 1: Resource Capture Class
//     class ResourceCapture {
//         constructor(options = {}) {
//             this.maxImageSize = options.maxImageSize || 5 * 1024 * 1024; // 5MB
//             this.maxTotalSize = options.maxTotalSize || 50 * 1024 * 1024; // 50MB
//             this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
//             this.capturedResources = new Map();
//             this.totalCapturedSize = 0;
//         }

//         async capturePageResources() {
//             console.log('🎯 Starting enhanced resource capture...');
            
//             const resources = {
//                 images: [],
//                 css: [],
//                 fonts: [],
//                 totalSize: 0
//             };

//             try {
//                 // Capture images
//                 resources.images = await this.captureImages();
                
//                 // Capture CSS
//                 resources.css = await this.captureCSS();
                
//                 // Capture fonts (basic)
//                 resources.fonts = await this.captureFonts();
                
//                 resources.totalSize = this.totalCapturedSize;
                
//                 console.log('✅ Resource capture completed:', {
//                     images: resources.images.length,
//                     cssFiles: resources.css.length,
//                     fonts: resources.fonts.length,
//                     totalSize: this.formatBytes(resources.totalSize)
//                 });
                
//                 return resources;
                
//             } catch (error) {
//                 console.error('❌ Error capturing resources:', error);
//                 return resources; // Return partial results
//             }
//         }

//         async captureImages() {
//             const images = [];
//             const imageElements = document.querySelectorAll('img[src]');
            
//             console.log(`🖼️ Found ${imageElements.length} images to process`);
            
//             for (let i = 0; i < Math.min(imageElements.length, 20); i++) { // Limit to 20 images for MVP
//                 const img = imageElements[i];
                
//                 try {
//                     if (this.totalCapturedSize >= this.maxTotalSize) {
//                         console.warn('⚠️ Total size limit reached, stopping image capture');
//                         break;
//                     }
                    
//                     const imageData = await this.captureImage(img);
//                     if (imageData) {
//                         images.push(imageData);
//                         this.totalCapturedSize += imageData.size;
                        
//                         // Update progress for large captures
//                         if (i % 5 === 0) {
//                             console.log(`📊 Progress: ${i + 1}/${Math.min(imageElements.length, 20)} images processed`);
//                         }
//                     }
                    
//                 } catch (error) {
//                     console.warn(`⚠️ Failed to capture image: ${img.src}`, error);
//                 }
//             }
            
//             return images;
//         }

//         async captureImage(imgElement) {
//             const src = imgElement.src;
            
//             // Skip data URLs and invalid sources
//             if (!src || src.startsWith('data:') || this.capturedResources.has(src)) {
//                 return null;
//             }
            
//             try {
//                 // Check if image is visible and has reasonable dimensions
//                 const rect = imgElement.getBoundingClientRect();
//                 if (rect.width < 20 || rect.height < 20) {
//                     return null; // Skip tiny images (likely tracking pixels)
//                 }
                
//                 const response = await fetch(src, { 
//                     method: 'GET',
//                     mode: 'cors',
//                     credentials: 'omit'
//                 });
                
//                 if (!response.ok) {
//                     throw new Error(`HTTP ${response.status}`);
//                 }
                
//                 const blob = await response.blob();
                
//                 // Check file size and type
//                 if (blob.size > this.maxImageSize) {
//                     console.warn(`⚠️ Image too large: ${this.formatBytes(blob.size)} - ${src}`);
//                     return null;
//                 }
                
//                 if (!this.supportedImageTypes.includes(blob.type)) {
//                     console.warn(`⚠️ Unsupported image type: ${blob.type} - ${src}`);
//                     return null;
//                 }
                
//                 const dataUrl = await this.blobToDataURL(blob);
//                 const imageData = {
//                     originalUrl: src,
//                     dataUrl: dataUrl,
//                     type: blob.type,
//                     size: blob.size,
//                     width: imgElement.naturalWidth || imgElement.width,
//                     height: imgElement.naturalHeight || imgElement.height,
//                     alt: imgElement.alt || ''
//                 };
                
//                 this.capturedResources.set(src, imageData);
//                 console.log(`✅ Captured image: ${this.formatBytes(blob.size)} - ${src}`);
                
//                 return imageData;
                
//             } catch (error) {
//                 console.warn(`❌ Failed to capture image: ${src}`, error.message);
//                 return null;
//             }
//         }

//         async captureCSS() {
//             const cssResources = [];
//             const styleSheets = document.styleSheets;
            
//             console.log(`🎨 Found ${styleSheets.length} stylesheets to process`);
            
//             for (let i = 0; i < Math.min(styleSheets.length, 10); i++) { // Limit CSS files
//                 const sheet = styleSheets[i];
                
//                 try {
//                     if (this.totalCapturedSize >= this.maxTotalSize) {
//                         break;
//                     }
                    
//                     const cssData = await this.captureStyleSheet(sheet);
//                     if (cssData) {
//                         cssResources.push(cssData);
//                         this.totalCapturedSize += cssData.size;
//                     }
                    
//                 } catch (error) {
//                     console.warn(`⚠️ Failed to capture stylesheet:`, sheet.href, error);
//                 }
//             }
            
//             // Also capture inline styles
//             const inlineStyles = this.captureInlineStyles();
//             if (inlineStyles.trim().length > 0) {
//                 cssResources.push({
//                     type: 'inline',
//                     content: inlineStyles,
//                     size: new Blob([inlineStyles]).size
//                 });
//             }
            
//             return cssResources;
//         }

//         async captureStyleSheet(sheet) {
//             // Skip non-accessible stylesheets (CORS issues)
//             if (sheet.href && !sheet.href.startsWith(window.location.origin) && 
//                 !sheet.href.includes('fonts.googleapis.com')) {
//                 return null;
//             }
            
//             try {
//                 let cssText = '';
                
//                 if (sheet.cssRules) {
//                     cssText = Array.from(sheet.cssRules)
//                         .map(rule => rule.cssText)
//                         .join('\n');
//                 }
                
//                 if (!cssText.trim()) {
//                     return null;
//                 }
                
//                 return {
//                     href: sheet.href,
//                     type: 'stylesheet',
//                     content: cssText,
//                     size: new Blob([cssText]).size
//                 };
                
//             } catch (error) {
//                 // CORS or security error
//                 console.warn(`⚠️ Cannot access stylesheet: ${sheet.href}`);
//                 return null;
//             }
//         }

//         captureInlineStyles() {
//             const elementsWithStyle = document.querySelectorAll('[style]');
//             const inlineStyles = [];
            
//             elementsWithStyle.forEach((element, index) => {
//                 if (element.style.cssText && index < 100) { // Limit inline styles
//                     inlineStyles.push(`/* Element ${index} */\n${element.style.cssText}`);
//                 }
//             });
            
//             return inlineStyles.join('\n\n');
//         }

//         async captureFonts() {
//             const fonts = [];
            
//             try {
//                 // Get font faces from CSS (basic implementation)
//                 if ('fonts' in document && document.fonts.size > 0) {
//                     const fontFaces = Array.from(document.fonts);
                    
//                     for (const font of fontFaces.slice(0, 5)) { // Limit to 5 fonts
//                         if (font.status === 'loaded') {
//                             fonts.push({
//                                 family: font.family,
//                                 style: font.style,
//                                 weight: font.weight,
//                                 status: font.status
//                             });
//                         }
//                     }
//                 }
                
//                 console.log(`🔤 Captured ${fonts.length} font references`);
                
//             } catch (error) {
//                 console.warn('⚠️ Font capture not supported or failed:', error);
//             }
            
//             return fonts;
//         }

//         // Utility methods
//         blobToDataURL(blob) {
//             return new Promise((resolve, reject) => {
//                 const reader = new FileReader();
//                 reader.onload = () => resolve(reader.result);
//                 reader.onerror = reject;
//                 reader.readAsDataURL(blob);
//             });
//         }

//         formatBytes(bytes) {
//             if (bytes === 0) return '0 Bytes';
//             const k = 1024;
//             const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//             const i = Math.floor(Math.log(bytes) / Math.log(k));
//             return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//         }
//     }

//     // Helper function 2: Content Processor Class
//     class ContentProcessor {
//         constructor() {
//             this.resourceMap = new Map();
//         }

//         processHTMLWithResources(htmlContent, resources = {}) {
//             console.log('🔄 Processing HTML with captured resources...');
            
//             try {
//                 const parser = new DOMParser();
//                 const doc = parser.parseFromString(htmlContent, 'text/html');
                
//                 // Process and replace images
//                 if (resources.images && resources.images.length > 0) {
//                     this.replaceImagesWithDataUrls(doc, resources.images);
//                 }
                
//                 // Inline CSS
//                 if (resources.css && resources.css.length > 0) {
//                     this.inlineCSS(doc, resources.css);
//                 }
                
//                 // Clean up document
//                 this.cleanDocument(doc);
                
//                 // Add offline-friendly base styles
//                 this.addOfflineStyles(doc);
                
//                 const processedHTML = doc.documentElement.outerHTML;
//                 console.log('✅ HTML processing completed');
                
//                 return processedHTML;
                
//             } catch (error) {
//                 console.error('❌ Error processing HTML:', error);
//                 return htmlContent; // Return original on error
//             }
//         }

//         replaceImagesWithDataUrls(doc, images) {
//             console.log('🖼️ Replacing images with data URLs...');
            
//             const imgElements = doc.querySelectorAll('img[src]');
//             let replacedCount = 0;
            
//             imgElements.forEach(img => {
//                 const src = img.getAttribute('src');
//                 const imageData = images.find(imgData => imgData.originalUrl === src);
                
//                 if (imageData && imageData.dataUrl) {
//                     img.setAttribute('src', imageData.dataUrl);
//                     img.setAttribute('data-original-src', src);
                    
//                     // Add responsive attributes
//                     img.style.maxWidth = '100%';
//                     img.style.height = 'auto';
                    
//                     // Add alt text if missing
//                     if (!img.alt && imageData.alt) {
//                         img.alt = imageData.alt;
//                     }
                    
//                     replacedCount++;
//                 } else {
//                     // Remove broken images or add placeholder
//                     img.style.display = 'none';
//                     img.setAttribute('data-failed-src', src);
//                 }
//             });
            
//             console.log(`✅ Replaced ${replacedCount} images with data URLs`);
//         }

//         inlineCSS(doc, cssResources) {
//             console.log('🎨 Inlining CSS resources...');
            
//             // Remove existing external stylesheets
//             const existingLinks = doc.querySelectorAll('link[rel="stylesheet"]');
//             existingLinks.forEach(link => {
//                 // Keep only essential CDN stylesheets
//                 const href = link.href || '';
//                 if (!href.includes('fonts.googleapis.com') && 
//                     !href.includes('cdnjs.cloudflare.com')) {
//                     link.remove();
//                 }
//             });
            
//             // Create and add consolidated stylesheet
//             const consolidatedCSS = cssResources
//                 .map(css => css.content)
//                 .join('\n\n');
                
//             if (consolidatedCSS.trim()) {
//                 const style = doc.createElement('style');
//                 style.textContent = consolidatedCSS;
//                 style.setAttribute('data-offline-bookmarks', 'true');
                
//                 // Insert at the end of head
//                 if (doc.head) {
//                     doc.head.appendChild(style);
//                 }
//             }
            
//             console.log('✅ CSS inlining completed');
//         }

//         cleanDocument(doc) {
//             console.log('🧹 Enhanced document cleaning for better rendering...');
            
//             // Remove ALL external stylesheets for complex sites
//             const allLinks = doc.querySelectorAll('link[rel="stylesheet"]');
//             allLinks.forEach(link => link.remove());
            
//             // Remove ALL style tags from original page
//             const allStyles = doc.querySelectorAll('style');
//             allStyles.forEach(style => style.remove());
            
//             // Remove problematic Google-specific elements
//             const googleElements = [
//                 '[jscontroller]',
//                 '[jsaction]',
//                 '[data-ved]',
//                 '.gb_',
//                 '#gb',
//                 '[role="navigation"]',
//                 '[role="banner"]',
//                 '[role="complementary"]'
//             ];
            
//             googleElements.forEach(selector => {
//                 doc.querySelectorAll(selector).forEach(el => el.remove());
//             });
            
//             // Clean ALL inline styles to prevent conflicts
//             doc.querySelectorAll('*').forEach(element => {
//                 element.removeAttribute('style');
//                 element.removeAttribute('class'); // Remove classes that reference missing CSS
                
//                 // Keep only essential attributes
//                 const keepAttributes = ['href', 'src', 'alt', 'title'];
//                 const attributes = Array.from(element.attributes);
//                 attributes.forEach(attr => {
//                     if (!keepAttributes.includes(attr.name) && 
//                         !attr.name.startsWith('data-original')) {
//                         element.removeAttribute(attr.name);
//                     }
//                 });
//             });
            
//             console.log('✅ Enhanced document cleaning completed');
//         }


//         addOfflineStyles(doc) {
//             const offlineStyles = `
//                 /* Complete CSS Reset for Saved Pages */
//                 * {
//                     margin: 0 !important;
//                     padding: 0 !important;
//                     border: none !important;
//                     background: transparent !important;
//                     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
//                     font-size: inherit !important;
//                     line-height: inherit !important;
//                     color: inherit !important;
//                     text-decoration: none !important;
//                     position: static !important;
//                     float: none !important;
//                     clear: both !important;
//                     z-index: auto !important;
//                     width: auto !important;
//                     height: auto !important;
//                     max-width: 100% !important;
//                     box-sizing: border-box !important;
//                 }
                
//                 body {
//                     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
//                     font-size: 16px !important;
//                     line-height: 1.6 !important;
//                     color: #333 !important;
//                     background: #fff !important;
//                     margin: 0 !important;
//                     padding: 20px !important;
//                     max-width: none !important;
//                 }
                
//                 /* Typography Reset */
//                 h1, h2, h3, h4, h5, h6 {
//                     font-weight: bold !important;
//                     margin-top: 24px !important;
//                     margin-bottom: 12px !important;
//                     line-height: 1.3 !important;
//                 }
                
//                 h1 { font-size: 28px !important; }
//                 h2 { font-size: 24px !important; }
//                 h3 { font-size: 20px !important; }
                
//                 p {
//                     margin-bottom: 16px !important;
//                     line-height: 1.7 !important;
//                 }
                
//                 a {
//                     color: #1a73e8 !important;
//                     text-decoration: underline !important;
//                 }
                
//                 /* Lists */
//                 ul, ol {
//                     margin: 16px 0 !important;
//                     padding-left: 32px !important;
//                 }
                
//                 li {
//                     margin-bottom: 8px !important;
//                 }
                
//                 /* Images */
//                 img {
//                     max-width: 100% !important;
//                     height: auto !important;
//                     display: block !important;
//                     margin: 16px auto !important;
//                 }
                
//                 /* Remove all complex layouts */
//                 div, section, article, aside, nav, header, footer {
//                     display: block !important;
//                     margin: 8px 0 !important;
//                 }
                
//                 /* Hide problematic elements */
//                 script, style, link, meta, noscript {
//                     display: none !important;
//                 }
//             `;
            
//             const style = doc.createElement('style');
//             style.textContent = offlineStyles;
//             style.setAttribute('data-offline-bookmarks-reset', 'true');
            
//             // Insert at the very beginning of head to ensure priority
//             if (doc.head) {
//                 doc.head.insertBefore(style, doc.head.firstChild);
//             } else {
//                 const head = doc.createElement('head');
//                 head.appendChild(style);
//                 doc.documentElement.insertBefore(head, doc.body);
//             }
//         }

//         // Add this to your ContentProcessor class
//         extractMainContent(doc) {
//             console.log('📖 Extracting main content for better readability...');
            
//             // For Google search, focus on search results
//             let mainContent = doc.querySelector('#search') || 
//                             doc.querySelector('#main') || 
//                             doc.querySelector('[role="main"]');
            
//             if (!mainContent) {
//                 // Fallback: look for the largest content block
//                 const contentBlocks = Array.from(doc.querySelectorAll('div'))
//                     .filter(div => div.textContent.trim().length > 100)
//                     .sort((a, b) => b.textContent.length - a.textContent.length);
                
//                 mainContent = contentBlocks[0];
//             }
            
//             if (mainContent) {
//                 // Create a new clean document with just the main content
//                 const newDoc = document.implementation.createHTMLDocument('Extracted Content');
//                 const newBody = newDoc.body;
                
//                 // Copy only the main content
//                 newBody.appendChild(mainContent.cloneNode(true));
                
//                 return newDoc;
//             }
            
//             return doc;
//         }
//     }

//     // Helper function 3: Create result object
//     const createResult = (success, data = {}) => {
//         const result = {
//             html: data.html || '',
//             favicon: data.favicon || '',
//             title: data.title || document?.title || 'Untitled',
//             url: data.url || window?.location?.href || '',
//             resources: data.resources || {},
//             success: success,
//             error: data.error || null
//         };
//         console.log('📦 Creating enhanced result object:', {
//             success: result.success,
//             hasHtml: !!result.html,
//             resourceCount: Object.keys(result.resources).length
//         });
//         return result;
//     };
    
//     // MAIN ENHANCED CAPTURE LOGIC
//     try {
//         if (!document || !document.documentElement) {
//             return createResult(false, { error: 'No document available' });
//         }
        
//         if (document.readyState === 'loading') {
//             return createResult(false, {
//                 error: 'Document still loading',
//                 html: document.documentElement.outerHTML || ''
//             });
//         }
        
//         const pageTitle = document.title || 'Untitled';
//         const pageUrl = window.location.href || '';
//         console.log('📄 Processing enhanced page:', pageTitle);
        
//         // Get basic HTML content
//         let htmlContent = document.documentElement.outerHTML;
//         if (!htmlContent) {
//             throw new Error('outerHTML is empty');
//         }
        
//         // Get favicon
//         let faviconUrl = '';
//         try {
//             const faviconElement = document.querySelector('link[rel*="icon"]');
//             if (faviconElement && faviconElement.href) {
//                 faviconUrl = faviconElement.href;
//             }
//         } catch (faviconError) {
//             console.warn('⚠️ Error getting favicon:', faviconError);
//         }
        
//         // ENHANCED: Capture resources
//         const resourceCapture = new ResourceCapture({
//             maxImageSize: 5 * 1024 * 1024,  // 5MB per image
//             maxTotalSize: 30 * 1024 * 1024  // 30MB total (reduced for stability)
//         });
        
//         const resources = await resourceCapture.capturePageResources();
        
//         // ENHANCED: Process content with resources
//         const contentProcessor = new ContentProcessor();
//         const processedHTML = contentProcessor.processHTMLWithResources(htmlContent, resources);
        
//         const finalResult = createResult(true, {
//             html: processedHTML,
//             favicon: faviconUrl,
//             title: pageTitle,
//             url: pageUrl,
//             resources: resources
//         });
        
//         console.log('✅ Enhanced content capture completed successfully');
//         console.log('📊 Capture summary:', {
//             htmlSize: Math.round(finalResult.html.length / 1024) + ' KB',
//             images: resources.images?.length || 0,
//             cssFiles: resources.css?.length || 0,
//             totalResourceSize: resourceCapture.formatBytes(resources.totalSize || 0)
//         });
        
//         return finalResult;
        
//     } catch (error) {
//         console.error('❌ Critical error in enhanced content capture:', error);
//         return createResult(false, {
//             error: error.message || 'Unknown error in enhanced content capture',
//             html: document?.documentElement?.outerHTML || '<html><body><p>Error occurred</p></body></html>',
//             title: document?.title || 'Error',
//             url: window?.location?.href || ''
//         });
//     }
// }

// // Fallback basic capture function (from your existing code)
// function capturePageContent() {
//     console.log('Content capture started...');
    
//     // Helper function 1: Clean content for offline reading
//     function cleanContentForOfflineReading(htmlContent) {
//         try {
//             const parser = new DOMParser();
//             const doc = parser.parseFromString(htmlContent, 'text/html');
            
//             if (!doc || !doc.documentElement) {
//                 return htmlContent;
//             }
            
//             // Remove problematic elements
//             const elementsToRemove = [
//                 'script',
//                 'iframe',
//                 'embed',
//                 'object',
//                 'form',
//                 'input',
//                 'button[type="button"]',
//                 'nav',
//                 '.navigation',
//                 '.nav',
//                 '.menu',
//                 '.sidebar',
//                 '.comments',
//                 '.comment',
//                 '.advertisement',
//                 '.ads',
//                 '.social-share',
//                 '.share-buttons',
//                 'header',
//                 'footer',
//                 '.header',
//                 '.footer'
//             ];
            
//             elementsToRemove.forEach(selector => {
//                 doc.querySelectorAll(selector).forEach(el => el.remove());
//             });
            
//             // Clean up problematic CSS
//             cleanupStyles(doc);
            
//             // Fix images for offline viewing
//             processImages(doc);
            
//             // Convert relative URLs to absolute
//             convertRelativeUrls(doc, window.location.href);
            
//             return doc.documentElement.outerHTML;
            
//         } catch (cleanError) {
//             console.warn('Error cleaning HTML:', cleanError);
//             // Fallback: simple script removal
//             return htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
//         }
//     }

//     // Helper function 2: Cleanup styles
//     function cleanupStyles(doc) {
//         // Remove external stylesheets to prevent conflicts
//         doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
//             const href = link.href || '';
//             if (!href.includes('fonts.googleapis.com') && !href.includes('cdnjs.cloudflare.com')) {
//                 link.remove();
//             }
//         });
        
//         // Clean up problematic inline styles
//         doc.querySelectorAll('*').forEach(element => {
//             if (element.style) {
//                 // Remove fixed positioning and z-index that can break layout
//                 element.style.position = '';
//                 element.style.zIndex = '';
                
//                 // Remove fixed widths that break responsive design
//                 if (element.style.width && element.style.width.includes('px')) {
//                     element.style.width = '';
//                 }
                
//                 // Clean up problematic backgrounds
//                 if (element.style.background && element.style.background.includes('url(')) {
//                     element.style.background = '';
//                 }
//             }
//         });
        
//         // Add a base stylesheet for consistent styling
//         const baseStyle = doc.createElement('style');
//         baseStyle.textContent = `
//             body {
//                 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
//                 line-height: 1.6 !important;
//                 max-width: none !important;
//                 margin: 0 !important;
//                 padding: 20px !important;
//             }
            
//             img {
//                 max-width: 100% !important;
//                 height: auto !important;
//             }
            
//             pre, code {
//                 overflow-x: auto !important;
//             }
            
//             table {
//                 width: 100% !important;
//                 overflow-x: auto !important;
//             }
            
//             * {
//                 box-sizing: border-box !important;
//             }
            
//             .fixed, .sticky {
//                 position: static !important;
//             }
//         `;
//         doc.head.appendChild(baseStyle);
//     }

//     // Helper function 3: Process images
//     function processImages(doc) {
//         doc.querySelectorAll('img').forEach(img => {
//             if (img.src && !img.src.startsWith('data:')) {
//                 // Ensure images are responsive
//                 img.style.maxWidth = '100%';
//                 img.style.height = 'auto';
                
//                 // Add error handling
//                 img.setAttribute('onerror', 'this.style.display="none"');
//             }
//         });
//     }

//     // Helper function 4: Convert relative URLs
//     function convertRelativeUrls(doc, baseUrl) {
//         try {
//             const baseUrlObj = new URL(baseUrl);
            
//             doc.querySelectorAll('a[href]').forEach(link => {
//                 try {
//                     if (!link.href.startsWith('http') && !link.href.startsWith('mailto:')) {
//                         link.href = new URL(link.href, baseUrlObj).href;
//                     }
//                 } catch (e) {
//                     // Invalid URL, leave as is
//                 }
//             });
            
//             doc.querySelectorAll('img[src]').forEach(img => {
//                 try {
//                     if (!img.src.startsWith('http') && !img.src.startsWith('data:')) {
//                         img.src = new URL(img.src, baseUrlObj).href;
//                     }
//                 } catch (e) {
//                     // Invalid URL, leave as is
//                 }
//             });
//         } catch (e) {
//             console.warn('Error converting relative URLs:', e);
//         }
//     }

//     // Helper function 5: Create result object
//     const createResult = (success, data = {}) => {
//         const result = {
//             html: data.html || '',
//             favicon: data.favicon || '',
//             title: data.title || document?.title || 'Untitled',
//             url: data.url || window?.location?.href || '',
//             success: success,
//             error: data.error || null
//         };
//         console.log('Creating result object:', result);
//         return result;
//     };
    
//     // MAIN BASIC CAPTURE LOGIC
//     try {
//         if (!document || !document.documentElement) {
//             return createResult(false, { error: 'No document available' });
//         }
        
//         if (document.readyState === 'loading') {
//             return createResult(false, {
//                 error: 'Document still loading',
//                 html: document.documentElement.outerHTML || ''
//             });
//         }
        
//         const pageTitle = document.title || 'Untitled';
//         const pageUrl = window.location.href || '';
//         console.log('Capturing content for:', pageTitle);
        
//         // Get HTML content
//         let htmlContent = document.documentElement.outerHTML;
//         if (!htmlContent) {
//             throw new Error('outerHTML is empty');
//         }
//         console.log('HTML captured, length:', htmlContent.length);
        
//         // Get favicon
//         let faviconUrl = '';
//         try {
//             const faviconElement = document.querySelector('link[rel*="icon"]');
//             if (faviconElement && faviconElement.href) {
//                 faviconUrl = faviconElement.href;
//             }
//         } catch (faviconError) {
//             console.warn('Error getting favicon:', faviconError);
//         }
        
//         // Enhanced content cleaning using nested helper function
//         let cleanHtml = cleanContentForOfflineReading(htmlContent);
//         console.log('Content cleaned, new length:', cleanHtml.length);
        
//         const finalResult = createResult(true, {
//             html: cleanHtml,
//             favicon: faviconUrl,
//             title: pageTitle,
//             url: pageUrl
//         });
        
//         console.log('Content capture completed successfully');
//         return finalResult;
        
//     } catch (error) {
//         console.error('Critical error in content capture:', error);
//         return createResult(false, {
//             error: error.message || 'Unknown error in content capture',
//             html: document?.documentElement?.outerHTML || '<html><body><p>Error occurred</p></body></html>',
//             title: document?.title || 'Error',
//             url: window?.location?.href || ''
//         });
//     }
// }

// // Background service worker class (enhanced)
// class OfflineBookmarkBackground {
//     constructor() {
//         this.storage = null;
//         this.enhancedCaptureEnabled = true; // Feature flag for enhanced capture
//         this.init();
//     }

//     async init() {
//         try {
//             this.storage = new OfflineBookmarkStorage();
            
//             chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//                 this.handleMessage(request, sender, sendResponse);
//                 return true;
//             });

//             console.log('🚀 Enhanced Offline Bookmark Manager background script initialized');
//         } catch (error) {
//             console.error('❌ Error initializing background script:', error);
//         }
//     }

//     async handleMessage(request, sender, sendResponse) {
//         try {
//             switch (request.action) {
//                 case 'savePage':
//                     await this.handleSavePage(request, sender, sendResponse);
//                     break;
//                 case 'getPage':
//                     await this.handleGetPage(request, sender, sendResponse);
//                     break;
//                 case 'getAllPages':
//                     await this.handleGetAllPages(request, sender, sendResponse);
//                     break;
//                 case 'deletePage':
//                     await this.handleDeletePage(request, sender, sendResponse);
//                     break;
//                 case 'toggleEnhancedCapture':
//                     this.enhancedCaptureEnabled = !this.enhancedCaptureEnabled;
//                     sendResponse({ 
//                         success: true, 
//                         enhancedCapture: this.enhancedCaptureEnabled 
//                     });
//                     break;
//                 default:
//                     sendResponse({ success: false, error: 'Unknown action' });
//             }
//         } catch (error) {
//             console.error('Error handling message:', error);
//             sendResponse({ success: false, error: error.message });
//         }
//     }

//     isPageSaveable(url) {
//         const unsaveablePatterns = [
//             /^chrome:\/\//,
//             /^chrome-extension:\/\//,
//             /^moz-extension:\/\//,
//             /^about:/,
//             /^file:/,
//             /^data:/,
//             /^blob:/
//         ];
        
//         return !unsaveablePatterns.some(pattern => pattern.test(url));
//     }

//     async handleSavePage(request, sender, sendResponse) {
//         try {
//             const { tab } = request;
//             console.log('📥 Starting enhanced page save for tab:', tab);
            
//             if (!tab || !tab.id) {
//                 throw new Error('Invalid tab information');
//             }
            
//             if (!this.isPageSaveable(tab.url)) {
//                 throw new Error('This type of page cannot be saved');
//             }
            
//             console.log('💉 Injecting content script...');
            
//             // Choose capture method based on feature flag
//             const captureFunction = this.enhancedCaptureEnabled ? 
//                 capturePageContentEnhanced : 
//                 capturePageContent;
            
//             console.log(`🔄 Using ${this.enhancedCaptureEnabled ? 'enhanced' : 'basic'} capture mode`);
            
//             const results = await chrome.scripting.executeScript({
//                 target: { tabId: tab.id },
//                 function: captureFunction
//             });
            
//             console.log('📤 Script results:', results);
            
//             if (!results || results.length === 0) {
//                 throw new Error('Script execution returned no results');
//             }
            
//             const scriptResult = results[0];
//             if (!scriptResult) {
//                 throw new Error('Script result is undefined');
//             }
            
//             const capturedContent = scriptResult.result;
            
//             if (capturedContent === null || capturedContent === undefined) {
//                 throw new Error('Content capture returned null/undefined');
//             }
            
//             console.log('✅ Captured content structure:', {
//                 hasHtml: !!capturedContent.html,
//                 hasTitle: !!capturedContent.title,
//                 hasUrl: !!capturedContent.url,
//                 hasResources: !!capturedContent.resources,
//                 resourceSummary: capturedContent.resources ? {
//                     images: capturedContent.resources.images?.length || 0,
//                     css: capturedContent.resources.css?.length || 0,
//                     fonts: capturedContent.resources.fonts?.length || 0,
//                     totalSize: capturedContent.resources.totalSize || 0
//                 } : null,
//                 success: capturedContent.success,
//                 error: capturedContent.error
//             });
            
//             if (!capturedContent.success) {
//                 throw new Error(`Content capture failed: ${capturedContent.error || 'Unknown error'}`);
//             }
            
//             if (!capturedContent.html || capturedContent.html.trim() === '') {
//                 throw new Error('No HTML content captured');
//             }
            
//             // Enhanced page data with resources
//             const pageData = {
//                 url: capturedContent.url || tab.url,
//                 title: capturedContent.title || tab.title || 'Untitled',
//                 content: capturedContent.html,
//                 favicon: capturedContent.favicon || '',
//                 resources: capturedContent.resources || {}, // NEW: Store resources
//                 captureType: this.enhancedCaptureEnabled ? 'enhanced' : 'basic', // NEW: Track capture type
//                 resourceSize: this.calculateResourceSize(capturedContent.resources) // NEW: Resource size
//             };
            
//             console.log('💾 Saving enhanced page data:', {
//                 url: pageData.url,
//                 title: pageData.title,
//                 contentLength: Math.round(pageData.content.length / 1024) + ' KB',
//                 hasResources: Object.keys(pageData.resources).length > 0,
//                 captureType: pageData.captureType,
//                 resourceSize: this.formatBytes(pageData.resourceSize)
//             });
            
//             const result = await this.storage.savePage(pageData);
//             console.log('✅ Enhanced page saved successfully');
            
//             sendResponse({ 
//                 success: true, 
//                 enhanced: this.enhancedCaptureEnabled,
//                 resourceStats: capturedContent.resources,
//                 captureType: pageData.captureType,
//                 ...result 
//             });
            
//         } catch (error) {
//             console.error('❌ Error in enhanced handleSavePage:', error);
            
//             // Fallback to basic capture if enhanced fails
//             if (this.enhancedCaptureEnabled && error.message.includes('enhanced')) {
//                 console.log('⚠️ Falling back to basic capture...');
//                 this.enhancedCaptureEnabled = false;
//                 return this.handleSavePage(request, sender, sendResponse);
//             }
            
//             sendResponse({ success: false, error: error.message });
//         }
//     }

//     calculateResourceSize(resources) {
//         if (!resources || typeof resources !== 'object') {
//             return 0;
//         }
        
//         let totalSize = 0;
        
//         // Calculate image sizes
//         if (resources.images && Array.isArray(resources.images)) {
//             totalSize += resources.images.reduce((sum, img) => sum + (img.size || 0), 0);
//         }
        
//         // Calculate CSS sizes
//         if (resources.css && Array.isArray(resources.css)) {
//             totalSize += resources.css.reduce((sum, css) => sum + (css.size || 0), 0);
//         }
        
//         return totalSize;
//     }

//     formatBytes(bytes) {
//         if (bytes === 0) return '0 Bytes';
//         const k = 1024;
//         const sizes = ['Bytes', 'KB', 'MB', 'GB'];
//         const i = Math.floor(Math.log(bytes) / Math.log(k));
//         return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
//     }

//     async handleGetPage(request, sender, sendResponse) {
//         try {
//             const page = await this.storage.getPage(request.id);
//             sendResponse({ success: true, page });
//         } catch (error) {
//             sendResponse({ success: false, error: error.message });
//         }
//     }

//     async handleGetAllPages(request, sender, sendResponse) {
//         try {
//             const pages = await this.storage.getAllPages(request.limit, request.offset);
//             sendResponse({ success: true, pages });
//         } catch (error) {
//             sendResponse({ success: false, error: error.message });
//         }
//     }

//     async handleDeletePage(request, sender, sendResponse) {
//         try {
//             await this.storage.deletePage(request.id);
//             sendResponse({ success: true });
//         } catch (error) {
//             sendResponse({ success: false, error: error.message });
//         }
//     }
// }

// // Initialize enhanced background script
// const backgroundScript = new OfflineBookmarkBackground();

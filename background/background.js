// Import required dependencies using importScripts
importScripts('../lib/dexie.min.js', '../storage/storage.js');

// This function will be injected into the page to capture content
// ALL HELPER FUNCTIONS MUST BE DEFINED INSIDE THIS FUNCTION
function capturePageContent() {
    console.log('Content capture started...');
    
    // Helper function 1: Clean content for offline reading
    function cleanContentForOfflineReading(htmlContent) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            if (!doc || !doc.documentElement) {
                return htmlContent;
            }
            
            // Remove problematic elements
            const elementsToRemove = [
                'script',
                'iframe',
                'embed',
                'object',
                'form',
                'input',
                'button[type="button"]',
                'nav',
                '.navigation',
                '.nav',
                '.menu',
                '.sidebar',
                '.comments',
                '.comment',
                '.advertisement',
                '.ads',
                '.social-share',
                '.share-buttons',
                'header',
                'footer',
                '.header',
                '.footer'
            ];
            
            elementsToRemove.forEach(selector => {
                doc.querySelectorAll(selector).forEach(el => el.remove());
            });
            
            // Clean up problematic CSS
            cleanupStyles(doc);
            
            // Fix images for offline viewing
            processImages(doc);
            
            // Convert relative URLs to absolute
            convertRelativeUrls(doc, window.location.href);
            
            return doc.documentElement.outerHTML;
            
        } catch (cleanError) {
            console.warn('Error cleaning HTML:', cleanError);
            // Fallback: simple script removal
            return htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
        }
    }

    // Helper function 2: Cleanup styles
    function cleanupStyles(doc) {
        // Remove external stylesheets to prevent conflicts
        doc.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
            const href = link.href || '';
            if (!href.includes('fonts.googleapis.com') && !href.includes('cdnjs.cloudflare.com')) {
                link.remove();
            }
        });
        
        // Clean up problematic inline styles
        doc.querySelectorAll('*').forEach(element => {
            if (element.style) {
                // Remove fixed positioning and z-index that can break layout
                element.style.position = '';
                element.style.zIndex = '';
                
                // Remove fixed widths that break responsive design
                if (element.style.width && element.style.width.includes('px')) {
                    element.style.width = '';
                }
                
                // Clean up problematic backgrounds
                if (element.style.background && element.style.background.includes('url(')) {
                    element.style.background = '';
                }
            }
        });
        
        // Add a base stylesheet for consistent styling
        const baseStyle = doc.createElement('style');
        baseStyle.textContent = `
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                line-height: 1.6 !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 20px !important;
            }
            
            img {
                max-width: 100% !important;
                height: auto !important;
            }
            
            pre, code {
                overflow-x: auto !important;
            }
            
            table {
                width: 100% !important;
                overflow-x: auto !important;
            }
            
            * {
                box-sizing: border-box !important;
            }
            
            .fixed, .sticky {
                position: static !important;
            }
        `;
        doc.head.appendChild(baseStyle);
    }

    // Helper function 3: Process images
    function processImages(doc) {
        doc.querySelectorAll('img').forEach(img => {
            if (img.src && !img.src.startsWith('data:')) {
                // Ensure images are responsive
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                
                // Add error handling
                img.setAttribute('onerror', 'this.style.display="none"');
            }
        });
    }

    // Helper function 4: Convert relative URLs
    function convertRelativeUrls(doc, baseUrl) {
        try {
            const baseUrlObj = new URL(baseUrl);
            
            doc.querySelectorAll('a[href]').forEach(link => {
                try {
                    if (!link.href.startsWith('http') && !link.href.startsWith('mailto:')) {
                        link.href = new URL(link.href, baseUrlObj).href;
                    }
                } catch (e) {
                    // Invalid URL, leave as is
                }
            });
            
            doc.querySelectorAll('img[src]').forEach(img => {
                try {
                    if (!img.src.startsWith('http') && !img.src.startsWith('data:')) {
                        img.src = new URL(img.src, baseUrlObj).href;
                    }
                } catch (e) {
                    // Invalid URL, leave as is
                }
            });
        } catch (e) {
            console.warn('Error converting relative URLs:', e);
        }
    }

    // Helper function 5: Create result object
    const createResult = (success, data = {}) => {
        const result = {
            html: data.html || '',
            favicon: data.favicon || '',
            title: data.title || document?.title || 'Untitled',
            url: data.url || window?.location?.href || '',
            success: success,
            error: data.error || null
        };
        console.log('Creating result object:', result);
        return result;
    };
    
    // MAIN CAPTURE LOGIC STARTS HERE
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
        console.log('Capturing content for:', pageTitle);
        
        // Get HTML content
        let htmlContent = document.documentElement.outerHTML;
        if (!htmlContent) {
            throw new Error('outerHTML is empty');
        }
        console.log('HTML captured, length:', htmlContent.length);
        
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
        
        // Enhanced content cleaning using nested helper function
        let cleanHtml = cleanContentForOfflineReading(htmlContent);
        console.log('Content cleaned, new length:', cleanHtml.length);
        
        const finalResult = createResult(true, {
            html: cleanHtml,
            favicon: faviconUrl,
            title: pageTitle,
            url: pageUrl
        });
        
        console.log('Content capture completed successfully');
        return finalResult;
        
    } catch (error) {
        console.error('Critical error in content capture:', error);
        return createResult(false, {
            error: error.message || 'Unknown error in content capture',
            html: document?.documentElement?.outerHTML || '<html><body><p>Error occurred</p></body></html>',
            title: document?.title || 'Error',
            url: window?.location?.href || ''
        });
    }
}

// Background service worker class (unchanged)
class OfflineBookmarkBackground {
    constructor() {
        this.storage = null;
        this.init();
    }

    async init() {
        try {
            this.storage = new OfflineBookmarkStorage();
            
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
                return true;
            });

            console.log('Offline Bookmark Manager background script initialized');
        } catch (error) {
            console.error('Error initializing background script:', error);
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
            console.log('Starting page save for tab:', tab);
            
            if (!tab || !tab.id) {
                throw new Error('Invalid tab information');
            }
            
            if (!this.isPageSaveable(tab.url)) {
                throw new Error('This type of page cannot be saved');
            }
            
            console.log('Executing content script...');
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                function: capturePageContent // This now includes all helper functions
            });
            
            console.log('Raw script results:', results);
            
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
            
            console.log('Captured content structure:', {
                hasHtml: !!capturedContent.html,
                hasTitle: !!capturedContent.title,
                hasUrl: !!capturedContent.url,
                success: capturedContent.success,
                error: capturedContent.error
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
                favicon: capturedContent.favicon || ''
            };
            
            console.log('Saving page data:', {
                url: pageData.url,
                title: pageData.title,
                contentLength: pageData.content.length,
                hasFavicon: !!pageData.favicon
            });
            
            const result = await this.storage.savePage(pageData);
            console.log('Page saved successfully');
            
            sendResponse({ success: true, ...result });
            
        } catch (error) {
            console.error('Error in handleSavePage:', error);
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

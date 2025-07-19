// Import required dependencies using importScripts
importScripts('../lib/dexie.min.js', '../storage/storage.js');

// This function will be injected into the page to capture content
function capturePageContent() {
  console.log('Content capture started...');
  
  // Ensure we always return an object, never null
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
  
  try {
      // Basic validation
      if (!document) {
          console.error('No document available');
          return createResult(false, { error: 'No document available' });
      }
      
      if (!document.documentElement) {
          console.error('No documentElement available');
          return createResult(false, { error: 'No documentElement available' });
      }
      
      // Check readiness
      if (document.readyState === 'loading') {
          console.warn('Document still loading');
          return createResult(false, {
              error: 'Document still loading',
              html: document.documentElement.outerHTML || ''
          });
      }
      
      // Get basic info first
      const pageTitle = document.title || 'Untitled';
      const pageUrl = window.location.href || '';
      console.log('Capturing content for:', pageTitle);
      
      // Get HTML content
      let htmlContent = '';
      try {
          htmlContent = document.documentElement.outerHTML;
          if (!htmlContent) {
              throw new Error('outerHTML is empty');
          }
          console.log('HTML captured, length:', htmlContent.length);
      } catch (htmlError) {
          console.error('Error getting HTML:', htmlError);
          return createResult(false, {
              error: 'Failed to get HTML: ' + htmlError.message,
              title: pageTitle,
              url: pageUrl
          });
      }
      
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
      
      // Clean HTML (simplified for debugging)
      let cleanHtml = htmlContent;
      try {
          // Simple script removal using string replacement
          cleanHtml = htmlContent.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
          console.log('HTML cleaned, removed scripts');
      } catch (cleanError) {
          console.warn('Error cleaning HTML:', cleanError);
          // Use original HTML if cleaning fails
          cleanHtml = htmlContent;
      }
      
      // Create and return final result - THIS WAS MISSING!
      const finalResult = createResult(true, {
          html: cleanHtml,
          favicon: faviconUrl,
          title: pageTitle,
          url: pageUrl
      });
      
      console.log('Content capture completed successfully, returning:', {
          hasHtml: !!finalResult.html,
          htmlLength: finalResult.html.length,
          title: finalResult.title,
          success: finalResult.success
      });
      
      return finalResult;
      
  } catch (error) {
      console.error('Critical error in content capture:', error);
      
      // Ensure we never return null, even on error
      const errorResult = createResult(false, {
          error: error.message || 'Unknown error in content capture',
          html: document?.documentElement?.outerHTML || '<html><body><p>Error occurred</p></body></html>',
          title: document?.title || 'Error',
          url: window?.location?.href || ''
      });
      
      console.log('Returning error result:', errorResult);
      return errorResult;
  }
}



// Background service worker for Offline Bookmark Manager
class OfflineBookmarkBackground {
    constructor() {
        this.storage = null;
        this.init();
    }

    async init() {
        try {
            // Initialize storage - OfflineBookmarkStorage is now available
            this.storage = new OfflineBookmarkStorage();
            
            // Set up message listeners
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                this.handleMessage(request, sender, sendResponse);
                return true; // Indicates we will send response asynchronously
            });

            console.log('Offline Bookmark Manager background script initialized');
        } catch (error) {
            console.error('Error initializing background script:', error);
        }
    }

    // Rest of your existing background script code...
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
          
          // Validate tab
          if (!tab || !tab.id) {
              throw new Error('Invalid tab information');
          }
          
          if (!this.isPageSaveable(tab.url)) {
              throw new Error('This type of page cannot be saved');
          }
          
          // Execute content script
          console.log('Executing content script...');
          const results = await chrome.scripting.executeScript({
              target: { tabId: tab.id },
              function: capturePageContent
          });
          
          console.log('Raw script results:', results);
          
          // Enhanced result validation
          if (!results || results.length === 0) {
              throw new Error('Script execution returned no results');
          }
          
          const scriptResult = results[0];
          if (!scriptResult) {
              throw new Error('Script result is undefined');
          }
          
          const capturedContent = scriptResult.result;
          
          // This should never be null with the new content capture function
          if (capturedContent === null || capturedContent === undefined) {
              throw new Error('Content capture returned null/undefined - check content script for errors');
          }
          
          console.log('Captured content structure:', {
              hasHtml: !!capturedContent.html,
              hasTitle: !!capturedContent.title,
              hasUrl: !!capturedContent.url,
              success: capturedContent.success,
              error: capturedContent.error
          });
          
          // Check if capture failed
          if (!capturedContent.success) {
              throw new Error(`Content capture failed: ${capturedContent.error || 'Unknown error'}`);
          }
          
          // Validate required fields
          if (!capturedContent.html || capturedContent.html.trim() === '') {
              throw new Error('No HTML content captured');
          }
          
          // Prepare page data
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
          
          // Save to storage
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

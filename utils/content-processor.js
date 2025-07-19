// Advanced Content Processing for Offline Reading
class ContentProcessor {
    constructor() {
        this.resourceMap = new Map();
    }

    processHTMLWithResources(htmlContent, resources = {}) {
        console.log('🔄 Processing HTML with captured resources...');
        
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlContent, 'text/html');
            
            // Process and replace images
            if (resources.images && resources.images.length > 0) {
                this.replaceImagesWithDataUrls(doc, resources.images);
            }
            
            // Inline CSS
            if (resources.css && resources.css.length > 0) {
                this.inlineCSS(doc, resources.css);
            }
            
            // Clean up document
            this.cleanDocument(doc);
            
            // Add offline-friendly base styles
            this.addOfflineStyles(doc);
            
            const processedHTML = doc.documentElement.outerHTML;
            console.log('✅ HTML processing completed');
            
            return processedHTML;
            
        } catch (error) {
            console.error('❌ Error processing HTML:', error);
            return htmlContent; // Return original on error
        }
    }

    replaceImagesWithDataUrls(doc, images) {
        console.log('🖼️ Replacing images with data URLs...');
        
        const imgElements = doc.querySelectorAll('img[src]');
        let replacedCount = 0;
        
        imgElements.forEach(img => {
            const src = img.getAttribute('src');
            const imageData = images.find(img => img.originalUrl === src);
            
            if (imageData && imageData.dataUrl) {
                img.setAttribute('src', imageData.dataUrl);
                img.setAttribute('data-original-src', src);
                
                // Add responsive attributes
                img.style.maxWidth = '100%';
                img.style.height = 'auto';
                
                // Add alt text if missing
                if (!img.alt && imageData.alt) {
                    img.alt = imageData.alt;
                }
                
                replacedCount++;
            } else {
                // Remove broken images or add placeholder
                img.style.display = 'none';
                img.setAttribute('data-failed-src', src);
            }
        });
        
        console.log(`✅ Replaced ${replacedCount} images with data URLs`);
    }

    inlineCSS(doc, cssResources) {
        console.log('🎨 Inlining CSS resources...');
        
        // Remove existing external stylesheets
        const existingLinks = doc.querySelectorAll('link[rel="stylesheet"]');
        existingLinks.forEach(link => {
            // Keep only essential CDN stylesheets
            const href = link.href;
            if (!href.includes('fonts.googleapis.com') && 
                !href.includes('cdnjs.cloudflare.com')) {
                link.remove();
            }
        });
        
        // Create and add consolidated stylesheet
        const consolidatedCSS = cssResources
            .map(css => css.content)
            .join('\n\n');
            
        if (consolidatedCSS.trim()) {
            const style = doc.createElement('style');
            style.textContent = consolidatedCSS;
            style.setAttribute('data-offline-bookmarks', 'true');
            
            // Insert at the end of head
            if (doc.head) {
                doc.head.appendChild(style);
            }
        }
        
        console.log('✅ CSS inlining completed');
    }

    cleanDocument(doc) {
        console.log('🧹 Cleaning document for offline reading...');
        
        // Remove problematic elements
        const elementsToRemove = [
            'script:not([data-offline-keep])',
            'noscript',
            'iframe:not([src*="youtube"]):not([src*="vimeo"])', // Keep video embeds
            'embed:not([type="application/pdf"])', // Keep PDF embeds
            'object',
            'form:not(.offline-keep)',
            'input:not(.offline-keep)',
            'button:not(.offline-keep)',
            '[onclick]',
            '[onload]',
            '.advertisement',
            '.ads',
            '.social-share',
            '.comments:not(.offline-keep)',
            'nav:not(.offline-keep)',
            'header:not(.offline-keep)',
            'footer:not(.offline-keep)',
            '.sidebar:not(.offline-keep)'
        ];
        
        elementsToRemove.forEach(selector => {
            doc.querySelectorAll(selector).forEach(el => {
                console.log(`🗑️ Removing element: ${el.tagName.toLowerCase()}`);
                el.remove();
            });
        });
        
        // Clean attributes that might cause issues
        doc.querySelectorAll('*').forEach(el => {
            // Remove event handlers
            const attributes = Array.from(el.attributes);
            attributes.forEach(attr => {
                if (attr.name.startsWith('on')) {
                    el.removeAttribute(attr.name);
                }
            });
            
            // Fix problematic styles
            if (el.style) {
                // Remove fixed positioning
                if (el.style.position === 'fixed' || el.style.position === 'sticky') {
                    el.style.position = 'static';
                }
                
                // Remove high z-indexes
                if (parseInt(el.style.zIndex) > 1000) {
                    el.style.zIndex = 'auto';
                }
            }
        });
        
        console.log('✅ Document cleaning completed');
    }

    addOfflineStyles(doc) {
        const offlineStyles = `
            /* Offline Bookmark Manager - Enhanced Styles */
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                line-height: 1.6 !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 20px !important;
                color: #333 !important;
                background: #fff !important;
            }
            
            /* Responsive images */
            img {
                max-width: 100% !important;
                height: auto !important;
                display: block !important;
                margin: 16px auto !important;
            }
            
            /* Better typography */
            h1, h2, h3, h4, h5, h6 {
                margin-top: 24px !important;
                margin-bottom: 12px !important;
                line-height: 1.3 !important;
            }
            
            p {
                margin-bottom: 16px !important;
            }
            
            /* Code blocks */
            pre, code {
                background: #f5f5f5 !important;
                border: 1px solid #ddd !important;
                border-radius: 4px !important;
                font-family: 'Courier New', monospace !important;
                overflow-x: auto !important;
            }
            
            pre {
                padding: 16px !important;
                margin: 16px 0 !important;
            }
            
            code {
                padding: 2px 6px !important;
            }
            
            /* Tables */
            table {
                border-collapse: collapse !important;
                width: 100% !important;
                margin: 16px 0 !important;
                overflow-x: auto !important;
                display: block !important;
                white-space: nowrap !important;
            }
            
            th, td {
                border: 1px solid #ddd !important;
                padding: 8px 12px !important;
                text-align: left !important;
            }
            
            th {
                background: #f5f5f5 !important;
                font-weight: bold !important;
            }
            
            /* Lists */
            ul, ol {
                margin: 16px 0 !important;
                padding-left: 32px !important;
            }
            
            li {
                margin-bottom: 8px !important;
            }
            
            /* Blockquotes */
            blockquote {
                border-left: 4px solid #1a73e8 !important;
                padding-left: 16px !important;
                margin: 16px 0 !important;
                font-style: italic !important;
                color: #666 !important;
            }
            
            /* Links */
            a {
                color: #1a73e8 !important;
                text-decoration: underline !important;
            }
            
            a:hover {
                text-decoration: none !important;
            }
            
            /* Remove problematic positioning */
            * {
                position: static !important;
                z-index: auto !important;
                max-width: 100% !important;
                box-sizing: border-box !important;
            }
            
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
                body {
                    background: #1a1a1a !important;
                    color: #e0e0e0 !important;
                }
                
                h1, h2, h3, h4, h5, h6 {
                    color: #ffffff !important;
                }
                
                pre, code {
                    background: #2d2d2d !important;
                    color: #e0e0e0 !important;
                    border-color: #404040 !important;
                }
                
                th {
                    background: #2d2d2d !important;
                }
                
                td, th {
                    border-color: #404040 !important;
                }
                
                blockquote {
                    color: #b0b0b0 !important;
                }
            }
        `;
        
        const style = doc.createElement('style');
        style.textContent = offlineStyles;
        style.setAttribute('data-offline-bookmarks-base', 'true');
        
        if (doc.head) {
            doc.head.insertBefore(style, doc.head.firstChild);
        }
    }

    // Extract main content (experimental)
    extractMainContent(doc) {
        console.log('📖 Attempting to extract main content...');
        
        // Common content selectors (ordered by priority)
        const contentSelectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '.main-content',
            '.post-content',
            '.entry-content',
            '.article-content',
            '#content',
            '#main-content'
        ];
        
        for (const selector of contentSelectors) {
            const element = doc.querySelector(selector);
            if (element && element.textContent.trim().length > 200) {
                console.log(`✅ Found main content with selector: ${selector}`);
                return element;
            }
        }
        
        // Fallback: return body
        console.log('⚠️ Using body as main content (no specific content area found)');
        return doc.body;
    }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
    window.ContentProcessor = ContentProcessor;
}

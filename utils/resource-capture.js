// Enhanced Resource Capture for Offline Bookmark Manager
class ResourceCapture {
    constructor(options = {}) {
        this.maxImageSize = options.maxImageSize || 5 * 1024 * 1024; // 5MB
        this.maxTotalSize = options.maxTotalSize || 50 * 1024 * 1024; // 50MB
        this.supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
        this.capturedResources = new Map();
        this.totalCapturedSize = 0;
    }

    async capturePageResources() {
        console.log('🎯 Starting enhanced resource capture...');
        
        const resources = {
            images: [],
            css: [],
            fonts: [],
            totalSize: 0
        };

        try {
            // Capture images
            resources.images = await this.captureImages();
            
            // Capture CSS
            resources.css = await this.captureCSS();
            
            // Capture fonts (basic)
            resources.fonts = await this.captureFonts();
            
            resources.totalSize = this.totalCapturedSize;
            
            console.log('✅ Resource capture completed:', {
                images: resources.images.length,
                cssFiles: resources.css.length,
                fonts: resources.fonts.length,
                totalSize: this.formatBytes(resources.totalSize)
            });
            
            return resources;
            
        } catch (error) {
            console.error('❌ Error capturing resources:', error);
            return resources; // Return partial results
        }
    }

    async captureImages() {
        const images = [];
        const imageElements = document.querySelectorAll('img[src]');
        
        console.log(`🖼️ Found ${imageElements.length} images to process`);
        
        for (let i = 0; i < imageElements.length; i++) {
            const img = imageElements[i];
            
            try {
                if (this.totalCapturedSize >= this.maxTotalSize) {
                    console.warn('⚠️ Total size limit reached, stopping image capture');
                    break;
                }
                
                const imageData = await this.captureImage(img);
                if (imageData) {
                    images.push(imageData);
                    this.totalCapturedSize += imageData.size;
                    
                    // Update progress for large captures
                    if (i % 10 === 0) {
                        console.log(`📊 Progress: ${i + 1}/${imageElements.length} images processed`);
                    }
                }
                
            } catch (error) {
                console.warn(`⚠️ Failed to capture image: ${img.src}`, error);
            }
        }
        
        return images;
    }

    async captureImage(imgElement) {
        const src = imgElement.src;
        
        // Skip data URLs and invalid sources
        if (!src || src.startsWith('data:') || this.capturedResources.has(src)) {
            return null;
        }
        
        try {
            // Check if image is visible and has reasonable dimensions
            const rect = imgElement.getBoundingClientRect();
            if (rect.width < 10 || rect.height < 10) {
                return null; // Skip tiny images (likely tracking pixels)
            }
            
            const response = await fetch(src, { 
                method: 'GET',
                mode: 'cors',
                credentials: 'omit'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const blob = await response.blob();
            
            // Check file size and type
            if (blob.size > this.maxImageSize) {
                console.warn(`⚠️ Image too large: ${this.formatBytes(blob.size)} - ${src}`);
                return null;
            }
            
            if (!this.supportedImageTypes.includes(blob.type)) {
                console.warn(`⚠️ Unsupported image type: ${blob.type} - ${src}`);
                return null;
            }
            
            const dataUrl = await this.blobToDataURL(blob);
            const imageData = {
                originalUrl: src,
                dataUrl: dataUrl,
                type: blob.type,
                size: blob.size,
                width: imgElement.naturalWidth || imgElement.width,
                height: imgElement.naturalHeight || imgElement.height,
                alt: imgElement.alt || ''
            };
            
            this.capturedResources.set(src, imageData);
            console.log(`✅ Captured image: ${this.formatBytes(blob.size)} - ${src}`);
            
            return imageData;
            
        } catch (error) {
            console.warn(`❌ Failed to capture image: ${src}`, error.message);
            return null;
        }
    }

    async captureCSS() {
        const cssResources = [];
        const styleSheets = document.styleSheets;
        
        console.log(`🎨 Found ${styleSheets.length} stylesheets to process`);
        
        for (let i = 0; i < styleSheets.length; i++) {
            const sheet = styleSheets[i];
            
            try {
                if (this.totalCapturedSize >= this.maxTotalSize) {
                    break;
                }
                
                const cssData = await this.captureStyleSheet(sheet);
                if (cssData) {
                    cssResources.push(cssData);
                    this.totalCapturedSize += cssData.size;
                }
                
            } catch (error) {
                console.warn(`⚠️ Failed to capture stylesheet:`, sheet.href, error);
            }
        }
        
        // Also capture inline styles
        const inlineStyles = this.captureInlineStyles();
        if (inlineStyles.size > 0) {
            cssResources.push({
                type: 'inline',
                content: inlineStyles,
                size: new Blob([inlineStyles]).size
            });
        }
        
        return cssResources;
    }

    async captureStyleSheet(sheet) {
        // Skip non-accessible stylesheets (CORS issues)
        if (sheet.href && !sheet.href.startsWith(window.location.origin)) {
            return null;
        }
        
        try {
            let cssText = '';
            
            if (sheet.cssRules) {
                cssText = Array.from(sheet.cssRules)
                    .map(rule => rule.cssText)
                    .join('\n');
            }
            
            if (!cssText.trim()) {
                return null;
            }
            
            return {
                href: sheet.href,
                type: 'stylesheet',
                content: cssText,
                size: new Blob([cssText]).size
            };
            
        } catch (error) {
            // CORS or security error
            console.warn(`⚠️ Cannot access stylesheet: ${sheet.href}`);
            return null;
        }
    }

    captureInlineStyles() {
        const elementsWithStyle = document.querySelectorAll('[style]');
        const inlineStyles = [];
        
        elementsWithStyle.forEach((element, index) => {
            if (element.style.cssText) {
                inlineStyles.push(`/* Element ${index} */\n${element.style.cssText}`);
            }
        });
        
        return inlineStyles.join('\n\n');
    }

    async captureFonts() {
        const fonts = [];
        
        try {
            // Get font faces from CSS
            const fontFaces = Array.from(document.fonts);
            
            for (const font of fontFaces) {
                if (font.status === 'loaded' && fonts.length < 5) { // Limit font capture
                    fonts.push({
                        family: font.family,
                        style: font.style,
                        weight: font.weight,
                        status: font.status
                    });
                }
            }
            
            console.log(`🔤 Captured ${fonts.length} font references`);
            
        } catch (error) {
            console.warn('⚠️ Font capture not supported or failed:', error);
        }
        
        return fonts;
    }

    // Utility methods
    blobToDataURL(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export for use in content scripts
if (typeof window !== 'undefined') {
    window.ResourceCapture = ResourceCapture;
}

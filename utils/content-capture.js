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

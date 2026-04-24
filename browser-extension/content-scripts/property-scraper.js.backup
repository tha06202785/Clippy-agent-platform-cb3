/**
 * Property Scraper for realestate.com.au and Domain
 * Extracts listing data and sends to Clippy
 */

(function() {
  'use strict';

  // Check if already injected
  if (window.clippyScraperInjected) return;
  window.clippyScraperInjected = true;

  console.log('Clippy property scraper loaded');

  // Detect site
  const isREA = window.location.hostname.includes('realestate.com.au');
  const isDomain = window.location.hostname.includes('domain.com.au');

  if (!isREA && !isDomain) return;

  // Create floating Clippy button
  function createClippyButton() {
    const button = document.createElement('div');
    button.id = 'clippy-property-button';
    button.innerHTML = `
      <div style="
        position: fixed;
        top: 100px;
        right: 20px;
        background: #4F46E5;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: transform 0.2s;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        <span>🏠</span>
        <span>Add to Clippy</span>
      </div>
    `;

    button.addEventListener('click', scrapeAndSend);
    document.body.appendChild(button);
  }

  // Scrape property data
  function scrapePropertyData() {
    const data = {
      address: '',
      suburb: '',
      price: '',
      beds: 0,
      baths: 0,
      cars: 0,
      description: '',
      images: [],
      agent_name: '',
      agent_phone: '',
      url: window.location.href,
      scraped_at: new Date().toISOString()
    };

    if (isREA) {
      // realestate.com.au selectors
      data.address = document.querySelector('h1[data-testid="address-wrapper"]')?.textContent?.trim() || 
                     document.querySelector('h1')?.textContent?.trim() || '';
      
      data.price = document.querySelector('[data-testid="listing-details__summary-title"]')?.textContent?.trim() || 
                   document.querySelector('.property-price')?.textContent?.trim() || '';
      
      const specs = document.querySelectorAll('[data-testid="property-features-feature"]');
      specs.forEach(spec => {
        const text = spec.textContent.toLowerCase();
        if (text.includes('bed')) data.beds = parseInt(text) || 0;
        if (text.includes('bath')) data.baths = parseInt(text) || 0;
        if (text.includes('car')) data.cars = parseInt(text) || 0;
      });

      data.description = document.querySelector('[data-testid="listing-details__description"]')?.textContent?.trim() || '';
      
      // Get agent info
      data.agent_name = document.querySelector('[data-testid="agent-info-name"]')?.textContent?.trim() || '';
      data.agent_phone = document.querySelector('[data-testid="agent-info-phone"]')?.textContent?.trim() || '';

    } else if (isDomain) {
      // domain.com.au selectors
      data.address = document.querySelector('h1')?.textContent?.trim() || '';
      data.price = document.querySelector('.listing-details__summary-title')?.textContent?.trim() || 
                   document.querySelector('.css-1an0zdz')?.textContent?.trim() || '';

      const bedsEl = document.querySelector('[data-testid="property-features-text-container-bed"]');
      const bathsEl = document.querySelector('[data-testid="property-features-text-container-bath"]');
      const carsEl = document.querySelector('[data-testid="property-features-text-container-car"]');

      data.beds = bedsEl ? parseInt(bedsEl.textContent) : 0;
      data.baths = bathsEl ? parseInt(bathsEl.textContent) : 0;
      data.cars = carsEl ? parseInt(carsEl.textContent) : 0;

      data.description = document.querySelector('[data-testid="listing-details__description"]')?.textContent?.trim() || '';
      
      data.agent_name = document.querySelector('.agent-info__name')?.textContent?.trim() || '';
      data.agent_phone = document.querySelector('.agent-info__phone')?.textContent?.trim() || '';
    }

    // Extract suburb from address
    const suburbMatch = data.address.match(/([^,]+),\s*([^,]+)/);
    if (suburbMatch) {
      data.suburb = suburbMatch[2].trim();
    }

    return data;
  }

  // Send data to Clippy
  function scrapeAndSend() {
    const data = scrapePropertyData();
    
    console.log('Scraped property data:', data);

    // Show loading state
    const button = document.getElementById('clippy-property-button');
    if (button) {
      button.innerHTML = '<span>⏳</span><span>Saving...</span>';
    }

    // Send to background script
    chrome.runtime.sendMessage({
      action: 'captureProperty',
      data: data
    }, (response) => {
      if (response?.success) {
        showNotification('✅ Property added to Clippy!');
        if (button) {
          button.innerHTML = '<span>✅</span><span>Saved</span>';
          setTimeout(() => {
            button.remove();
          }, 3000);
        }
      } else {
        showNotification('❌ Could not save property');
        if (button) {
          button.innerHTML = '<span>🏠</span><span>Add to Clippy</span>';
        }
      }
    });
  }

  // Show notification
  function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      color: #1F2937;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.2);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      animation: slideIn 0.3s ease;
    `;
    notif.textContent = message;
    document.body.appendChild(notif);

    setTimeout(() => {
      notif.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 3000);
  }

  // Add animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createClippyButton);
  } else {
    createClippyButton();
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'propertyCaptured') {
      if (request.success) {
        showNotification('✅ Property saved to Clippy!');
      }
    }
  });

})();

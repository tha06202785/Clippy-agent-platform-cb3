// Demo Video Modal Integration - Version 2.0
// Tries modal first, falls back to new tab

(function() {
  'use strict';
  
  // Track if we've attached to buttons
  let attachedButtons = new Set();
  
  // Create modal HTML
  function createModal() {
    if (document.getElementById('clippy-demo-modal')) return;
    
    const modalHTML = `
      <div id="clippy-demo-modal" style="display: none; position: fixed; inset: 0; z-index: 9999; background: rgba(0, 0, 0, 0.95); backdrop-filter: blur(10px); align-items: center; justify-content: center; padding: 20px;">
        <div style="position: relative; width: 100%; max-width: 1200px; height: 90vh; background: #0f172a; border-radius: 16px; overflow: hidden; border: 1px solid rgba(255, 255, 255, 0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8); display: flex; flex-direction: column;">
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 1.3rem;">📎</span>
              <span style="font-weight: 700; background: linear-gradient(135deg, #3b82f6, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Clippy Demo</span>
            </div>
            <button id="clippy-demo-close" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); color: rgba(255, 255, 255, 0.8); cursor: pointer; font-size: 18px; padding: 8px 12px; border-radius: 6px; transition: all 0.2s;">✕ Close</button>
          </div>
          <iframe src="/demo-video.html" style="flex: 1; width: 100%; border: none;"></iframe>
          
          <div style="padding: 10px; text-align: center; color: rgba(255, 255, 255, 0.4); font-size: 13px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
            🎬 Interactive Demo • Press ESC to close
          </div>
        </div>
      </div>
    `;
    
    const container = document.createElement('div');
    container.innerHTML = modalHTML;
    document.body.appendChild(container.firstElementChild);
    
    // Attach close handlers
    const modal = document.getElementById('clippy-demo-modal');
    const closeBtn = document.getElementById('clippy-demo-close');
    
    closeBtn.addEventListener('click', closeDemo);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeDemo();
    });
  }
  
  function openDemo() {
    createModal();
    const modal = document.getElementById('clippy-demo-modal');
    if (modal) {
      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }
  
  function closeDemo() {
    const modal = document.getElementById('clippy-demo-modal');
    if (modal) {
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
  }
  
  // ESC key handler
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      closeDemo();
    }
  });
  
  // Attach to buttons
  function attachToButton(btn) {
    if (attachedButtons.has(btn)) return;
    attachedButtons.add(btn);
    
    // Change button to open demo
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      openDemo();
      return false;
    });
    
    // Also try to make it look clickable
    btn.style.cursor = 'pointer';
    
    console.log('✅ Demo button attached');
  }
  
  // Find buttons
  function findButtons() {
    const selectors = ['button', 'a', '[role="button"]', '.btn', '[class*="button"]'];
    const buttons = [];
    
    selectors.forEach(function(sel) {
      try {
        document.querySelectorAll(sel).forEach(function(el) {
          buttons.push(el);
        });
      } catch(e) {}
    });
    
    return buttons;
  }
  
  function scanAndAttach() {
    const buttons = findButtons();
    let attached = 0;
    
    buttons.forEach(function(btn) {
      const text = (btn.textContent || btn.innerText || '').toLowerCase().trim();
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();
      
      // Match criteria
      const isDemoButton = 
        text.includes('watch demo') ||
        text.includes('see demo') ||
        text.includes('view demo') ||
        text.includes('▶') ||
        text.includes('play') ||
        ariaLabel.includes('demo') ||
        ariaLabel.includes('watch');
      
      // Check for play icon
      const hasPlayIcon = btn.querySelector('svg') && (text.includes('play') || text.includes('watch') || text.includes('▶'));
      
      if (isDemoButton || hasPlayIcon) {
        attachToButton(btn);
        attached++;
      }
    });
    
    return attached;
  }
  
  // MutationObserver for dynamic content
  const observer = new MutationObserver(function(mutations) {
    let hasNewNodes = false;
    mutations.forEach(function(m) {
      if (m.addedNodes.length) hasNewNodes = true;
    });
    if (hasNewNodes) {
      scanAndAttach();
    }
  });
  
  // Initialize
  function init() {
    createModal();
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Immediate scan
    const initial = scanAndAttach();
    
    // Retry scans
    [500, 1000, 2000, 3000, 5000].forEach(function(delay) {
      setTimeout(scanAndAttach, delay);
    });
    
    console.log('🎬 Clippy Demo: Initialized, found ' + initial + ' buttons');
  }
  
  // Start
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // Expose globally
  window.openClippyDemo = openDemo;
  window.closeClippyDemo = closeDemo;
  
})();

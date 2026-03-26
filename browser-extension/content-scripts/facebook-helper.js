/**
 * Facebook Messenger AI Assistant
 * Adds Clippy AI reply button to Messenger
 */

(function() {
  'use strict';

  // Only run on Facebook Messenger
  if (!window.location.hostname.includes('facebook.com') && 
      !window.location.hostname.includes('messenger.com')) {
    return;
  }

  console.log('Clippy Facebook helper loaded');

  // Wait for Messenger UI to load
  const observer = new MutationObserver((mutations) => {
    addClippyButtons();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Add Clippy buttons to message inputs
  function addClippyButtons() {
    // Find message input areas
    const inputAreas = document.querySelectorAll('[role="textbox"], [contenteditable="true"]');
    
    inputAreas.forEach(input => {
      // Check if already has Clippy button
      if (input.parentElement?.querySelector('.clippy-ai-button')) return;

      // Create Clippy button
      const button = document.createElement('button');
      button.className = 'clippy-ai-button';
      button.innerHTML = '✨ AI Reply';
      button.style.cssText = `
        background: #4F46E5;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 16px;
        font-size: 12px;
        cursor: pointer;
        margin-left: 8px;
        font-weight: 600;
        transition: background 0.2s;
      `;
      
      button.addEventListener('click', (e) => {
        e.preventDefault();
        generateAIReply(input);
      });

      // Insert button
      const container = input.parentElement;
      if (container) {
        container.style.position = 'relative';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.cssText = `
          position: absolute;
          right: 10px;
          top: -30px;
          z-index: 1000;
        `;
        buttonContainer.appendChild(button);
        container.appendChild(buttonContainer);
      }
    });
  }

  // Generate AI reply
  function generateAIReply(inputElement) {
    // Get conversation context
    const messages = extractConversation();
    const lastMessage = messages[messages.length - 1];

    // Show loading
    const button = inputElement.parentElement.querySelector('.clippy-ai-button');
    if (button) {
      button.textContent = '⏳';
      button.disabled = true;
    }

    // Send to Clippy API
    chrome.runtime.sendMessage({
      action: 'generateAIReply',
      data: {
        conversation: messages,
        last_message: lastMessage,
        platform: 'facebook'
      }
    }, (response) => {
      if (button) {
        button.textContent = '✨ AI Reply';
        button.disabled = false;
      }

      if (response?.reply) {
        // Insert reply into input
        insertReply(inputElement, response.reply);
      }
    });
  }

  // Extract conversation from Messenger
  function extractConversation() {
    const messages = [];
    
    // Find message bubbles
    const messageElements = document.querySelectorAll('[data-testid="message-container"]');
    
    messageElements.forEach(el => {
      const text = el.textContent.trim();
      const isOutgoing = el.querySelector('[data-testid="outgoing_message"]') !== null;
      
      if (text) {
        messages.push({
          text: text,
          is_agent: isOutgoing,
          timestamp: new Date().toISOString()
        });
      }
    });

    return messages.slice(-10); // Last 10 messages
  }

  // Insert reply into input
  function insertReply(inputElement, reply) {
    inputElement.focus();
    
    // Clear existing content
    inputElement.innerHTML = '';
    
    // Insert reply text
    if (inputElement.isContentEditable) {
      inputElement.textContent = reply;
    } else {
      inputElement.value = reply;
    }

    // Trigger input event
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Quick capture from Facebook comments/posts
  function setupQuickCapture() {
    // Add right-click menu for text selection
    document.addEventListener('mouseup', (e) => {
      const selection = window.getSelection().toString().trim();
      if (selection.length > 10) {
        // Show floating capture button
        showFloatingCaptureButton(selection, e);
      }
    });
  }

  // Show floating capture button
  function showFloatingCaptureButton(text, event) {
    // Remove existing buttons
    const existing = document.querySelector('.clippy-float-capture');
    if (existing) existing.remove();

    const button = document.createElement('div');
    button.className = 'clippy-float-capture';
    button.innerHTML = '+ Add to Clippy';
    button.style.cssText = `
      position: fixed;
      background: #4F46E5;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-weight: 600;
    `;
    
    button.style.left = `${event.pageX}px`;
    button.style.top = `${event.pageY - 40}px`;

    button.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        action: 'captureLead',
        data: {
          raw_text: text,
          source: 'facebook',
          url: window.location.href
        }
      });
      button.remove();
      showNotification('Lead captured!');
    });

    document.body.appendChild(button);

    // Remove after 5 seconds
    setTimeout(() => button.remove(), 5000);
  }

  // Show notification
  function showNotification(message) {
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: #10B981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    notif.textContent = message;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
  }

  // Initialize
  setupQuickCapture();

})();

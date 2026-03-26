/**
 * Clippy Extension Background Service Worker
 * Handles events, API calls, and state management
 */

// Configuration
const CLIPPY_API_URL = 'https://api.useclippy.com';
const AUTH_TOKEN_KEY = 'clippy_auth_token';
const USER_ID_KEY = 'clippy_user_id';

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Clippy AI Extension installed');
  
  // Set up context menu
  chrome.contextMenus.create({
    id: 'clippy-capture',
    title: 'Add to Clippy',
    contexts: ['selection'],
    documentUrlPatterns: ['<all_urls>']
  });
  
  // Set up keyboard shortcuts
  chrome.commands.onCommand.addListener((command) => {
    if (command === 'quick-capture') {
      handleQuickCapture();
    }
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'clippy-capture') {
    captureSelection(info.selectionText, tab);
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'captureProperty':
      handlePropertyCapture(request.data, sender.tab);
      break;
    case 'captureLead':
      handleLeadCapture(request.data);
      break;
    case 'generateAIReply':
      handleAIReply(request.data, sender.tab);
      break;
    case 'parseEmail':
      handleEmailParse(request.data);
      break;
    case 'getAuthStatus':
      getAuthStatus().then(sendResponse);
      return true; // Async response
  }
});

// Capture selected text as lead
function captureSelection(text, tab) {
  // Extract contact info from selection
  const data = {
    raw_text: text,
    source_url: tab.url,
    source_title: tab.title,
    timestamp: new Date().toISOString()
  };
  
  // Send to Clippy API
  fetch(`${CLIPPY_API_URL}/extension/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    // Show notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Clippy AI',
      message: result.success ? 'Lead captured!' : 'Capture failed'
    });
  });
}

// Handle property capture from realestate.com.au / Domain
function handlePropertyCapture(data, tab) {
  fetch(`${CLIPPY_API_URL}/extension/property`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify({
      ...data,
      source_url: tab.url,
      captured_at: new Date().toISOString()
    })
  })
  .then(response => response.json())
  .then(result => {
    // Send result back to content script
    chrome.tabs.sendMessage(tab.id, {
      action: 'propertyCaptured',
      success: result.success,
      listing_id: result.listing_id
    });
  });
}

// Handle lead capture
function handleLeadCapture(data) {
  fetch(`${CLIPPY_API_URL}/extension/lead`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  });
}

// Generate AI reply
function handleAIReply(data, tab) {
  fetch(`${CLIPPY_API_URL}/ai/generate-reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    chrome.tabs.sendMessage(tab.id, {
      action: 'aiReplyGenerated',
      reply: result.reply
    });
  });
}

// Parse email inquiry
function handleEmailParse(data) {
  fetch(`${CLIPPY_API_URL}/extension/parse-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getAuthToken()}`
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Clippy AI',
      message: result.lead_created ? 'Lead created from email!' : 'Could not parse email'
    });
  });
}

// Quick capture keyboard shortcut
function handleQuickCapture() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'showQuickCapture' });
  });
}

// Get auth token from storage
async function getAuthToken() {
  const result = await chrome.storage.local.get([AUTH_TOKEN_KEY]);
  return result[AUTH_TOKEN_KEY];
}

// Check auth status
async function getAuthStatus() {
  const token = await getAuthToken();
  return { authenticated: !!token };
}

// Listen for tab updates (for specific sites)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if we're on a supported site
    if (tab.url.includes('realestate.com.au') || tab.url.includes('domain.com.au')) {
      // Inject property scraper
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        files: ['content-scripts/property-scraper.js']
      });
    }
  }
});

console.log('Clippy background service worker running');

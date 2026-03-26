/**
 * Clippy Extension Popup Script
 * Handles popup UI interactions
 */

// Check auth status when popup opens
document.addEventListener('DOMContentLoaded', async () => {
  const isLoggedIn = await checkAuthStatus();
  
  if (isLoggedIn) {
    document.getElementById('logged-in').style.display = 'block';
    document.getElementById('logged-out').style.display = 'none';
    loadStats();
  } else {
    document.getElementById('logged-in').style.display = 'none';
    document.getElementById('logged-out').style.display = 'block';
  }
});

// Check if user is authenticated
async function checkAuthStatus() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['clippy_auth_token'], (result) => {
      resolve(!!result.clippy_auth_token);
    });
  });
}

// Load user's stats
async function loadStats() {
  // Get stats from background script
  chrome.runtime.sendMessage({ action: 'getStats' }, (response) => {
    if (response) {
      document.getElementById('leads-count').textContent = response.leadsToday || 0;
      document.getElementById('properties-count').textContent = response.propertiesViewed || 0;
      document.getElementById('replies-count').textContent = response.aiReplies || 0;
    }
  });
}

// Capture lead button
document.getElementById('btn-capture')?.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: 'showQuickCapture' });
    window.close();
  });
});

// Open dashboard button
document.getElementById('btn-dashboard')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://useclippy.com/dashboard' });
  window.close();
});

// Login button
document.getElementById('btn-login')?.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://useclippy.com/login?source=extension' });
  window.close();
});

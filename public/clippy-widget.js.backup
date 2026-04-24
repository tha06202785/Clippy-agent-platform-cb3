/**
 * Clippy AI Chat Widget
 * A floating chat widget similar to Microsoft's Clippy
 * Embeddable on any website
 */

(function() {
    'use strict';

    // Configuration
    const config = {
        position: document.currentScript?.dataset.position || 'bottom-right',
        theme: document.currentScript?.dataset.theme || 'blue',
        welcome: document.currentScript?.dataset.welcome || "Hi! I'm Clippy. How can I help you today?",
        apiEndpoint: document.currentScript?.dataset.apiEndpoint || 'https://api.openclaw.ai/chat',
        width: parseInt(document.currentScript?.dataset.width) || 350,
        height: parseInt(document.currentScript?.dataset.height) || 500,
        title: document.currentScript?.dataset.title || 'Clippy Assistant',
        avatar: document.currentScript?.dataset.avatar || null
    };

    // State
    let isOpen = false;
    let messages = [];
    let sessionId = 'clippy_' + Math.random().toString(36).substr(2, 9);

    // Theme colors
    const themes = {
        blue: { primary: '#2563eb', secondary: '#1d4ed8', bg: '#eff6ff' },
        green: { primary: '#16a34a', secondary: '#15803d', bg: '#f0fdf4' },
        purple: { primary: '#9333ea', secondary: '#7c3aed', bg: '#faf5ff' },
        orange: { primary: '#ea580c', secondary: '#c2410c', bg: '#fff7ed' },
        dark: { primary: '#374151', secondary: '#1f2937', bg: '#f3f4f6' }
    };

    const theme = themes[config.theme] || themes.blue;

    // Create widget HTML
    function createWidget() {
        const container = document.createElement('div');
        container.id = 'clippy-widget-container';
        container.innerHTML = `
            <style>
                #clippy-widget-container {
                    position: fixed;
                    ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
                    ${config.position.includes('bottom') ? 'bottom: 20px;' : 'top: 20px;'}
                    z-index: 999999;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                
                .clippy-bubble {
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: ${theme.primary};
                    color: white;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    transition: all 0.3s ease;
                    animation: clippy-bounce 2s infinite;
                }
                
                .clippy-bubble:hover {
                    transform: scale(1.1);
                    box-shadow: 0 6px 20px rgba(0,0,0,0.2);
                }
                
                .clippy-bubble.hidden {
                    display: none;
                }
                
                @keyframes clippy-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                
                .clippy-chat-window {
                    width: ${config.width}px;
                    height: ${config.height}px;
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    position: absolute;
                    ${config.position.includes('right') ? 'right: 0;' : 'left: 0;'}
                    ${config.position.includes('bottom') ? 'bottom: 80px;' : 'top: 80px;'}
                    opacity: 0;
                    transform: scale(0.9) translateY(20px);
                    pointer-events: none;
                    transition: all 0.3s ease;
                }
                
                .clippy-chat-window.open {
                    opacity: 1;
                    transform: scale(1) translateY(0);
                    pointer-events: all;
                }
                
                .clippy-header {
                    background: ${theme.primary};
                    color: white;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                }
                
                .clippy-header-title {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-weight: 600;
                    font-size: 15px;
                }
                
                .clippy-header-avatar {
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    background: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 18px;
                }
                
                .clippy-header-actions {
                    display: flex;
                    gap: 8px;
                }
                
                .clippy-header-btn {
                    background: rgba(255,255,255,0.2);
                    border: none;
                    color: white;
                    width: 28px;
                    height: 28px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    transition: background 0.2s;
                }
                
                .clippy-header-btn:hover {
                    background: rgba(255,255,255,0.3);
                }
                
                .clippy-messages {
                    flex: 1;
                    overflow-y: auto;
                    padding: 16px;
                    background: #f8fafc;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                
                .clippy-message {
                    max-width: 80%;
                    padding: 12px 16px;
                    border-radius: 16px;
                    font-size: 14px;
                    line-height: 1.5;
                    word-wrap: break-word;
                }
                
                .clippy-message.user {
                    align-self: flex-end;
                    background: ${theme.primary};
                    color: white;
                    border-bottom-right-radius: 4px;
                }
                
                .clippy-message.bot {
                    align-self: flex-start;
                    background: white;
                    color: #1f2937;
                    border: 1px solid #e5e7eb;
                    border-bottom-left-radius: 4px;
                }
                
                .clippy-typing {
                    align-self: flex-start;
                    background: white;
                    border: 1px solid #e5e7eb;
                    border-radius: 16px;
                    border-bottom-left-radius: 4px;
                    padding: 16px 20px;
                    display: none;
                }
                
                .clippy-typing.active {
                    display: flex;
                }
                
                .clippy-typing-dots {
                    display: flex;
                    gap: 4px;
                }
                
                .clippy-typing-dots span {
                    width: 8px;
                    height: 8px;
                    background: #9ca3af;
                    border-radius: 50%;
                    animation: typing 1.4s infinite;
                }
                
                .clippy-typing-dots span:nth-child(2) { animation-delay: 0.2s; }
                .clippy-typing-dots span:nth-child(3) { animation-delay: 0.4s; }
                
                @keyframes typing {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                }
                
                .clippy-input-area {
                    padding: 12px 16px;
                    background: white;
                    border-top: 1px solid #e5e7eb;
                    display: flex;
                    gap: 8px;
                }
                
                .clippy-input {
                    flex: 1;
                    border: 1px solid #d1d5db;
                    border-radius: 24px;
                    padding: 10px 16px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }
                
                .clippy-input:focus {
                    border-color: ${theme.primary};
                }
                
                .clippy-send-btn {
                    background: ${theme.primary};
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.2s;
                }
                
                .clippy-send-btn:hover {
                    background: ${theme.secondary};
                }
                
                .clippy-send-btn:disabled {
                    background: #9ca3af;
                    cursor: not-allowed;
                }
                
                .clippy-timestamp {
                    font-size: 11px;
                    color: #9ca3af;
                    margin-top: 4px;
                    text-align: right;
                }
                
                .clippy-message.bot .clippy-timestamp {
                    text-align: left;
                }
            </style>
            
            <button class="clippy-bubble" id="clippy-toggle" title="Chat with Clippy">
                🧷
            </button>
            
            <div class="clippy-chat-window" id="clippy-window">
                <div class="clippy-header">
                    <div class="clippy-header-title">
                        <div class="clippy-header-avatar">🧷</div>
                        <span>${config.title}</span>
                    </div>
                    <div class="clippy-header-actions">
                        <button class="clippy-header-btn" id="clippy-minimize" title="Minimize">−</button>
                        <button class="clippy-header-btn" id="clippy-close" title="Close">×</button>
                    </div>
                </div>
                
                <div class="clippy-messages" id="clippy-messages">
                    <div class="clippy-typing" id="clippy-typing">
                        <div class="clippy-typing-dots">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                </div>
                
                <div class="clippy-input-area">
                    <input type="text" class="clippy-input" id="clippy-input" 
                           placeholder="Type a message..." autocomplete="off">
                    <button class="clippy-send-btn" id="clippy-send">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Event listeners
        document.getElementById('clippy-toggle').addEventListener('click', openChat);
        document.getElementById('clippy-minimize').addEventListener('click', minimizeChat);
        document.getElementById('clippy-close').addEventListener('click', closeChat);
        document.getElementById('clippy-send').addEventListener('click', sendMessage);
        document.getElementById('clippy-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
        
        // Add welcome message
        addMessage('bot', config.welcome);
    }

    function openChat() {
        isOpen = true;
        document.getElementById('clippy-window').classList.add('open');
        document.getElementById('clippy-toggle').classList.add('hidden');
        document.getElementById('clippy-input').focus();
    }

    function minimizeChat() {
        isOpen = false;
        document.getElementById('clippy-window').classList.remove('open');
        document.getElementById('clippy-toggle').classList.remove('hidden');
    }

    function closeChat() {
        minimizeChat();
    }

    function addMessage(sender, text) {
        const messagesDiv = document.getElementById('clippy-messages');
        const typingDiv = document.getElementById('clippy-typing');
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `clippy-message ${sender}`;
        
        const time = new Date().toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        messageDiv.innerHTML = `
            ${escapeHtml(text)}
            <div class="clippy-timestamp">${time}</div>
        `;
        
        messagesDiv.insertBefore(messageDiv, typingDiv);
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        
        messages.push({ sender, text, time });
    }

    function showTyping() {
        document.getElementById('clippy-typing').classList.add('active');
        const messagesDiv = document.getElementById('clippy-messages');
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }

    function hideTyping() {
        document.getElementById('clippy-typing').classList.remove('active');
    }

    async function sendMessage() {
        const input = document.getElementById('clippy-input');
        const sendBtn = document.getElementById('clippy-send');
        const text = input.value.trim();
        
        if (!text) return;
        
        // Add user message
        addMessage('user', text);
        input.value = '';
        sendBtn.disabled = true;
        
        // Show typing indicator
        showTyping();
        
        try {
            // Call API
            const response = await fetch(config.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: text,
                    sessionId: sessionId,
                    timestamp: new Date().toISOString()
                })
            });
            
            hideTyping();
            
            if (response.ok) {
                const data = await response.json();
                addMessage('bot', data.response || data.message || "I'm not sure how to respond to that.");
            } else {
                addMessage('bot', "Sorry, I'm having trouble connecting right now. Please try again in a moment.");
            }
        } catch (error) {
            hideTyping();
            addMessage('bot', "Sorry, I'm having trouble connecting right now. Please try again in a moment.");
            console.error('Clippy API Error:', error);
        }
        
        sendBtn.disabled = false;
        input.focus();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
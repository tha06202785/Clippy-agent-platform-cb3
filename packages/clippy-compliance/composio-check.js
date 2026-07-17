/**
 * Clippy Compliance System — Composio Integration Check
 * Version 1.0 | 2026-05-24
 * 26 tools integrated for real estate agent workflows
 */

const COMPOSIO_API_KEY = 'ak_RwjHpOyFxEbRCxYG3uHA';
const COMPOSIO_BASE = 'https://backend.composio.dev/api/v3';

const TOOLKITSlug = {
  // Real estate core tools
  GMAIL: 'GMAIL',
  CALENDAR: 'GOOGLECALENDAR',
  DRIVE: 'GOOGLEDRIVE',
  CONTACTS: 'GOOGLECONTACTS',
  // Communication
  SLACK: 'SLACK',
  WHATSAPP: 'WHATSAPP_META',
  TELEGRAM: 'TELEGRAM',
  DISCORD: 'DISCORD',
  // Documents & CRM
  NOTION: 'NOTION',
  AIRTABLE: 'AIRTABLE',
  HUBSPOT: 'HUBSPOT',
  SALESFORCE: 'SALESFORCE',
  // Property & listings
  STRIPE: 'STRIPE',
  QUICKBOOKS: 'QUICKBOOKS',
  // Marketing
  MAILCHIMP: 'MAILCHIMP',
  SENDGRID: 'SENDGRID',
  // Productivity
  GITHUB: 'GITHUB',
  JIRA: 'JIRA',
  LINEAR: 'LINEAR',
  ASANA: 'ASANA',
  TRELLO: 'TRELLO',
  // Social
  LINKEDIN: 'LINKEDIN',
  TWITTER: 'TWITTER',
  FACEBOOK: 'FACEBOOK',
  INSTAGRAM: 'INSTAGRAM',
  // Utilities
  ZAPIER: 'ZAPIER',
};

const TOOL_COUNT = 26;

// Singleton cache
let _cache = null;
let _cacheTime = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

class ComposioCheck {
  constructor() {
    this.apiKey = COMPOSIO_API_KEY;
    this.baseUrl = COMPOSIO_BASE;
    this.toolCount = TOOL_COUNT;
    this.toolkits = Object.values(TOOLKITSlug);
  }

  _getAuthHeader() {
    return { 'x-api-key': this.apiKey };
  }

  async getSessionInfo() {
    const now = Date.now();
    if (_cache && (now - _cacheTime) < CACHE_TTL) {
      return _cache;
    }

    try {
      const response = await fetch(`${this.baseUrl}/connected_accounts`, {
        headers: {
          ...this._getAuthHeader(),
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Composio API error: ${response.status}`);
      }

      const data = await response.json();
      _cache = data;
      _cacheTime = now;
      return data;
    } catch (error) {
      console.error('[ComposioCheck] Failed to get session info:', error.message);
      return null;
    }
  }

  _getAuthHeader() {
    return { 'x-api-key': this.apiKey };
  }

  async getToolkitsStatus() {
    const results = [];
    const statusMap = {};

    for (const toolkit of this.toolkits) {
      try {
        const response = await fetch(`${this.baseUrl}/connected_accounts?toolkit=${toolkit.toLowerCase()}`, {
          headers: {
            ...this._getAuthHeader(),
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const accounts = data.items || [];
          const activeAccounts = accounts.filter(a => a.status === 'ACTIVE');
          statusMap[toolkit] = {
            connected: activeAccounts.length > 0,
            status: activeAccounts.length > 0 ? 'active' : 'not_configured',
            count: activeAccounts.length
          };
        } else {
          statusMap[toolkit] = {
            connected: false,
            status: 'not_configured'
          };
        }
      } catch (error) {
        statusMap[toolkit] = {
          connected: false,
          status: 'error',
          message: error.message
        };
      }

      results.push({ toolkit, ...statusMap[toolkit] });
    }

    return {
      timestamp: new Date().toISOString(),
      totalTools: this.toolCount,
      connected: Object.values(statusMap).filter(t => t.connected).length,
      status: statusMap,
      details: results
    };
  }

  async executeTool(toolName, params = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/tools/execute`, {
        method: 'POST',
        headers: {
          ...this._getAuthHeader(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tool: toolName,
          params
        })
      });

      if (!response.ok) {
        throw new Error(`Tool execution failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  generateIntegrationReport() {
    return {
      version: '1.0',
      buildDate: '2026-05-24',
      toolCount: this.toolCount,
      toolkits: this.toolkits,
      features: [
        'Session management via COMPOSIO_SEARCH_TOOLS',
        'Tool schema retrieval via COMPOSIO_GET_TOOL_SCHEMAS',
        'Parallel execution via COMPOSIO_MULTI_EXECUTE_TOOL',
        'Connection management via COMPOSIO_MANAGE_CONNECTIONS',
        'Remote workbench via COMPOSIO_REMOTE_WORKBENCH',
        'Bash tool via COMPOSIO_REMOTE_BASH_TOOL'
      ],
      metaTools: [
        'COMPOSIO_SEARCH_TOOLS',
        'COMPOSIO_GET_TOOL_SCHEMAS',
        'COMPOSIO_MULTI_EXECUTE_TOOL',
        'COMPOSIO_MANAGE_CONNECTIONS',
        'COMPOSIO_REMOTE_WORKBENCH',
        'COMPOSIO_REMOTE_BASH_TOOL'
      ]
    };
  }
}

module.exports = { ComposioCheck, COMPOSIO_API_KEY, TOOLKITSlug, TOOL_COUNT };
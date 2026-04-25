/**
 * Follow Up Boss (FUB) API Service
 * Handles all interactions with the FUB CRM API
 */

const axios = require('axios');
const { getFubConfig } = require('./fubConfig');

class FUBService {
  constructor(apiKey, options = {}) {
    this.config = getFubConfig();
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || this.config.BASE_URL;
    this.timeout = options.timeout || this.config.TIMEOUT;
    this.debug = options.debug || this.config.DEBUG;
    
    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: this.config.getHeaders(apiKey)
    });
    
    // Request/response interceptors for logging
    if (this.debug || this.config.LOG_REQUESTS) {
      this.client.interceptors.request.use(
        (config) => {
          console.log(`[FUB API Request] ${config.method.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => Promise.reject(error)
      );
      
      this.client.interceptors.response.use(
        (response) => {
          console.log(`[FUB API Response] ${response.status} ${response.config.url}`);
          return response;
        },
        (error) => Promise.reject(error)
      );
    }
  }
  
  /**
   * Build full API URL
   */
  buildUrl(endpoint) {
    return `${this.baseURL}${endpoint}`;
  }
  
  /**
   * Handle API errors with retry logic
   */
  async handleRequest(requestFn, retryCount = 0) {
    try {
      return await requestFn();
    } catch (error) {
      // Retry on network errors or 5xx responses
      if (retryCount < this.config.RETRY_ATTEMPTS) {
        const shouldRetry = !error.response || (error.response.status >= 500 && error.response.status < 600);
        
        if (shouldRetry) {
          await this.delay(this.config.RETRY_DELAY * (retryCount + 1));
          return this.handleRequest(requestFn, retryCount + 1);
        }
      }
      
      throw this.formatError(error);
    }
  }
  
  /**
   * Format API errors
   */
  formatError(error) {
    if (error.response) {
      const { status, data } = error.response;
      return new Error(`FUB API Error ${status}: ${data?.message || data?.error || JSON.stringify(data)}`);
    }
    return new Error(`FUB API Error: ${error.message}`);
  }
  
  /**
   * Delay helper for retries
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ==========================================
  // CONTACT METHODS
  // ==========================================
  
  /**
   * Create a new contact in FUB
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Created contact
   */
  async createContact(contactData) {
    const payload = this.formatContactPayload(contactData);
    
    return this.handleRequest(async () => {
      const response = await this.client.post(
        this.config.ENDPOINTS.CONTACTS,
        payload
      );
      return response.data;
    });
  }
  
  /**
   * Get a contact by ID
   * @param {string} contactId - FUB contact ID
   * @returns {Promise<Object>} Contact data
   */
  async getContact(contactId) {
    return this.handleRequest(async () => {
      const response = await this.client.get(
        this.config.ENDPOINTS.CONTACT(contactId)
      );
      return response.data;
    });
  }
  
  /**
   * Update an existing contact
   * @param {string} contactId - FUB contact ID
   * @param {Object} contactData - Updated contact data
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, contactData) {
    const payload = this.formatContactPayload(contactData);
    
    return this.handleRequest(async () => {
      const response = await this.client.put(
        this.config.ENDPOINTS.CONTACT(contactId),
        payload
      );
      return response.data;
    });
  }
  
  /**
   * Search contacts by email or phone
   * @param {Object} params - Search parameters (email, phone, name)
   * @returns {Promise<Array>} Matching contacts
   */
  async searchContacts(params = {}) {
    return this.handleRequest(async () => {
      const response = await this.client.get(
        this.config.ENDPOINTS.CONTACTS,
        { params }
      );
      return response.data;
    });
  }
  
  /**
   * Find or create contact (upsert by email/phone)
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Contact data
   */
  async findOrCreateContact(contactData) {
    // Try to find existing contact
    if (contactData.email) {
      const existing = await this.searchContacts({ email: contactData.email });
      if (existing?.contacts?.length > 0) {
        const contact = existing.contacts[0];
        return this.updateContact(contact.id, contactData);
      }
    }
    
    if (contactData.phone) {
      const existing = await this.searchContacts({ phone: contactData.phone });
      if (existing?.contacts?.length > 0) {
        const contact = existing.contacts[0];
        return this.updateContact(contact.id, contactData);
      }
    }
    
    // Create new contact
    return this.createContact(contactData);
  }
  
  // ==========================================
  // TASK METHODS
  // ==========================================
  
  /**
   * Create a task for a contact
   * @param {Object} taskData - Task information
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    const payload = this.formatTaskPayload(taskData);
    
    return this.handleRequest(async () => {
      const response = await this.client.post(
        this.config.ENDPOINTS.TASKS,
        payload
      );
      return response.data;
    });
  }
  
  /**
   * Get a task by ID
   * @param {string} taskId - FUB task ID
   * @returns {Promise<Object>} Task data
   */
  async getTask(taskId) {
    return this.handleRequest(async () => {
      const response = await this.client.get(
        this.config.ENDPOINTS.TASK(taskId)
      );
      return response.data;
    });
  }
  
  /**
   * Update an existing task
   * @param {string} taskId - FUB task ID
   * @param {Object} taskData - Updated task data
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(taskId, taskData) {
    const payload = this.formatTaskPayload(taskData);
    
    return this.handleRequest(async () => {
      const response = await this.client.put(
        this.config.ENDPOINTS.TASK(taskId),
        payload
      );
      return response.data;
    });
  }
  
  /**
   * Complete a task
   * @param {string} taskId - FUB task ID
   * @returns {Promise<Object>} Updated task
   */
  async completeTask(taskId) {
    return this.updateTask(taskId, { completed: true });
  }
  
  /**
   * Delete a task
   * @param {string} taskId - FUB task ID
   * @returns {Promise<void>}
   */
  async deleteTask(taskId) {
    return this.handleRequest(async () => {
      await this.client.delete(this.config.ENDPOINTS.TASK(taskId));
    });
  }
  
  // ==========================================
  // HELPER METHODS
  // ==========================================
  
  /**
   * Format contact data for FUB API
   */
  formatContactPayload(data) {
    const payload = {
      firstName: data.firstName || data.first_name || '',
      lastName: data.lastName || data.last_name || '',
      emails: [],
      phones: [],
      addresses: [],
      source: data.source || this.config.DEFAULT_SOURCE,
      tags: data.tags || []
    };
    
    // Handle emails
    if (data.email) {
      payload.emails.push({
        value: data.email,
        type: 'work',
        isPrimary: true
      });
    }
    
    // Handle phones
    if (data.phone) {
      payload.phones.push({
        value: data.phone,
        type: 'home',
        isPrimary: true
      });
    }
    if (data.mobile) {
      payload.phones.push({
        value: data.mobile,
        type: 'mobile',
        isPrimary: !data.phone
      });
    }
    
    // Handle address
    if (data.address || data.city || data.state || data.zip || data.zipCode) {
      payload.addresses.push({
        street: data.address || '',
        city: data.city || '',
        state: data.state || '',
        code: data.zip || data.zipCode || '',
        type: 'home',
        isPrimary: true
      });
    }
    
    // Optional fields
    if (data.price) payload.price = data.price;
    if (data.beds) payload.beds = data.beds;
    if (data.baths) payload.baths = data.baths;
    if (data.sqft) payload.sqft = data.sqft;
    if (data.notes) payload.notes = data.notes;
    if (data.assignedTo) payload.assignedTo = data.assignedTo;
    
    return payload;
  }
  
  /**
   * Format task data for FUB API
   */
  formatTaskPayload(data) {
    const payload = {
      text: data.text || data.title || '',
      dueDate: data.dueDate || data.due_date || null,
      reminderDate: data.reminderDate || data.reminder_date || null,
      completed: data.completed || false
    };
    
    // Link to contact if provided
    if (data.contactId || data.contact_id) {
      payload.linkedContacts = [
        { id: data.contactId || data.contact_id }
      ];
    }
    
    // Assign to user if provided
    if (data.assignedTo || data.assigned_to) {
      payload.assignedTo = data.assignedTo || data.assigned_to;
    }
    
    // Optional notes
    if (data.notes) {
      payload.notes = data.notes;
    }
    
    return payload;
  }
  
  /**
   * Test API connection
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      await this.client.get(this.config.ENDPOINTS.USERS, { params: { limit: 1 } });
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get API rate limit info from response headers
   */
  getRateLimitInfo(headers) {
    return {
      limit: headers['x-ratelimit-limit'],
      remaining: headers['x-ratelimit-remaining'],
      reset: headers['x-ratelimit-reset']
    };
  }
}

module.exports = { FUBService };

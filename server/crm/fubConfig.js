/**
 * Follow Up Boss (FUB) API Configuration
 * 
 * FUB API Documentation: https://docs.followupboss.com/
 * Base URL: https://api.followupboss.com
 * Version: v1
 */

const FUB_CONFIG = {
  // API Base Configuration
  BASE_URL: process.env.FUB_API_URL || 'https://api.followupboss.com',
  API_VERSION: 'v1',
  
  // Timeout settings (ms)
  TIMEOUT: parseInt(process.env.FUB_TIMEOUT) || 30000,
  
  // Retry configuration
  RETRY_ATTEMPTS: parseInt(process.env.FUB_RETRY_ATTEMPTS) || 3,
  RETRY_DELAY: parseInt(process.env.FUB_RETRY_DELAY) || 1000,
  
  // Rate limiting (FUB allows 100 requests per 10 seconds)
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 10000, // 10 seconds in ms
  
  // Webhook settings
  WEBHOOK_SECRET: process.env.FUB_WEBHOOK_SECRET || null,
  
  // Default headers
  getHeaders(apiKey) {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}`
    };
  },
  
  // API Endpoints
  ENDPOINTS: {
    // Contacts
    CONTACTS: '/v1/contacts',
    CONTACT: (id) => `/v1/contacts/${id}`,
    CONTACT_EVENTS: (id) => `/v1/contacts/${id}/events`,
    
    // Tasks
    TASKS: '/v1/tasks',
    TASK: (id) => `/v1/tasks/${id}`,
    
    // Events
    EVENTS: '/v1/events',
    
    // Users/Agents
    USERS: '/v1/users',
    USER: (id) => `/v1/users/${id}`,
    
    // Webhooks
    WEBHOOKS: '/v1/webhooks',
    WEBHOOK: (id) => `/v1/webhooks/${id}`
  },
  
  // Pagination defaults
  PAGINATION: {
    DEFAULT_LIMIT: 100,
    MAX_LIMIT: 500
  },
  
  // Field mappings for contact creation
  // Maps our lead fields to FUB contact fields
  CONTACT_FIELD_MAP: {
    firstName: 'firstName',
    lastName: 'lastName',
    email: 'email',
    phone: 'phone',
    mobile: 'mobile',
    address: 'address',
    city: 'city',
    state: 'state',
    zip: 'zipCode',
    source: 'source',
    price: 'price',
    beds: 'beds',
    baths: 'baths',
    sqft: 'sqft',
    notes: 'notes',
    tags: 'tags'
  },
  
  // Valid contact sources for FUB
  VALID_SOURCES: [
    'Website',
    'Zillow',
    'Realtor.com',
    'Facebook',
    'Google',
    'Yelp',
    'Referral',
    'Open House',
    'Manual',
    'Other'
  ],
  
  // Default source if none provided
  DEFAULT_SOURCE: 'Website'
};

// Environment-based configuration
const getFubConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    ...FUB_CONFIG,
    DEBUG: !isProduction && process.env.FUB_DEBUG === 'true',
    LOG_REQUESTS: process.env.FUB_LOG_REQUESTS === 'true'
  };
};

module.exports = {
  FUB_CONFIG,
  getFubConfig
};

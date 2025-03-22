const axios = require('axios');

/**
 * Service for interacting with the Instantly.ai V2 API
 */
class InstantlyService {
  /**
   * Initialize the Instantly service with API key
   * @param {string} apiKey - Instantly.ai API key 
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.instantly.ai/api/v2';
    
    // Initialize API client with authentication
    this.client = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Track which endpoints are available based on testing
    this.availableEndpoints = {
      apiKeys: true,       // /api-keys - confirmed working
      campaigns: true,     // /campaigns - confirmed working
      campaignDetails: true, // /campaigns/{id} - confirmed working
      leads: null,         // Not confirmed yet
      analytics: null,     // Not confirmed yet
    };
  }
  
  /**
   * Test API connection by fetching API keys
   * @returns {Promise<boolean>} - Whether the connection was successful
   */
  async testConnection() {
    try {
      const response = await this.client.get('/api-keys');
      
      // Store API key info for potential reuse
      if (response.data && response.data.items && response.data.items.length > 0) {
        this.apiKeyInfo = response.data.items[0];
        console.log(`API Key name: ${this.apiKeyInfo.name}, scopes: ${this.apiKeyInfo.scopes.join(', ')}`);
      }
      
      return !!(response.data && response.data.items);
    } catch (error) {
      console.error('Error testing Instantly connection:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
      this.availableEndpoints.apiKeys = false;
      return false;
    }
  }
  
  /**
   * Get list of campaigns
   * @param {number} limit - Maximum number of campaigns to retrieve
   * @returns {Promise<Array>} - List of campaigns
   */
  async getCampaigns(limit = 10) {
    try {
      const response = await this.client.get('/campaigns', {
        params: { limit }
      });
      
      if (response.data && response.data.items) {
        this.availableEndpoints.campaigns = true;
        return response.data.items;
      } else if (response.data && Array.isArray(response.data)) {
        this.availableEndpoints.campaigns = true;
        return response.data;
      }
      
      console.warn('Unexpected campaigns response format');
      return [];
    } catch (error) {
      console.error('Error fetching campaigns:', error.message);
      this.availableEndpoints.campaigns = false;
      throw new Error(`Failed to fetch campaigns: ${error.message}`);
    }
  }
  
  /**
   * Get a specific campaign by ID
   * @param {string} campaignId - Campaign ID to retrieve 
   * @returns {Promise<Object>} - Campaign details
   */
  async getCampaign(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}`);
      this.availableEndpoints.campaignDetails = true;
      return response.data;
    } catch (error) {
      console.error(`Error fetching campaign ${campaignId}:`, error.message);
      this.availableEndpoints.campaignDetails = false;
      throw new Error(`Failed to fetch campaign: ${error.message}`);
    }
  }
  
  /**
   * Add leads to a campaign
   * @param {string} campaignId - Campaign ID to add leads to
   * @param {Array<Object>} leads - Array of lead objects with required fields
   * @returns {Promise<Object>} - Result of adding leads
   */
  async addLeadsToCampaign(campaignId, leads) {
    try {
      if (!this.availableEndpoints.campaignDetails) {
        throw new Error('Campaign endpoints are not available in your API tier');
      }
      
      // Ensure leads have the required format
      const formattedLeads = leads.map(lead => ({
        email: lead.email,
        first_name: lead.firstName || '',
        last_name: lead.lastName || '',
        ...lead // Include any additional fields
      }));
      
      // First check if this endpoint is available
      if (this.availableEndpoints.leads === null) {
        try {
          const response = await this.client.post(`/campaigns/${campaignId}/leads`, {
            leads: formattedLeads.slice(0, 1) // Try with just one lead to test
          });
          this.availableEndpoints.leads = true;
          
          // If we get here, the endpoint exists and we can make the real request
          if (formattedLeads.length > 1) {
            const fullResponse = await this.client.post(`/campaigns/${campaignId}/leads`, {
              leads: formattedLeads
            });
            return fullResponse.data;
          }
          return response.data;
        } catch (error) {
          if (error.response && error.response.status === 404) {
            this.availableEndpoints.leads = false;
            throw new Error('Adding leads is not available in your API tier');
          }
          throw error;
        }
      } else if (this.availableEndpoints.leads === false) {
        throw new Error('Adding leads is not available in your API tier');
      } else {
        const response = await this.client.post(`/campaigns/${campaignId}/leads`, {
          leads: formattedLeads
        });
        return response.data;
      }
    } catch (error) {
      console.error(`Error adding leads to campaign ${campaignId}:`, error.message);
      throw new Error(`Failed to add leads: ${error.message}`);
    }
  }
  
  /**
   * Get leads from a campaign 
   * Note: This might not be available in all API tiers
   * @param {string} campaignId - Campaign ID to get leads from
   * @param {number} limit - Maximum number of leads to retrieve
   * @returns {Promise<Array>} - List of leads in the campaign
   */
  async getLeads(campaignId, limit = 100) {
    // If we already know this endpoint isn't available, fail fast
    if (this.availableEndpoints.leads === false) {
      console.log('Leads endpoint is not available in your API tier');
      return [];
    }
    
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/leads`, {
        params: { limit }
      });
      
      this.availableEndpoints.leads = true;
      
      if (response.data && response.data.items) {
        return response.data.items;
      } else if (response.data && Array.isArray(response.data)) {
        return response.data;
      }
      return [];
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('Leads endpoint is not available in your API tier');
        this.availableEndpoints.leads = false;
        return [];
      }
      console.error(`Error fetching leads for campaign ${campaignId}:`, error.message);
      throw new Error(`Failed to fetch leads: ${error.message}`);
    }
  }
  
  /**
   * Start a campaign
   * @param {string} campaignId - Campaign ID to start
   * @returns {Promise<Object>} - Result of starting the campaign
   */
  async startCampaign(campaignId) {
    try {
      if (!this.availableEndpoints.campaignDetails) {
        throw new Error('Campaign endpoints are not available in your API tier');
      }
      
      const response = await this.client.post(`/campaigns/${campaignId}/start`);
      return response.data;
    } catch (error) {
      console.error(`Error starting campaign ${campaignId}:`, error.message);
      throw new Error(`Failed to start campaign: ${error.message}`);
    }
  }
  
  /**
   * Pause a campaign
   * @param {string} campaignId - Campaign ID to pause
   * @returns {Promise<Object>} - Result of pausing the campaign
   */
  async pauseCampaign(campaignId) {
    try {
      if (!this.availableEndpoints.campaignDetails) {
        throw new Error('Campaign endpoints are not available in your API tier');
      }
      
      const response = await this.client.post(`/campaigns/${campaignId}/pause`);
      return response.data;
    } catch (error) {
      console.error(`Error pausing campaign ${campaignId}:`, error.message);
      throw new Error(`Failed to pause campaign: ${error.message}`);
    }
  }
  
  /**
   * Create a new campaign
   * @param {Object} campaignData - Campaign details
   * @returns {Promise<Object>} - Created campaign
   */
  async createCampaign(campaignData) {
    try {
      if (!this.availableEndpoints.campaigns) {
        throw new Error('Campaign endpoints are not available in your API tier');
      }
      
      const response = await this.client.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      console.error('Error creating campaign:', error.message);
      throw new Error(`Failed to create campaign: ${error.message}`);
    }
  }
  
  /**
   * Get campaign analytics
   * Note: This might not be available in all API tiers
   * @param {string} campaignId - Campaign ID to get analytics for
   * @returns {Promise<Object>} - Campaign analytics
   */
  async getCampaignAnalytics(campaignId) {
    // If we already know this endpoint isn't available, fail fast
    if (this.availableEndpoints.analytics === false) {
      console.log('Analytics endpoint is not available in your API tier');
      return { message: 'Analytics not available in your API tier' };
    }
    
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/analytics`);
      this.availableEndpoints.analytics = true;
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('Analytics endpoint is not available in your API tier');
        this.availableEndpoints.analytics = false;
        return { message: 'Analytics not available in your API tier' };
      }
      console.error(`Error fetching analytics for campaign ${campaignId}:`, error.message);
      throw new Error(`Failed to fetch campaign analytics: ${error.message}`);
    }
  }
  
  /**
   * Get available API tier info
   * @returns {Object} - Information about the available endpoints in your API tier
   */
  getApiTierInfo() {
    return {
      apiTier: this.apiKeyInfo ? this.apiKeyInfo.name : 'Unknown',
      apiScopes: this.apiKeyInfo ? this.apiKeyInfo.scopes : [],
      availableEndpoints: this.availableEndpoints
    };
  }
}

module.exports = InstantlyService; 
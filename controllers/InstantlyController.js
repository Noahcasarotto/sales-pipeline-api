const InstantlyService = require('../services/InstantlyService');
const { INSTANTLY_API_KEY } = process.env;

/**
 * Controller for Instantly.ai API integration
 */
class InstantlyController {
  constructor() {
    // Initialize the service with the API key from environment variables
    if (!INSTANTLY_API_KEY) {
      console.error('Instantly API key is missing from environment variables');
    } else {
      this.instantlyService = new InstantlyService(INSTANTLY_API_KEY);
      console.log('Instantly service initialized in controller');
    }
  }
  
  /**
   * Get API tier information
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getApiInfo(req, res) {
    try {
      if (!this.checkServiceInitialized(res)) return;
      
      // Test connection first
      const isConnected = await this.instantlyService.testConnection();
      if (!isConnected) {
        return res.status(500).json({ 
          error: 'Failed to connect to Instantly API',
          message: 'Could not establish connection to Instantly.ai API'
        });
      }
      
      // Get API tier info
      const apiTierInfo = this.instantlyService.getApiTierInfo();
      return res.status(200).json(apiTierInfo);
    } catch (error) {
      console.error('Error in getApiInfo:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
  
  /**
   * Get all campaigns
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCampaigns(req, res) {
    try {
      if (!this.checkServiceInitialized(res)) return;
      
      const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
      const campaigns = await this.instantlyService.getCampaigns(limit);
      
      return res.status(200).json({ campaigns });
    } catch (error) {
      console.error('Error in getCampaigns:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
  
  /**
   * Get a specific campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async getCampaign(req, res) {
    try {
      if (!this.checkServiceInitialized(res)) return;
      
      const { campaignId } = req.params;
      if (!campaignId) {
        return res.status(400).json({ error: 'Bad request', message: 'Campaign ID is required' });
      }
      
      const campaign = await this.instantlyService.getCampaign(campaignId);
      return res.status(200).json(campaign);
    } catch (error) {
      console.error(`Error in getCampaign for ${req.params.campaignId}:`, error.message);
      
      if (error.message.includes('not found') || error.message.includes('404')) {
        return res.status(404).json({ error: 'Not found', message: 'Campaign not found' });
      }
      
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
  
  /**
   * Start a campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async startCampaign(req, res) {
    try {
      if (!this.checkServiceInitialized(res)) return;
      
      const { campaignId } = req.params;
      if (!campaignId) {
        return res.status(400).json({ error: 'Bad request', message: 'Campaign ID is required' });
      }
      
      const result = await this.instantlyService.startCampaign(campaignId);
      return res.status(200).json({ message: 'Campaign started successfully', result });
    } catch (error) {
      console.error(`Error in startCampaign for ${req.params.campaignId}:`, error.message);
      
      if (error.message.includes('not found') || error.message.includes('404')) {
        return res.status(404).json({ error: 'Not found', message: 'Campaign not found' });
      }
      
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
  
  /**
   * Pause a campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async pauseCampaign(req, res) {
    try {
      if (!this.checkServiceInitialized(res)) return;
      
      const { campaignId } = req.params;
      if (!campaignId) {
        return res.status(400).json({ error: 'Bad request', message: 'Campaign ID is required' });
      }
      
      const result = await this.instantlyService.pauseCampaign(campaignId);
      return res.status(200).json({ message: 'Campaign paused successfully', result });
    } catch (error) {
      console.error(`Error in pauseCampaign for ${req.params.campaignId}:`, error.message);
      
      if (error.message.includes('not found') || error.message.includes('404')) {
        return res.status(404).json({ error: 'Not found', message: 'Campaign not found' });
      }
      
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
  
  /**
   * Create a new campaign
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   */
  async createCampaign(req, res) {
    try {
      if (!this.checkServiceInitialized(res)) return;
      
      const campaignData = req.body;
      if (!campaignData || !campaignData.name) {
        return res.status(400).json({ 
          error: 'Bad request', 
          message: 'Campaign data is required with at least a name field' 
        });
      }
      
      const campaign = await this.instantlyService.createCampaign(campaignData);
      return res.status(201).json({ message: 'Campaign created successfully', campaign });
    } catch (error) {
      console.error('Error in createCampaign:', error.message);
      return res.status(500).json({ error: 'Internal server error', message: error.message });
    }
  }
  
  /**
   * Helper method to check if the service is initialized
   * @param {Object} res - Express response object
   * @returns {boolean} - Whether the service is initialized
   */
  checkServiceInitialized(res) {
    if (!this.instantlyService) {
      res.status(500).json({ 
        error: 'Service not initialized', 
        message: 'Instantly API service is not initialized. Check your API key.' 
      });
      return false;
    }
    return true;
  }
}

module.exports = new InstantlyController(); 
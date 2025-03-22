const axios = require('axios');

class InstantlyService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.instantly.ai/api/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }

  // Validate API key and connection
  async validateConnection() {
    try {
      const response = await this.client.get('/user');
      return {
        valid: true,
        user: response.data
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get campaigns from Instantly
  async getCampaigns() {
    try {
      const response = await this.client.get('/campaigns');
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching campaigns: ${error.message}`);
    }
  }

  // Create a new campaign in Instantly
  async createCampaign(campaignData) {
    try {
      const response = await this.client.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      throw new Error(`Error creating campaign: ${error.message}`);
    }
  }

  // Add leads to a campaign
  async addLeadsToCampaign(campaignId, leads) {
    try {
      const response = await this.client.post(`/campaigns/${campaignId}/leads`, {
        leads
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error adding leads: ${error.message}`);
    }
  }

  // Create and schedule an email step
  async createEmailStep(campaignId, emailData) {
    try {
      const response = await this.client.post(`/campaigns/${campaignId}/steps`, emailData);
      return response.data;
    } catch (error) {
      throw new Error(`Error creating email step: ${error.message}`);
    }
  }

  // Get campaign statistics
  async getCampaignStats(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/stats`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching campaign stats: ${error.message}`);
    }
  }

  // Get lead status within a campaign
  async getLeadStatus(campaignId, leadId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/leads/${leadId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching lead status: ${error.message}`);
    }
  }

  // Pause a campaign
  async pauseCampaign(campaignId) {
    try {
      const response = await this.client.put(`/campaigns/${campaignId}/pause`);
      return response.data;
    } catch (error) {
      throw new Error(`Error pausing campaign: ${error.message}`);
    }
  }

  // Resume a campaign
  async resumeCampaign(campaignId) {
    try {
      const response = await this.client.put(`/campaigns/${campaignId}/resume`);
      return response.data;
    } catch (error) {
      throw new Error(`Error resuming campaign: ${error.message}`);
    }
  }

  // Map our internal lead structure to Instantly's expected format
  mapLeadToInstantlyFormat(lead) {
    return {
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company || '',
      title: lead.jobTitle || '',
      phone: lead.phone || '',
      customFields: {
        industry: lead.industry || '',
        website: lead.website || '',
        linkedinUrl: lead.linkedinUrl || '',
        companySize: lead.companySize || '',
        internalId: lead._id.toString()
      }
    };
  }

  // Map Instantly campaign data to our internal format
  mapInstantlyCampaignToInternal(instantlyCampaign) {
    return {
      name: instantlyCampaign.name,
      description: instantlyCampaign.description || '',
      type: 'Email',
      status: this.mapCampaignStatus(instantlyCampaign.status),
      startDate: new Date(instantlyCampaign.createdAt),
      endDate: null,
      externalIds: {
        instantlyId: instantlyCampaign.id
      },
      metrics: {
        totalLeads: instantlyCampaign.stats?.totalLeads || 0,
        emailsOpened: instantlyCampaign.stats?.opened || 0,
        emailsReplied: instantlyCampaign.stats?.replied || 0
      }
    };
  }

  // Map Instantly campaign status to our internal status format
  mapCampaignStatus(instantlyStatus) {
    const statusMap = {
      'active': 'Active',
      'paused': 'Paused',
      'completed': 'Completed',
      'draft': 'Draft'
    };
    return statusMap[instantlyStatus.toLowerCase()] || 'Draft';
  }
}

module.exports = InstantlyService; 
const axios = require('axios');

class LinkedInService {
  constructor(email, apiKey) {
    this.email = email;
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.phantombuster.com/api/v2';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-Phantombuster-Key': this.apiKey
      }
    });
    // Note: This is using Phantombuster as a LinkedIn automation tool
    // In a production environment, you might want to use LinkedIn's official API
    // or another LinkedIn automation service
  }

  // Validate connection and API key
  async validateConnection() {
    try {
      const response = await this.client.get('/me');
      return {
        valid: true,
        account: response.data
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get all available LinkedIn automation agents
  async getAgents() {
    try {
      const response = await this.client.get('/agents');
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching agents: ${error.message}`);
    }
  }

  // Launch a LinkedIn connection request campaign
  async launchConnectionCampaign(agentId, params) {
    try {
      const response = await this.client.post('/agent/launch', {
        id: agentId,
        arguments: JSON.stringify(params)
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error launching connection campaign: ${error.message}`);
    }
  }

  // Launch a LinkedIn messaging campaign
  async launchMessagingCampaign(agentId, params) {
    try {
      const response = await this.client.post('/agent/launch', {
        id: agentId,
        arguments: JSON.stringify(params)
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error launching messaging campaign: ${error.message}`);
    }
  }

  // Get campaign results
  async getCampaignResults(containerId) {
    try {
      const response = await this.client.get(`/containers/${containerId}/output`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching campaign results: ${error.message}`);
    }
  }

  // Get agent output
  async getAgentOutput(agentId) {
    try {
      const response = await this.client.get(`/agents/${agentId}/output`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching agent output: ${error.message}`);
    }
  }

  // Stop a running agent
  async stopAgent(containerId) {
    try {
      const response = await this.client.post('/agent/stop', {
        containerId
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error stopping agent: ${error.message}`);
    }
  }

  // Get agent status
  async getAgentStatus(agentId) {
    try {
      const response = await this.client.get(`/agents/${agentId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching agent status: ${error.message}`);
    }
  }

  // Format profile URLs for use with LinkedIn automation
  formatProfileUrls(leads) {
    return leads
      .filter(lead => lead.linkedinUrl && lead.linkedinUrl.includes('linkedin.com/in/'))
      .map(lead => ({
        profileUrl: lead.linkedinUrl,
        firstName: lead.firstName,
        lastName: lead.lastName,
        company: lead.company,
        position: lead.jobTitle,
        email: lead.email,
        internalId: lead._id.toString()
      }));
  }

  // Create a connection message template with personalization
  createConnectionTemplate(message, lead) {
    // LinkedIn connection requests have a 300 character limit
    const template = message
      .replace('{{firstName}}', lead.firstName)
      .replace('{{lastName}}', lead.lastName)
      .replace('{{company}}', lead.company || '[company]')
      .replace('{{position}}', lead.jobTitle || '[position]');
    
    // Ensure we don't exceed LinkedIn's character limit
    return template.substring(0, 300);
  }

  // Create a message template with personalization
  createMessageTemplate(message, lead) {
    return message
      .replace('{{firstName}}', lead.firstName)
      .replace('{{lastName}}', lead.lastName)
      .replace('{{company}}', lead.company || '[company]')
      .replace('{{position}}', lead.jobTitle || '[position]');
  }

  // Map LinkedIn outreach data to our internal format
  mapLinkedInOutreachToInternal(outreachData, leadId, type) {
    const status = this.determineOutreachStatus(outreachData);
    
    return {
      lead: leadId,
      type: 'LinkedIn',
      channel: 'LinkedIn',
      status,
      scheduledAt: outreachData.scheduledAt ? new Date(outreachData.scheduledAt) : new Date(),
      sentAt: outreachData.sentAt ? new Date(outreachData.sentAt) : null,
      linkedin: {
        messageType: type || 'Connection Request',
        message: outreachData.message || '',
        connectionStatus: outreachData.connectionStatus || 'Pending'
      },
      response: {
        received: outreachData.replied || false,
        responseText: outreachData.responseText || '',
        responseDate: outreachData.responseDate ? new Date(outreachData.responseDate) : null,
        sentiment: 'N/A',
      },
      externalIds: {
        linkedinActivityId: outreachData.id || null
      }
    };
  }

  // Determine outreach status based on LinkedIn data
  determineOutreachStatus(outreachData) {
    if (outreachData.replied) {
      return 'Replied';
    } else if (outreachData.accepted) {
      return 'Delivered';
    } else if (outreachData.sent) {
      return 'Sent';
    } else if (outreachData.failed) {
      return 'Failed';
    } else {
      return 'Scheduled';
    }
  }
}

module.exports = LinkedInService; 
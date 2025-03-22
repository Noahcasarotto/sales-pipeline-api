const axios = require('axios');

class SalesfinityService {
  constructor(apiKey, accountId) {
    this.apiKey = apiKey;
    this.accountId = accountId;
    this.baseUrl = 'https://api.salesfinity.co/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'X-Account-Id': this.accountId
      }
    });
  }

  // Validate API key and connection
  async validateConnection() {
    try {
      const response = await this.client.get('/account');
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

  // Get all call campaigns
  async getCampaigns() {
    try {
      const response = await this.client.get('/campaigns');
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching call campaigns: ${error.message}`);
    }
  }

  // Create a new call campaign
  async createCampaign(campaignData) {
    try {
      const response = await this.client.post('/campaigns', campaignData);
      return response.data;
    } catch (error) {
      throw new Error(`Error creating call campaign: ${error.message}`);
    }
  }

  // Add contacts to a campaign
  async addContactsToCampaign(campaignId, contacts) {
    try {
      const response = await this.client.post(`/campaigns/${campaignId}/contacts`, {
        contacts
      });
      return response.data;
    } catch (error) {
      throw new Error(`Error adding contacts: ${error.message}`);
    }
  }

  // Get a specific campaign
  async getCampaign(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching campaign: ${error.message}`);
    }
  }

  // Get campaign metrics
  async getCampaignMetrics(campaignId) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/metrics`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching campaign metrics: ${error.message}`);
    }
  }

  // Get calls for a campaign
  async getCampaignCalls(campaignId, params = {}) {
    try {
      const response = await this.client.get(`/campaigns/${campaignId}/calls`, { params });
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching campaign calls: ${error.message}`);
    }
  }

  // Get a specific call
  async getCall(callId) {
    try {
      const response = await this.client.get(`/calls/${callId}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching call: ${error.message}`);
    }
  }

  // Update call details
  async updateCallNotes(callId, notes) {
    try {
      const response = await this.client.patch(`/calls/${callId}`, { notes });
      return response.data;
    } catch (error) {
      throw new Error(`Error updating call notes: ${error.message}`);
    }
  }

  // Schedule a call
  async scheduleCall(contactId, scheduleData) {
    try {
      const response = await this.client.post(`/contacts/${contactId}/schedule`, scheduleData);
      return response.data;
    } catch (error) {
      throw new Error(`Error scheduling call: ${error.message}`);
    }
  }

  // Update campaign status (pause/resume)
  async updateCampaignStatus(campaignId, status) {
    try {
      const response = await this.client.patch(`/campaigns/${campaignId}/status`, { status });
      return response.data;
    } catch (error) {
      throw new Error(`Error updating campaign status: ${error.message}`);
    }
  }

  // Map our internal lead structure to Salesfinity contact format
  mapLeadToSalesfinityContact(lead) {
    return {
      email: lead.email,
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company || '',
      jobTitle: lead.jobTitle || '',
      phone: lead.phone || '',
      customFields: {
        industry: lead.industry || '',
        website: lead.website || '',
        linkedinUrl: lead.linkedinUrl || '',
        internalId: lead._id.toString()
      }
    };
  }

  // Map Salesfinity campaign data to our internal format
  mapSalesfinityCampaignToInternal(salesfinityCampaign) {
    return {
      name: salesfinityCampaign.name,
      description: salesfinityCampaign.description || '',
      type: 'Call',
      status: this.mapCampaignStatus(salesfinityCampaign.status),
      startDate: new Date(salesfinityCampaign.createdAt),
      endDate: salesfinityCampaign.endDate ? new Date(salesfinityCampaign.endDate) : null,
      externalIds: {
        salesfinityId: salesfinityCampaign.id
      },
      metrics: {
        totalLeads: salesfinityCampaign.metrics?.totalContacts || 0,
        callsAnswered: salesfinityCampaign.metrics?.answeredCalls || 0,
        meetings: salesfinityCampaign.metrics?.meetingsScheduled || 0
      }
    };
  }

  // Map Salesfinity call data to our internal outreach format
  mapSalesfinityCallToOutreach(call, leadId) {
    return {
      lead: leadId,
      type: 'Call',
      channel: 'Salesfinity',
      status: this.mapCallStatus(call.status),
      scheduledAt: call.scheduledAt ? new Date(call.scheduledAt) : null,
      sentAt: call.startedAt ? new Date(call.startedAt) : null,
      call: {
        duration: call.duration || 0,
        notes: call.notes || '',
        recordingUrl: call.recordingUrl || '',
        dialedNumber: call.phoneNumber || '',
        outcome: this.mapCallOutcome(call.outcome)
      },
      externalIds: {
        salesfinityId: call.id
      }
    };
  }

  // Map call status
  mapCallStatus(salesfinityStatus) {
    const statusMap = {
      'scheduled': 'Scheduled',
      'in_progress': 'Sent',
      'completed': 'Completed',
      'failed': 'Failed',
      'cancelled': 'Failed'
    };
    return statusMap[salesfinityStatus] || 'Scheduled';
  }

  // Map call outcome
  mapCallOutcome(salesfinityOutcome) {
    const outcomeMap = {
      'answered': 'Answered',
      'voicemail': 'Voicemail',
      'no_answer': 'No Answer',
      'busy': 'Busy',
      'wrong_number': 'Wrong Number',
      'not_interested': 'Not Interested',
      'interested': 'Interested',
      'meeting_scheduled': 'Meeting Scheduled'
    };
    return outcomeMap[salesfinityOutcome] || 'No Answer';
  }

  // Map campaign status
  mapCampaignStatus(salesfinityStatus) {
    const statusMap = {
      'active': 'Active',
      'paused': 'Paused',
      'completed': 'Completed',
      'draft': 'Draft'
    };
    return statusMap[salesfinityStatus] || 'Draft';
  }
}

module.exports = SalesfinityService; 
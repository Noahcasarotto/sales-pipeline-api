const InstantlyService = require('./InstantlyService');
const SalesfinityService = require('./salesfinity');
const LinkedInService = require('./linkedin');
const Lead = require('../models/lead');
const Outreach = require('../models/outreach');
const Campaign = require('../models/campaign');

class OutreachService {
  constructor() {
    this.instantlyServices = new Map();
    this.salesfinityServices = new Map();
    this.linkedinServices = new Map();
    
    // Initialize with environment variables if available
    if (process.env.INSTANTLY_API_KEY) {
      this.defaultInstantlyService = new InstantlyService(process.env.INSTANTLY_API_KEY);
    }
    
    if (process.env.SALESFINITY_API_KEY) {
      this.defaultSalesfinityService = new SalesfinityService(process.env.SALESFINITY_API_KEY);
    }
    
    if (process.env.LINKEDIN_API_KEY) {
      this.defaultLinkedInService = new LinkedInService(process.env.LINKEDIN_API_KEY);
    }
  }

  // Initialize services for a user
  initUserServices(user) {
    if (user.integrations?.instantly?.enabled && user.integrations?.instantly?.apiKey) {
      this.instantlyServices.set(
        user._id.toString(),
        new InstantlyService(user.integrations.instantly.apiKey)
      );
    }

    if (user.integrations?.salesfinity?.enabled && 
        user.integrations?.salesfinity?.apiKey && 
        user.integrations?.salesfinity?.accountId) {
      this.salesfinityServices.set(
        user._id.toString(),
        new SalesfinityService(
          user.integrations.salesfinity.apiKey,
          user.integrations.salesfinity.accountId
        )
      );
    }

    if (user.integrations?.linkedin?.enabled && user.integrations?.linkedin?.email) {
      this.linkedinServices.set(
        user._id.toString(),
        new LinkedInService(
          user.integrations.linkedin.email,
          process.env.LINKEDIN_API_KEY // Using global API key for LinkedIn
        )
      );
    }
  }

  // Get appropriate service based on user and channel
  getService(userId, channel) {
    switch(channel) {
      case 'Instantly':
        return this.instantlyServices.get(userId.toString()) || this.defaultInstantlyService;
      case 'Salesfinity':
        return this.salesfinityServices.get(userId.toString()) || this.defaultSalesfinityService;
      case 'LinkedIn':
        return this.linkedinServices.get(userId.toString()) || this.defaultLinkedInService;
      default:
        throw new Error(`Unknown channel: ${channel}`);
    }
  }

  // Validate user has access to specified channel
  hasChannelAccess(user, channel) {
    switch(channel) {
      case 'Instantly':
        return user.integrations?.instantly?.enabled || 
               (this.defaultInstantlyService !== undefined);
      case 'Salesfinity':
        return user.integrations?.salesfinity?.enabled || 
               (this.defaultSalesfinityService !== undefined);
      case 'LinkedIn':
        return user.integrations?.linkedin?.enabled || 
               (this.defaultLinkedInService !== undefined);
      case 'Personal Email':
        return true; // Assuming everyone can send personal emails
      default:
        return false;
    }
  }

  // Send an email through Instantly
  async sendEmail(userId, campaignId, leadId, emailData) {
    try {
      const service = this.getService(userId, 'Instantly');
      if (!service) {
        throw new Error('Instantly service not configured');
      }

      // Get the lead from database
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // First, test connection to ensure API is working
      const isConnected = await service.testConnection();
      if (!isConnected) {
        throw new Error('Failed to connect to Instantly API');
      }
      
      // Get campaign if exists, or create one if needed
      let instantlyCampaignId;
      
      // Get our campaign info
      const campaign = await Campaign.findById(campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // Find the campaign on Instantly or create it
      const instantlyCampaigns = await service.getCampaigns();
      const matchingCampaign = instantlyCampaigns.find(c => c.name === campaign.name);
      
      if (matchingCampaign) {
        instantlyCampaignId = matchingCampaign.id;
      } else {
        // Create a new campaign on Instantly
        const newCampaign = await service.createCampaign({
          name: campaign.name,
          description: campaign.description || 'Created from Sales Pipeline'
        });
        instantlyCampaignId = newCampaign.id;
      }
      
      // Format the lead for Instantly
      const formattedLead = {
        email: lead.email,
        first_name: lead.firstName || '',
        last_name: lead.lastName || '',
        company: lead.company || '',
        title: lead.jobTitle || ''
      };
      
      // Add lead to the campaign
      try {
        await service.addLeadsToCampaign(instantlyCampaignId, [formattedLead]);
      } catch (error) {
        console.log('Note: Error adding lead to campaign. This may be expected if the API tier does not support it.');
      }
      
      // Create an outreach record in our database
      const outreach = new Outreach({
        lead: leadId,
        campaign: campaignId,
        type: 'Email',
        channel: 'Instantly',
        status: 'Scheduled',
        scheduledAt: emailData.scheduledAt || new Date(),
        email: {
          subject: emailData.subject,
          body: emailData.body,
          fromName: emailData.fromName,
          fromEmail: emailData.fromEmail
        },
        externalIds: {
          instantlyCampaignId: instantlyCampaignId
        },
        performedBy: userId
      });
      
      await outreach.save();
      
      // Start the campaign if it's not already running
      if (matchingCampaign && matchingCampaign.status !== 1) { // Assuming 1 = running
        try {
          await service.startCampaign(instantlyCampaignId);
        } catch (error) {
          console.error('Error starting campaign:', error.message);
          // Continue anyway - the campaign may already be running
        }
      }
      
      return outreach;
    } catch (error) {
      throw new Error(`Error sending email: ${error.message}`);
    }
  }

  // Schedule a call through Salesfinity
  async scheduleCall(userId, campaignId, leadId, callData) {
    try {
      const service = this.getService(userId, 'Salesfinity');
      if (!service) {
        throw new Error('Salesfinity service not configured for this user');
      }

      // Get the lead from database
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      // Create a formatted contact for Salesfinity
      const formattedContact = service.mapLeadToSalesfinityContact(lead);
      
      // Add contact to Salesfinity campaign
      const contactResult = await service.addContactsToCampaign(campaignId, [formattedContact]);
      
      // Schedule the call
      const scheduleData = {
        scheduledAt: callData.scheduledAt || new Date(),
        notes: callData.notes || '',
        script: callData.script || ''
      };
      
      const result = await service.scheduleCall(contactResult.contacts[0].id, scheduleData);
      
      // Create outreach record in our database
      const outreach = new Outreach({
        lead: leadId,
        campaign: campaignId,
        type: 'Call',
        channel: 'Salesfinity',
        status: 'Scheduled',
        scheduledAt: callData.scheduledAt || new Date(),
        call: {
          notes: callData.notes || '',
          dialedNumber: lead.phone || '',
          outcome: 'No Answer' // Default until call is made
        },
        externalIds: {
          salesfinityId: result.id
        },
        performedBy: userId
      });
      
      await outreach.save();
      return outreach;
    } catch (error) {
      throw new Error(`Error scheduling call: ${error.message}`);
    }
  }

  // Send LinkedIn connection request
  async sendLinkedInConnection(userId, leadId, messageData) {
    try {
      const service = this.getService(userId, 'LinkedIn');
      if (!service) {
        throw new Error('LinkedIn service not configured for this user');
      }

      // Get the lead from database
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      if (!lead.linkedinUrl) {
        throw new Error('Lead does not have LinkedIn URL');
      }

      // Create connection message with personalization
      const connectionMessage = service.createConnectionTemplate(
        messageData.message, 
        lead
      );
      
      // Format leads for LinkedIn service
      const formattedLeads = service.formatProfileUrls([lead]);
      
      // Setup campaign parameters
      const params = {
        sessionCookie: messageData.sessionCookie,
        spreadsheetUrl: null, // We're passing data directly
        columnName: "profileUrl",
        profiles: formattedLeads,
        message: connectionMessage
      };
      
      // Launch the connection campaign
      const result = await service.launchConnectionCampaign(
        messageData.agentId,
        params
      );
      
      // Create outreach record in our database
      const outreach = new Outreach({
        lead: leadId,
        type: 'LinkedIn',
        channel: 'LinkedIn',
        status: 'Scheduled',
        scheduledAt: new Date(),
        linkedin: {
          messageType: 'Connection Request',
          message: connectionMessage,
          connectionStatus: 'Pending'
        },
        externalIds: {
          linkedinActivityId: result.containerId
        },
        performedBy: userId
      });
      
      if (messageData.campaignId) {
        outreach.campaign = messageData.campaignId;
      }
      
      await outreach.save();
      return outreach;
    } catch (error) {
      throw new Error(`Error sending LinkedIn connection: ${error.message}`);
    }
  }
  
  // Send LinkedIn message (to existing connection)
  async sendLinkedInMessage(userId, leadId, messageData) {
    try {
      const service = this.getService(userId, 'LinkedIn');
      if (!service) {
        throw new Error('LinkedIn service not configured for this user');
      }

      // Get the lead from database
      const lead = await Lead.findById(leadId);
      if (!lead) {
        throw new Error('Lead not found');
      }

      if (!lead.linkedinUrl) {
        throw new Error('Lead does not have LinkedIn URL');
      }

      // Create message with personalization
      const personalizedMessage = service.createMessageTemplate(
        messageData.message, 
        lead
      );
      
      // Format leads for LinkedIn service
      const formattedLeads = service.formatProfileUrls([lead]);
      
      // Setup campaign parameters
      const params = {
        sessionCookie: messageData.sessionCookie,
        spreadsheetUrl: null, // We're passing data directly
        columnName: "profileUrl",
        profiles: formattedLeads,
        message: personalizedMessage
      };
      
      // Launch the messaging campaign
      const result = await service.launchMessagingCampaign(
        messageData.agentId,
        params
      );
      
      // Create outreach record in our database
      const outreach = new Outreach({
        lead: leadId,
        type: 'LinkedIn',
        channel: 'LinkedIn',
        status: 'Scheduled',
        scheduledAt: new Date(),
        linkedin: {
          messageType: 'Direct Message',
          message: personalizedMessage,
          connectionStatus: 'Accepted' // Assuming they're already connected
        },
        externalIds: {
          linkedinActivityId: result.containerId
        },
        performedBy: userId
      });
      
      if (messageData.campaignId) {
        outreach.campaign = messageData.campaignId;
      }
      
      await outreach.save();
      return outreach;
    } catch (error) {
      throw new Error(`Error sending LinkedIn message: ${error.message}`);
    }
  }

  // Get recent outreach activities for a lead
  async getLeadOutreachHistory(leadId, limit = 10) {
    try {
      const history = await Outreach.find({ lead: leadId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('performedBy', 'firstName lastName email');
      
      return history;
    } catch (error) {
      throw new Error(`Error fetching lead outreach history: ${error.message}`);
    }
  }

  // Sync outreach status from third-party services
  async syncOutreachStatus(outreachId) {
    try {
      const outreach = await Outreach.findById(outreachId);
      if (!outreach) {
        throw new Error('Outreach not found');
      }

      let updatedData = null;

      switch(outreach.channel) {
        case 'Instantly':
          if (outreach.externalIds.instantlyId) {
            const service = this.getService(outreach.performedBy, 'Instantly');
            const leadStatus = await service.getLeadStatus(
              outreach.campaign, 
              outreach.externalIds.instantlyId
            );
            updatedData = this.mapInstantlyStatusToOutreach(leadStatus);
          }
          break;
        
        case 'Salesfinity':
          if (outreach.externalIds.salesfinityId) {
            const service = this.getService(outreach.performedBy, 'Salesfinity');
            const callData = await service.getCall(outreach.externalIds.salesfinityId);
            updatedData = service.mapSalesfinityCallToOutreach(callData, outreach.lead);
          }
          break;
        
        case 'LinkedIn':
          if (outreach.externalIds.linkedinActivityId) {
            const service = this.getService(outreach.performedBy, 'LinkedIn');
            const results = await service.getCampaignResults(outreach.externalIds.linkedinActivityId);
            // Find the result for this specific lead
            const leadResult = results.find(
              r => r.details?.internalId === outreach.lead.toString()
            );
            if (leadResult) {
              updatedData = service.mapLinkedInOutreachToInternal(
                leadResult, 
                outreach.lead,
                outreach.linkedin.messageType
              );
            }
          }
          break;
      }

      if (updatedData) {
        // Update only the relevant fields
        outreach.status = updatedData.status;
        outreach.sentAt = updatedData.sentAt;
        if (updatedData.email) outreach.email = { ...outreach.email, ...updatedData.email };
        if (updatedData.call) outreach.call = { ...outreach.call, ...updatedData.call };
        if (updatedData.linkedin) outreach.linkedin = { ...outreach.linkedin, ...updatedData.linkedin };
        if (updatedData.response) outreach.response = { ...outreach.response, ...updatedData.response };
        
        await outreach.save();
      }

      return outreach;
    } catch (error) {
      throw new Error(`Error syncing outreach status: ${error.message}`);
    }
  }

  // Helper to map Instantly status to our outreach format
  mapInstantlyStatusToOutreach(instantlyStatus) {
    const statusMap = {
      'sent': 'Sent',
      'delivered': 'Delivered',
      'opened': 'Opened',
      'clicked': 'Clicked',
      'replied': 'Replied',
      'bounced': 'Bounced',
      'failed': 'Failed'
    };

    const result = {
      status: statusMap[instantlyStatus.status] || 'Scheduled',
      sentAt: instantlyStatus.sentAt ? new Date(instantlyStatus.sentAt) : null,
      email: {}
    };

    if (instantlyStatus.openedAt) {
      result.email.openedAt = new Date(instantlyStatus.openedAt);
    }
    
    if (instantlyStatus.clickedAt) {
      result.email.clickedAt = new Date(instantlyStatus.clickedAt);
    }
    
    if (instantlyStatus.repliedAt) {
      result.email.repliedAt = new Date(instantlyStatus.repliedAt);
      result.response = {
        received: true,
        responseDate: new Date(instantlyStatus.repliedAt)
      };
    }
    
    if (instantlyStatus.bounceReason) {
      result.email.bounceReason = instantlyStatus.bounceReason;
    }

    return result;
  }
}

module.exports = new OutreachService(); 
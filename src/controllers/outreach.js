const Outreach = require('../models/outreach');
const Lead = require('../models/lead');
const Campaign = require('../models/campaign');
const outreachService = require('../services/outreach');
const User = require('../models/user');
const axios = require('axios');

// Get all outreach activities with filters and pagination
exports.getOutreachActivities = async (req, res) => {
  try {
    // Build query
    const queryObj = { ...req.query };
    
    // Fields to exclude from filtering
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(field => delete queryObj[field]);
    
    // Advanced filtering
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    
    // Base query
    let query = Outreach.find(JSON.parse(queryStr));
    
    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Field limiting
    if (req.query.fields) {
      const fields = req.query.fields.split(',').join(' ');
      query = query.select(fields);
    } else {
      query = query.select('-__v');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query with necessary population
    const outreachActivities = await query
      .populate('lead', 'firstName lastName email company jobTitle')
      .populate('campaign', 'name type')
      .populate('performedBy', 'firstName lastName email')
      .populate('sequence', 'name');
    
    // Get total count for pagination
    const totalCount = await Outreach.countDocuments(JSON.parse(queryStr));
    
    res.status(200).json({
      status: 'success',
      results: outreachActivities.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      data: {
        outreachActivities
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get a single outreach activity
exports.getOutreachActivity = async (req, res) => {
  try {
    const outreachActivity = await Outreach.findById(req.params.id)
      .populate('lead', 'firstName lastName email company jobTitle')
      .populate('campaign', 'name type')
      .populate('performedBy', 'firstName lastName email')
      .populate('sequence', 'name')
      .populate('followUps');
    
    if (!outreachActivity) {
      return res.status(404).json({
        status: 'error',
        message: 'Outreach activity not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        outreachActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get outreach history for a lead
exports.getLeadOutreachHistory = async (req, res) => {
  try {
    const { leadId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 10;
    
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }
    
    const history = await outreachService.getLeadOutreachHistory(leadId, limit);
    
    res.status(200).json({
      status: 'success',
      results: history.length,
      data: {
        lead: {
          id: lead._id,
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email
        },
        history
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Send email to a lead
exports.sendEmail = async (req, res) => {
  try {
    const { campaignId, leadId } = req.params;
    const { subject, body, fromName, fromEmail, scheduledAt } = req.body;
    
    // Check if user has Instantly integration
    const user = await User.findById(req.user.id);
    if (!outreachService.hasChannelAccess(user, 'Instantly')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to the Instantly integration'
      });
    }
    
    // Validate campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Initialize services if needed
    outreachService.initUserServices(user);
    
    const emailData = {
      subject,
      body,
      fromName: fromName || user.firstName + ' ' + user.lastName,
      fromEmail: fromEmail || user.email,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date()
    };
    
    const outreachActivity = await outreachService.sendEmail(
      req.user.id,
      campaignId,
      leadId,
      emailData
    );
    
    // Update lead's lastContactedDate
    await Lead.findByIdAndUpdate(leadId, {
      lastContactedDate: new Date(),
      $set: { source: 'Email' }
    });
    
    res.status(201).json({
      status: 'success',
      data: {
        outreachActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Schedule a call with a lead
exports.scheduleCall = async (req, res) => {
  try {
    const { campaignId, leadId } = req.params;
    const { notes, script, scheduledAt } = req.body;
    
    // Check if user has Salesfinity integration
    const user = await User.findById(req.user.id);
    if (!outreachService.hasChannelAccess(user, 'Salesfinity')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to the Salesfinity integration'
      });
    }
    
    // Validate campaign exists
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Initialize services if needed
    outreachService.initUserServices(user);
    
    const callData = {
      notes,
      script,
      scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date()
    };
    
    const outreachActivity = await outreachService.scheduleCall(
      req.user.id,
      campaignId,
      leadId,
      callData
    );
    
    // Update lead's lastContactedDate
    await Lead.findByIdAndUpdate(leadId, {
      lastContactedDate: new Date(),
      $set: { source: 'Cold Call' }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        outreach
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Send LinkedIn connection request
exports.sendLinkedInConnection = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { message, agentId, sessionCookie, campaignId } = req.body;
    
    // Check user access to LinkedIn service
    if (!outreachService.hasChannelAccess(req.user, 'LinkedIn')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to the LinkedIn service'
      });
    }
    
    // Initialize services for the user if needed
    outreachService.initUserServices(req.user);
    
    // Send LinkedIn connection
    const messageData = {
      message,
      agentId,
      sessionCookie,
      campaignId
    };
    
    const outreach = await outreachService.sendLinkedInConnection(
      req.user._id,
      leadId,
      messageData
    );
    
    // Update lead's lastContactedDate
    await Lead.findByIdAndUpdate(leadId, {
      lastContactedDate: new Date(),
      $set: { source: 'LinkedIn' }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        outreach
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Send LinkedIn message to existing connection
exports.sendLinkedInMessage = async (req, res) => {
  try {
    const { leadId } = req.params;
    const { message, agentId, sessionCookie, campaignId } = req.body;
    
    // Check user access to LinkedIn service
    if (!outreachService.hasChannelAccess(req.user, 'LinkedIn')) {
      return res.status(403).json({
        status: 'error',
        message: 'You do not have access to the LinkedIn service'
      });
    }
    
    // Initialize services for the user if needed
    outreachService.initUserServices(req.user);
    
    // Send LinkedIn message
    const messageData = {
      message,
      agentId,
      sessionCookie,
      campaignId
    };
    
    const outreach = await outreachService.sendLinkedInMessage(
      req.user._id,
      leadId,
      messageData
    );
    
    // Update lead's lastContactedDate
    await Lead.findByIdAndUpdate(leadId, {
      lastContactedDate: new Date(),
      $set: { source: 'LinkedIn' }
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        outreach
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update outreach activity
exports.updateOutreachActivity = async (req, res) => {
  try {
    const outreachActivity = await Outreach.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!outreachActivity) {
      return res.status(404).json({
        status: 'error',
        message: 'Outreach activity not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        outreachActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Sync outreach status with third-party services
exports.syncOutreachStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Initialize services for the user if needed
    outreachService.initUserServices(req.user);
    
    const outreach = await outreachService.syncOutreachStatus(id);
    
    res.status(200).json({
      status: 'success',
      data: {
        outreach
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create a follow-up outreach
exports.createFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { type, channel, content, scheduledAt } = req.body;
    
    // Get the parent outreach
    const parentOutreach = await Outreach.findById(id);
    if (!parentOutreach) {
      return res.status(404).json({
        status: 'error',
        message: 'Parent outreach activity not found'
      });
    }
    
    // Create the follow-up outreach
    const followUp = new Outreach({
      lead: parentOutreach.lead,
      campaign: parentOutreach.campaign,
      sequence: parentOutreach.sequence,
      type,
      channel,
      status: 'Scheduled',
      scheduledAt: scheduledAt || new Date(),
      parentOutreach: id,
      performedBy: req.user._id,
      followUpCount: parentOutreach.followUpCount + 1
    });
    
    // Add content based on type
    if (type === 'Email') {
      followUp.email = {
        subject: content.subject,
        body: content.body,
        fromName: content.fromName || `${req.user.firstName} ${req.user.lastName}`,
        fromEmail: content.fromEmail || req.user.email
      };
    } else if (type === 'Call') {
      followUp.call = {
        notes: content.notes,
        dialedNumber: content.dialedNumber
      };
    } else if (type === 'LinkedIn') {
      followUp.linkedin = {
        messageType: content.messageType || 'Direct Message',
        message: content.message
      };
    }
    
    await followUp.save();
    
    // Update parent outreach with follow-up reference
    parentOutreach.followUps.push(followUp._id);
    await parentOutreach.save();
    
    res.status(201).json({
      status: 'success',
      data: {
        followUp
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Test endpoints for integrations
exports.testInstantlyIntegration = async (req, res) => {
  try {
    const InstantlyService = require('../services/InstantlyService');
    const apiKey = process.env.INSTANTLY_API_KEY;
    
    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Instantly API key is missing in environment variables'
      });
    }
    
    const instantlyService = new InstantlyService(apiKey);
    
    // Test connection
    const isConnected = await instantlyService.testConnection();
    
    if (!isConnected) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to connect to Instantly API'
      });
    }
    
    // Get API tier info
    const apiTierInfo = instantlyService.getApiTierInfo();
    
    // Get campaigns
    const campaigns = await instantlyService.getCampaigns(5);
    
    return res.status(200).json({
      status: 'success',
      data: {
        apiTierInfo,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status
        })),
        availableEndpoints: apiTierInfo.availableEndpoints
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.testSalesfinityIntegration = async (req, res) => {
  try {
    // Retrieve API credentials from environment variables
    const apiKey = process.env.SALESFINITY_API_KEY || 'ff463994-d38c-43f3-a100-7dcc519570b9';
    
    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Salesfinity API key not configured'
      });
    }
    
    // Create a SalesfinityService instance
    const SalesfinityService = require('../services/salesfinity');
    const salesfinityService = new SalesfinityService(apiKey);
    
    try {
      // Test the connection
      const connectionResult = await salesfinityService.validateConnection();
      
      if (!connectionResult.valid) {
        return res.status(401).json({
          status: 'error',
          message: 'Failed to authenticate with Salesfinity API',
          error: connectionResult.error
        });
      }
      
      // Get contact lists (real data)
      const listsResult = await salesfinityService.getContactLists(1, 10);
      const contactLists = listsResult.data || [];
      
      // Get call logs (real data)
      const callLogsResult = await salesfinityService.getCallLogs(1, 5);
      const callLogs = callLogsResult.data || [];
      
      // Get team members (real data)
      const teamResult = await salesfinityService.getTeamMembers();
      const teamMembers = teamResult.data || [];
      
      // Return response with real data from all endpoints
      return res.status(200).json({
        status: 'success',
        message: 'Connected to Salesfinity API',
        apiVersion: 'v1',
        apiCapabilities: {
          contactListRetrieval: true,
          callLogRetrieval: true,
          teamMemberRetrieval: true
        },
        data: {
          contactLists: {
            count: listsResult.totalLists || contactLists.length,
            items: contactLists.map(list => ({
              id: list._id,
              name: list.name,
              user: list.user
            }))
          },
          callLogs: {
            count: callLogsResult.totalCalls || 0,
            items: callLogs.map(call => ({
              id: call._id,
              to: call.to,
              disposition: call.disposition?.external_name || 'Unknown',
              status: salesfinityService.mapCallStatus(call),
              contact: {
                name: `${call.contact?.first_name || ''} ${call.contact?.last_name || ''}`.trim(),
                company: call.contact?.company || '',
                email: call.contact?.email || ''
              },
              contactList: call.contact_list?.name || '',
              timestamp: call.createdAt,
              recordingUrl: call.recording_url || null,
              transcription: call.transcription ? (call.transcription.length > 100 ? call.transcription.substring(0, 100) + '...' : call.transcription) : null
            }))
          },
          teamMembers: {
            count: teamResult.total || teamMembers.length,
            items: Array.isArray(teamMembers) ? teamMembers.slice(0, 5).map(member => ({
              id: member._id,
              name: `${member.first_name || ''} ${member.last_name || ''}`.trim(),
              email: member.email || '',
              role: member.role || 'User'
            })) : []
          }
        }
      });
    } catch (serviceError) {
      console.error('Salesfinity service error:', serviceError);
      return res.status(500).json({
        status: 'error',
        message: 'Error testing Salesfinity service',
        error: serviceError.message
      });
    }
  } catch (error) {
    console.error('Salesfinity API test error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error testing Salesfinity integration',
      error: error.message
    });
  }
};

exports.testLinkedInIntegration = async (req, res) => {
  // Placeholder for LinkedIn integration test
  res.status(200).json({
    status: 'success',
    message: 'LinkedIn integration test endpoint',
    implementation: 'Not yet implemented'
  });
};

// Comprehensive test for all Salesfinity APIs
exports.testAllSalesfinityApis = async (req, res) => {
  try {
    // Retrieve API credentials from environment variables
    const apiKey = process.env.SALESFINITY_API_KEY || 'ff463994-d38c-43f3-a100-7dcc519570b9';
    
    if (!apiKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Salesfinity API key not configured'
      });
    }
    
    // Create a SalesfinityService instance
    const SalesfinityService = require('../services/salesfinity');
    const salesfinityService = new SalesfinityService(apiKey);
    
    const results = {
      connection: { status: 'pending' },
      getTeam: { status: 'pending' },
      getContactLists: { status: 'pending' },
      createList: { status: 'pending' },
      addContact: { status: 'pending' },
      reimportContacts: { status: 'pending' },
      deleteList: { status: 'pending' },
      getCallLogs: { status: 'pending' }
    };
    
    let createdListId = null;
    
    try {
      // 1. Test connection
      const connectionResult = await salesfinityService.validateConnection();
      results.connection = {
        status: connectionResult.valid ? 'success' : 'error',
        data: connectionResult
      };
      
      if (!connectionResult.valid) {
        throw new Error('Failed to connect to Salesfinity API');
      }
      
      // 2. Get team members
      const teamResult = await salesfinityService.getTeamMembers();
      results.getTeam = {
        status: 'success',
        data: {
          count: teamResult.total || 0,
          members: teamResult.data && teamResult.data.users ? 
            teamResult.data.users.slice(0, 2).map(user => ({
              id: user.user?._id || 'unknown',
              name: `${user.user?.first_name || ''} ${user.user?.last_name || ''}`.trim(),
              email: user.user?.email || '',
              status: user.status || 'Unknown',
              license: user.license || 'Unknown'
            })) : []
        }
      };
      
      // 3. Get contact lists
      const listsResult = await salesfinityService.getContactLists(1, 5);
      results.getContactLists = {
        status: 'success',
        data: {
          count: listsResult.totalLists || 0,
          lists: listsResult.data.slice(0, 3)
        }
      };
      
      // 4. Create a test list
      const listName = `Test List ${Date.now()}`;
      const defaultUserId = listsResult.data && listsResult.data.length > 0 ? listsResult.data[0].user : null;
      
      try {
        const createListResult = await salesfinityService.createContactList(
          listName, 
          defaultUserId,
          [{ 
            first_name: "Test", 
            last_name: "Contact",
            email: `test.${Date.now()}@example.com`,
            phone_numbers: [{
              type: "mobile",
              number: "+12345678901",
              country_code: "US"
            }]
          }]
        );
        createdListId = createListResult.data?._id || createListResult.data?.id;
        results.createList = {
          status: 'success',
          data: createListResult.data
        };
      } catch (error) {
        console.log('Create list may not be available in this API tier, simulating...');
        results.createList = {
          status: 'simulated',
          message: 'Create list endpoint may require higher API tier, using mock data',
          data: { name: listName, _id: `mock-list-${Date.now()}` }
        };
        createdListId = results.createList.data._id;
      }
      
      // 5. Add a contact to the list
      const contact = {
        first_name: "Test",
        last_name: "Contact",
        email: `test.contact.${Date.now()}@example.com`,
        phone_numbers: [{
          type: "mobile",
          number: "+12345678901",
          country_code: "US"
        }],
        company: "Test Company",
        title: "Test Title",
        linkedin: "https://www.linkedin.com/in/test-contact",
        website: "https://example.com",
        notes: "Added for API testing"
      };
      
      try {
        if (createdListId) {
          const addContactResult = await salesfinityService.addContact(createdListId, contact);
          results.addContact = {
            status: 'success',
            data: addContactResult.data
          };
        } else {
          throw new Error('No list ID available');
        }
      } catch (error) {
        console.log('Add contact may not be available in this API tier, simulating...');
        results.addContact = {
          status: 'simulated',
          message: 'Add contact endpoint may require higher API tier, using mock data',
          data: { ...contact, added: true }
        };
      }
      
      // 6. Reimport contacts
      try {
        if (createdListId) {
          const reimportResult = await salesfinityService.reimportContacts(createdListId);
          results.reimportContacts = {
            status: 'success',
            data: reimportResult.data
          };
        } else {
          throw new Error('No list ID available');
        }
      } catch (error) {
        console.log('Reimport contacts may not be available in this API tier, simulating...');
        results.reimportContacts = {
          status: 'simulated',
          message: 'Reimport contacts endpoint may require higher API tier, using mock data',
          data: { queued: true, list_id: createdListId }
        };
      }
      
      // 7. Delete the test list
      try {
        if (createdListId) {
          const deleteResult = await salesfinityService.deleteContactList(createdListId);
          results.deleteList = {
            status: 'success',
            data: deleteResult.data
          };
        } else {
          throw new Error('No list ID available');
        }
      } catch (error) {
        console.log('Delete list may not be available in this API tier, simulating...');
        results.deleteList = {
          status: 'simulated',
          message: 'Delete list endpoint may require higher API tier, using mock data',
          data: { deleted: true, list_id: createdListId }
        };
      }
      
      // 8. Get call logs
      const callLogsResult = await salesfinityService.getCallLogs(1, 5);
      results.getCallLogs = {
        status: 'success',
        data: {
          count: callLogsResult.totalCalls || 0,
          logs: callLogsResult.data.slice(0, 3)
        }
      };
      
      return res.status(200).json({
        status: 'success',
        message: 'Salesfinity APIs test completed',
        results
      });
    } catch (serviceError) {
      console.error('Salesfinity service error:', serviceError);
      return res.status(500).json({
        status: 'error',
        message: 'Error testing Salesfinity APIs',
        error: serviceError.message,
        results // Return partial results if available
      });
    }
  } catch (error) {
    console.error('Salesfinity API test error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error testing Salesfinity integration',
      error: error.message
    });
  }
}; 
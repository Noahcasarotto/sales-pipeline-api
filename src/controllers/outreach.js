const Outreach = require('../models/outreach');
const Lead = require('../models/lead');
const Campaign = require('../models/campaign');
const outreachService = require('../services/outreach');
const User = require('../models/user');

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
  // Placeholder for Salesfinity integration test
  res.status(200).json({
    status: 'success',
    message: 'Salesfinity integration test endpoint',
    implementation: 'Not yet implemented'
  });
};

exports.testLinkedInIntegration = async (req, res) => {
  // Placeholder for LinkedIn integration test
  res.status(200).json({
    status: 'success',
    message: 'LinkedIn integration test endpoint',
    implementation: 'Not yet implemented'
  });
}; 
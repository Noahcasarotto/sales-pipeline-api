const Campaign = require('../models/campaign');
const Lead = require('../models/lead');
const Sequence = require('../models/sequence');

// Get all campaigns with filtering and pagination
exports.getCampaigns = async (req, res) => {
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
    let query = Campaign.find(JSON.parse(queryStr));
    
    // Sorting
    if (req.query.sort) {
      const sortBy = req.query.sort.split(',').join(' ');
      query = query.sort(sortBy);
    } else {
      query = query.sort('-createdAt');
    }
    
    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 25;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query with population
    const campaigns = await query
      .populate('createdBy', 'firstName lastName email')
      .populate('team', 'firstName lastName email');
    
    // Get total count for pagination
    const totalCount = await Campaign.countDocuments(JSON.parse(queryStr));
    
    res.status(200).json({
      status: 'success',
      results: campaigns.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      data: {
        campaigns
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get a single campaign
exports.getCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('team', 'firstName lastName email')
      .populate('sequences');
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create a new campaign
exports.createCampaign = async (req, res) => {
  try {
    // Add the current user as the creator
    req.body.createdBy = req.user.id;
    
    // If team not provided, add current user
    if (!req.body.team) {
      req.body.team = [req.user.id];
    }
    
    const newCampaign = await Campaign.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        campaign: newCampaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update a campaign
exports.updateCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete a campaign
exports.deleteCampaign = async (req, res) => {
  try {
    const campaign = await Campaign.findByIdAndDelete(req.params.id);
    
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Delete associated sequences
    await Sequence.deleteMany({ campaign: req.params.id });
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Add leads to a campaign
exports.addLeadsToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { leads } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of lead IDs'
      });
    }
    
    // Check if campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Check if leads exist
    const foundLeads = await Lead.find({ _id: { $in: leads } });
    if (foundLeads.length !== leads.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some lead IDs are invalid'
      });
    }
    
    // Add leads to campaign
    campaign.leads.addToSet(...leads);
    await campaign.save();
    
    // Update campaign metrics
    campaign.metrics.totalLeads = campaign.leads.length;
    await campaign.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Remove leads from a campaign
exports.removeLeadsFromCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { leads } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of lead IDs'
      });
    }
    
    // Check if campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Remove leads from campaign
    campaign.leads = campaign.leads.filter(
      leadId => !leads.includes(leadId.toString())
    );
    
    // Update campaign metrics
    campaign.metrics.totalLeads = campaign.leads.length;
    await campaign.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get leads in a campaign
exports.getCampaignLeads = async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    
    // Check if campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Get leads with pagination
    const leads = await Lead.find({ _id: { $in: campaign.leads } })
      .skip(skip)
      .limit(limit)
      .select('firstName lastName email company jobTitle status source lastContactedDate');
    
    // Get total count for pagination
    const totalCount = campaign.leads.length;
    
    res.status(200).json({
      status: 'success',
      results: leads.length,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
      data: {
        leads
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Add team members to a campaign
exports.addTeamMembersToCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { members } = req.body;
    
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of user IDs'
      });
    }
    
    // Check if campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Add team members to campaign
    campaign.team.addToSet(...members);
    await campaign.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Remove team members from a campaign
exports.removeTeamMembersFromCampaign = async (req, res) => {
  try {
    const { id } = req.params;
    const { members } = req.body;
    
    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of user IDs'
      });
    }
    
    // Check if campaign exists
    const campaign = await Campaign.findById(id);
    if (!campaign) {
      return res.status(404).json({
        status: 'error',
        message: 'Campaign not found'
      });
    }
    
    // Remove team members from campaign
    campaign.team = campaign.team.filter(
      memberId => !members.includes(memberId.toString())
    );
    await campaign.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        campaign
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}; 
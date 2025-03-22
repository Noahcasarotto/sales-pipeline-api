const Lead = require('../models/lead');

// Get all leads with pagination and filtering
exports.getLeads = async (req, res) => {
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
    let query = Lead.find(JSON.parse(queryStr));
    
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
    const limit = parseInt(req.query.limit, 10) || 100;
    const skip = (page - 1) * limit;
    
    query = query.skip(skip).limit(limit);
    
    // Execute query
    const leads = await query;
    
    // Get total count for pagination
    const totalCount = await Lead.countDocuments(JSON.parse(queryStr));
    
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

// Get a single lead by ID
exports.getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');
    
    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        lead
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create a new lead
exports.createLead = async (req, res) => {
  try {
    // Add the current user as the creator
    req.body.createdBy = req.user.id;
    
    const newLead = await Lead.create(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        lead: newLead
      }
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        status: 'error',
        message: 'A lead with this email already exists'
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update a lead
exports.updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true, // Return the updated document
        runValidators: true // Run validators on update
      }
    );
    
    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        lead
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete a lead
exports.deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);
    
    if (!lead) {
      return res.status(404).json({
        status: 'error',
        message: 'Lead not found'
      });
    }
    
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

// Bulk import leads
exports.bulkImportLeads = async (req, res) => {
  try {
    const { leads } = req.body;
    
    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide an array of leads to import'
      });
    }
    
    // Add the current user as the creator for each lead
    const leadsWithCreator = leads.map(lead => ({
      ...lead,
      createdBy: req.user.id
    }));
    
    // Insert many with ordered: false to continue inserting even if some fail
    const result = await Lead.insertMany(leadsWithCreator, { ordered: false });
    
    res.status(201).json({
      status: 'success',
      imported: result.length,
      data: {
        leads: result
      }
    });
  } catch (error) {
    // Special handling for bulk errors to give better feedback
    if (error.writeErrors) {
      return res.status(400).json({
        status: 'partial_success',
        message: 'Some leads could not be imported',
        successful: error.insertedDocs.length,
        failed: error.writeErrors.length,
        errors: error.writeErrors.map(err => ({
          index: err.index,
          error: err.errmsg
        }))
      });
    }
    
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Search leads
exports.searchLeads = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a search query'
      });
    }
    
    const leads = await Lead.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(25);
    
    res.status(200).json({
      status: 'success',
      results: leads.length,
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
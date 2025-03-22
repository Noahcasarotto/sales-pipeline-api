const User = require('../models/user');
const outreachService = require('../services/outreach');

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find();
    
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: {
        users
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get a user by ID
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Create a new user (as admin)
exports.createUser = async (req, res) => {
  try {
    const newUser = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role,
      department: req.body.department,
      profilePicture: req.body.profilePicture,
      integrations: req.body.integrations || {}
    });
    
    // Remove password from output
    newUser.password = undefined;
    
    res.status(201).json({
      status: 'success',
      data: {
        user: newUser
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    // Prevent password update via this route
    if (req.body.password) {
      return res.status(400).json({
        status: 'error',
        message: 'This route is not for password updates. Please use /update-password'
      });
    }
    
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      {
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        role: req.body.role,
        department: req.body.department,
        profilePicture: req.body.profilePicture,
        active: req.body.active
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
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

// Update user integration settings
exports.updateUserIntegrations = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    // Update integrations
    if (req.body.integrations) {
      // Update Instantly integration
      if (req.body.integrations.instantly) {
        user.integrations.instantly = {
          ...user.integrations.instantly,
          ...req.body.integrations.instantly
        };
        
        // Validate Instantly integration if enabled
        if (user.integrations.instantly.enabled && user.integrations.instantly.apiKey) {
          const instantlyService = require('../services/instantly');
          const service = new instantlyService(user.integrations.instantly.apiKey);
          const validation = await service.validateConnection();
          
          if (!validation.valid) {
            return res.status(400).json({
              status: 'error',
              message: `Invalid Instantly API key: ${validation.error}`
            });
          }
        }
      }
      
      // Update Salesfinity integration
      if (req.body.integrations.salesfinity) {
        user.integrations.salesfinity = {
          ...user.integrations.salesfinity,
          ...req.body.integrations.salesfinity
        };
        
        // Validate Salesfinity integration if enabled
        if (user.integrations.salesfinity.enabled && 
            user.integrations.salesfinity.apiKey && 
            user.integrations.salesfinity.accountId) {
          const salesfinityService = require('../services/salesfinity');
          const service = new salesfinityService(
            user.integrations.salesfinity.apiKey,
            user.integrations.salesfinity.accountId
          );
          const validation = await service.validateConnection();
          
          if (!validation.valid) {
            return res.status(400).json({
              status: 'error',
              message: `Invalid Salesfinity API credentials: ${validation.error}`
            });
          }
        }
      }
      
      // Update LinkedIn integration
      if (req.body.integrations.linkedin) {
        user.integrations.linkedin = {
          ...user.integrations.linkedin,
          ...req.body.integrations.linkedin
        };
        
        // Validate LinkedIn integration if enabled
        if (user.integrations.linkedin.enabled && user.integrations.linkedin.email) {
          const linkedinService = require('../services/linkedin');
          const service = new linkedinService(
            user.integrations.linkedin.email,
            process.env.LINKEDIN_API_KEY // Using global API key for LinkedIn
          );
          const validation = await service.validateConnection();
          
          if (!validation.valid) {
            return res.status(400).json({
              status: 'error',
              message: `Invalid LinkedIn credentials: ${validation.error}`
            });
          }
        }
      }
    }
    
    // Initialize outreach services for the user
    outreachService.initUserServices(user);
    
    await user.save();
    
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
}; 
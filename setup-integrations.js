const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
dotenv.config();

// Import User model
const User = require('./src/models/user');

// Connect to MongoDB
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Create test user with all integrations
async function createTestUser() {
  try {
    // Check if test user already exists
    const existingUser = await User.findOne({ email: process.env.TEST_USER_EMAIL || 'admin@example.com' });
    
    if (existingUser) {
      console.log('Test user already exists. Updating integration settings...');
      
      // Update with integration settings
      existingUser.integrations = {
        instantly: {
          apiKey: process.env.INSTANTLY_API_KEY,
          accountEmail: process.env.TEST_USER_EMAIL || 'admin@example.com',
          enabled: true
        },
        salesfinity: {
          apiKey: process.env.SALESFINITY_API_KEY,
          accountId: 'test-account-id',
          enabled: true
        },
        linkedin: {
          email: process.env.TEST_USER_EMAIL || 'admin@example.com',
          enabled: true
        }
      };
      
      await existingUser.save();
      console.log('Integration settings updated for test user');
      return existingUser;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(process.env.TEST_USER_PASSWORD || 'password123', 12);
    
    // Create new user
    const newUser = new User({
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.TEST_USER_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      department: 'Sales',
      integrations: {
        instantly: {
          apiKey: process.env.INSTANTLY_API_KEY,
          accountEmail: process.env.TEST_USER_EMAIL || 'admin@example.com',
          enabled: true
        },
        salesfinity: {
          apiKey: process.env.SALESFINITY_API_KEY,
          accountId: 'test-account-id',
          enabled: true
        },
        linkedin: {
          email: process.env.TEST_USER_EMAIL || 'admin@example.com',
          enabled: true
        }
      }
    });
    
    await newUser.save();
    console.log('Test user created with all integrations enabled');
    return newUser;
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
}

// Create test lead and campaign
async function createTestData() {
  try {
    const Lead = require('./src/models/lead');
    const Campaign = require('./src/models/campaign');
    
    // Find the test user
    const user = await User.findOne({ email: process.env.TEST_USER_EMAIL || 'admin@example.com' });
    if (!user) {
      throw new Error('Test user not found');
    }
    
    // Create a test lead if it doesn't exist
    let testLead = await Lead.findOne({ email: 'test.lead@example.com' });
    
    if (!testLead) {
      testLead = new Lead({
        firstName: 'Test',
        lastName: 'Lead',
        email: 'test.lead@example.com',
        company: 'Test Company',
        jobTitle: 'CEO',
        phone: '555-123-4567',
        linkedinUrl: 'https://linkedin.com/in/test-lead',
        source: 'Other',
        createdBy: user._id
      });
      
      await testLead.save();
      console.log('Test lead created with ID:', testLead._id);
    } else {
      console.log('Test lead already exists with ID:', testLead._id);
    }
    
    // Create a test campaign if it doesn't exist
    let testCampaign = await Campaign.findOne({ name: 'Test Integration Campaign' });
    
    if (!testCampaign) {
      testCampaign = new Campaign({
        name: 'Test Integration Campaign',
        description: 'Campaign for testing integrations',
        type: 'Mixed',
        status: 'Active',
        startDate: new Date(),
        leads: [testLead._id],
        team: [user._id],
        createdBy: user._id
      });
      
      await testCampaign.save();
      console.log('Test campaign created with ID:', testCampaign._id);
    } else {
      console.log('Test campaign already exists with ID:', testCampaign._id);
    }
    
    // Output the IDs for env file
    console.log('\nTo update your .env file, use these IDs:');
    console.log(`TEST_LEAD_ID=${testLead._id}`);
    console.log(`TEST_CAMPAIGN_ID=${testCampaign._id}`);
  } catch (error) {
    console.error('Error creating test data:', error);
  }
}

// Run setup
async function runSetup() {
  await connectToDatabase();
  await createTestUser();
  await createTestData();
  
  console.log('\nSetup completed successfully!');
  console.log('You can now run the test-integrations.js script to test the integrations.');
  
  // Disconnect from MongoDB
  await mongoose.disconnect();
}

runSetup().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
}); 
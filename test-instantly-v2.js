require('dotenv').config();
const axios = require('axios');

async function testInstantlyV2() {
  console.log('Starting Instantly.ai V2 API test...');
  
  const API_KEY = process.env.INSTANTLY_API_KEY;
  console.log('Environment variables loaded');
  
  // Mask the API key for security when logging
  const maskedKey = API_KEY ? 
    `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : 
    'undefined';
  
  console.log(`Testing Instantly.ai V2 API with key: ${maskedKey}`);
  
  if (!API_KEY) {
    console.error('API Key is missing. Please check your .env file.');
    return;
  }
  
  try {
    // Set the base URL for V2 API - removing the redundant /api in the path
    const baseURL = 'https://api.instantly.ai/api/v2';
    console.log(`Using base URL: ${baseURL}`);
    
    // Create axios instance with proper authorization header
    const apiClient = axios.create({
      baseURL,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API client created with headers:');
    console.log(`  Authorization: Bearer ${maskedKey}`);
    console.log('  Content-Type: application/json');
    
    // Try to list API keys (this endpoint should be available according to docs)
    console.log('\nAttempting to list API keys...');
    const response = await apiClient.get('/api-keys');
    
    if (response.data && response.data.items) {
      console.log('✅ Connection successful!');
      console.log(`Found ${response.data.items.length} API key(s)`);
      
      // If successful, list campaigns
      console.log('\nFetching campaigns...');
      const campaignsResponse = await apiClient.get('/campaigns');
      
      if (campaignsResponse.data && campaignsResponse.data.items) {
        const campaigns = campaignsResponse.data.items;
        console.log(`Found ${campaigns.length} campaigns`);
        
        // Show details for first 3 campaigns (if available)
        const campaignsToShow = campaigns.slice(0, 3);
        if (campaignsToShow.length > 0) {
          console.log('\nCampaign details (first 3):');
          campaignsToShow.forEach((campaign, index) => {
            console.log(`\nCampaign ${index + 1}:`);
            console.log(`  ID: ${campaign.id}`);
            console.log(`  Name: ${campaign.name}`);
            console.log(`  Status: ${campaign.status || 'N/A'}`);
            console.log(`  Created: ${campaign.timestamp_created || 'N/A'}`);
            
            // Display email list info
            if (campaign.email_list && Array.isArray(campaign.email_list)) {
              console.log(`  Total leads: ${campaign.email_list.length}`);
              if (campaign.email_list.length > 0) {
                console.log(`  Sample leads: ${campaign.email_list.slice(0, 3).join(', ')}${campaign.email_list.length > 3 ? '...' : ''}`);
              }
            }
            
            // Display sequence steps if available
            if (campaign.sequences && campaign.sequences.length > 0 && 
                campaign.sequences[0].steps && campaign.sequences[0].steps.length > 0) {
              console.log(`  Sequence steps: ${campaign.sequences[0].steps.length}`);
            }
          });
        }
        
        console.log('\n✅ Successfully retrieved and parsed campaign data');
        console.log('Integration with Instantly.ai V2 API is working!');
      } else {
        console.log('❌ Failed to retrieve campaigns');
      }
    } else {
      console.log('❌ Authentication failed');
    }
  } catch (error) {
    console.log('❌ Error during API test:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(`Status: ${error.response.status}`);
      console.log('Error data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error message:', error.message);
    }
  }
  
  console.log('\nTest completed.');
}

// Explicitly catch any uncaught errors
process.on('unhandledRejection', (error) => {
  console.log('Unhandled Rejection:', error);
});

// Run the test
console.log('Script started');
testInstantlyV2().catch(error => {
  console.log('Caught error in main function:', error);
}); 
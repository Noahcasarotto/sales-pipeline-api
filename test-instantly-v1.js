const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Instantly.ai API key from .env
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;

// Test Instantly.ai API directly (V1)
async function testInstantlyV1() {
  try {
    console.log('Testing Instantly.ai V1 API connection...');
    console.log(`Using API Key: ${INSTANTLY_API_KEY.substring(0, 10)}...`);
    
    // Test the API key endpoint (this is a common first test for APIs)
    const response = await axios.get('https://api-v1.instantly.ai/api/v1/account/test', {
      params: { api_key: INSTANTLY_API_KEY }
    });
    
    console.log('\n✅ Instantly.ai V1 API key test result:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // If successful, try fetching campaigns
    console.log('\nFetching campaigns...');
    const campaignsResponse = await axios.get('https://api-v1.instantly.ai/api/v1/campaign/list', {
      params: { api_key: INSTANTLY_API_KEY }
    });
    
    if (campaignsResponse.data.status === 'success') {
      console.log(`✅ Found ${campaignsResponse.data.data.length} campaigns`);
      
      // Display a few campaigns if available
      if (campaignsResponse.data.data.length > 0) {
        console.log('\nCampaigns:');
        campaignsResponse.data.data.slice(0, 3).forEach(campaign => {
          console.log(`- ${campaign.name} (ID: ${campaign.id})`);
        });
      }
    } else {
      console.log('❌ Failed to retrieve campaigns:', campaignsResponse.data.message);
    }
    
    return true;
  } catch (error) {
    console.error('\n❌ Instantly.ai test failed:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`Status: ${error.response.status}`);
      console.error('Error message:', error.response.data?.message || JSON.stringify(error.response.data));
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from Instantly.ai API');
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// Run the test
testInstantlyV1()
  .then(() => console.log('\nTest completed.'))
  .catch(err => console.error('Unexpected error:', err)); 
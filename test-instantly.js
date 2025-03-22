const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

// Instantly.ai API key from .env
const INSTANTLY_API_KEY = process.env.INSTANTLY_API_KEY;

// Test Instantly.ai API directly
async function testInstantly() {
  try {
    console.log('Testing Instantly.ai API connection...');
    console.log(`Using API Key: ${INSTANTLY_API_KEY.substring(0, 10)}...`);
    
    // Try different authentication methods
    console.log('\nTrying different authentication methods...');
    
    // Method 1: Bearer token
    try {
      console.log('\n1. Testing with Bearer token format...');
      const response1 = await axios.get('https://api.instantly.ai/api/v1/account/me', {
        headers: {
          'Authorization': `Bearer ${INSTANTLY_API_KEY}`
        }
      });
      
      console.log('✅ Bearer token authentication successful!');
      return processSuccessResponse(response1);
    } catch (error) {
      console.log('❌ Bearer token authentication failed');
    }
    
    // Method 2: Basic Auth
    try {
      console.log('\n2. Testing with Basic Auth format...');
      const response2 = await axios.get('https://api.instantly.ai/api/v1/account/me', {
        headers: {
          'Authorization': `Basic ${INSTANTLY_API_KEY}`
        }
      });
      
      console.log('✅ Basic Auth authentication successful!');
      return processSuccessResponse(response2);
    } catch (error) {
      console.log('❌ Basic Auth authentication failed');
    }
    
    // Method 3: API Key as query parameter
    try {
      console.log('\n3. Testing with API Key as query parameter...');
      const response3 = await axios.get(`https://api.instantly.ai/api/v1/account/me?api_key=${INSTANTLY_API_KEY}`);
      
      console.log('✅ Query parameter authentication successful!');
      return processSuccessResponse(response3);
    } catch (error) {
      console.log('❌ Query parameter authentication failed');
    }
    
    // Method 4: Decode Base64 key if it's in that format
    try {
      console.log('\n4. Testing with decoded Base64 key (if applicable)...');
      // Check if it might be base64 encoded
      let decodedKey = INSTANTLY_API_KEY;
      try {
        if (INSTANTLY_API_KEY.match(/^[A-Za-z0-9+/=]+$/)) {
          decodedKey = Buffer.from(INSTANTLY_API_KEY, 'base64').toString('utf-8');
          console.log(`Decoded key: ${decodedKey.substring(0, 10)}...`);
        }
      } catch (e) {
        console.log('Key does not appear to be Base64 encoded');
      }
      
      const response4 = await axios.get('https://api.instantly.ai/api/v1/account/me', {
        headers: {
          'Authorization': `Bearer ${decodedKey}`
        }
      });
      
      console.log('✅ Decoded key authentication successful!');
      return processSuccessResponse(response4);
    } catch (error) {
      console.log('❌ Decoded key authentication failed');
    }
    
    // Method 5: Check Instantly documentation for API token format
    console.log('\n5. Checking Instantly.ai API documentation...');
    console.log('According to Instantly.ai documentation, API calls should use:');
    console.log('- URL: https://api.instantly.ai/api/v1/...');
    console.log('Please check https://docs.instantly.ai/ for the latest authentication method');
    
    // All methods failed
    throw new Error('All authentication methods failed');
  } catch (error) {
    console.error('\n❌ Instantly.ai test failed:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error(`Status: ${error.response.status}`);
      console.error('Error message:', error.response.data?.message || error.response.data);
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

// Process successful response
function processSuccessResponse(response) {
  console.log('\n✅ Instantly.ai connection successful!');
  console.log('Account details:');
  console.log(`- Email: ${response.data.data.email}`);
  console.log(`- Plan: ${response.data.data.plan}`);
  console.log(`- Account ID: ${response.data.data.id}`);
  
  // Try getting campaigns
  console.log('\nFetching campaigns...');
  // We'd add campaign fetching here
  
  return true;
}

// Run the test
testInstantly()
  .then(() => console.log('\nTest completed.'))
  .catch(err => console.error('Unexpected error:', err)); 
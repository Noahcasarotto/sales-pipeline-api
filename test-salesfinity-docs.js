const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get API credentials
const SALESFINITY_API_KEY = process.env.SALESFINITY_API_KEY || 'ff463994-d38c-43f3-a100-7dcc519570b9';

// Base URL from documentation
const BASE_URL = 'https://client-api.salesfinity.co/v1';

// Create axios client with headers according to documentation
const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': SALESFINITY_API_KEY
  },
  timeout: 15000
});

// Helper function to log API responses
function logResponse(title, response) {
  console.log(`\n=== ${title} ===`);
  if (response.status) {
    console.log(`Status: ${response.status}`);
  }
  
  if (response.data) {
    console.log('Data:', JSON.stringify(response.data, null, 2));
  }
}

// Test the documented endpoints
async function testDocumentedEndpoints() {
  console.log('🔬 TESTING DOCUMENTED SALESFINITY API ENDPOINTS');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);

  // 1. Test the Team/Users endpoint
  console.log('\n1. TESTING TEAM/USERS ENDPOINT (GET /v1/team)');
  try {
    const teamResponse = await client.get('/team');
    console.log('✅ Successfully retrieved team data');
    logResponse('Team Data', teamResponse);
  } catch (error) {
    console.log('❌ Failed to retrieve team data');
    console.log('Status:', error.response?.status || 'unknown');
    console.log('Error:', error.response?.data || error.message);
  }

  // 2. Test the Call Log endpoint
  console.log('\n2. TESTING CALL LOGS ENDPOINT (GET /v1/call-log)');
  try {
    // First without pagination parameters
    const callLogResponse = await client.get('/call-log');
    console.log('✅ Successfully retrieved call logs');
    logResponse('Call Logs', callLogResponse);
    
    // Then with pagination parameters
    const paginatedCallLogResponse = await client.get('/call-log', {
      params: {
        limit: 10,
        page: 1
      }
    });
    console.log('✅ Successfully retrieved paginated call logs');
    logResponse('Paginated Call Logs', paginatedCallLogResponse);
  } catch (error) {
    console.log('❌ Failed to retrieve call logs');
    console.log('Status:', error.response?.status || 'unknown');
    console.log('Error:', error.response?.data || error.message);
  }

  // 3. Test the Contact Lists endpoint (already working)
  console.log('\n3. TESTING CONTACT LISTS ENDPOINT (GET /v1/contact-lists/csv)');
  try {
    const listsResponse = await client.get('/contact-lists/csv');
    console.log('✅ Successfully retrieved contact lists');
    console.log(`Found ${listsResponse.data.data?.length || 0} lists`);
    
    // Show first list as example
    if (listsResponse.data.data?.length > 0) {
      const firstList = listsResponse.data.data[0];
      console.log('Example list:', JSON.stringify(firstList, null, 2));
    }
  } catch (error) {
    console.log('❌ Failed to retrieve contact lists');
    console.log('Status:', error.response?.status || 'unknown');
    console.log('Error:', error.response?.data || error.message);
  }

  console.log('\n🔍 TESTING COMPLETED');
}

// Run the test
testDocumentedEndpoints().catch(error => {
  console.error('❌ Unhandled error:', error);
}); 
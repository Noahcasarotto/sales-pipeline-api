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

// Function to specifically test call-related endpoints
async function testCallEndpoints() {
  console.log('🔬 TESTING SALESFINITY CALL ENDPOINTS');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);
  
  // Array to store results
  const results = [];
  
  try {
    // First, let's get contact lists to use a list ID if needed
    console.log('\n1. FETCHING CONTACT LISTS TO GET IDS');
    const listsResponse = await client.get('/contact-lists/csv');
    const lists = listsResponse.data.data || [];
    
    if (lists.length === 0) {
      console.log('❌ No contact lists found to use for testing');
      return;
    }
    
    console.log(`✅ Found ${lists.length} contact lists`);
    const firstListId = lists[0]._id;
    console.log(`Using list ID: ${firstListId}`);
    
    // Try various call-related endpoints
    const callEndpoints = [
      // Generic call endpoints
      { name: 'All Calls', path: '/calls' },
      { name: 'Call Logs', path: '/call-logs' },
      { name: 'Call History', path: '/call-history' },
      { name: 'Call Records', path: '/call-records' },
      { name: 'Call Metadata', path: '/calls/metadata' },
      { name: 'Call Statistics', path: '/calls/stats' },
      
      // Specific list-related call endpoints
      { name: 'List Calls', path: `/contact-lists/${firstListId}/calls` },
      { name: 'List Call Logs', path: `/contact-lists/${firstListId}/call-logs` },
      
      // Campaign-related endpoints that might have call data
      { name: 'Campaigns', path: '/campaigns' },
      { name: 'Campaign Metrics', path: '/campaigns/metrics' },
      
      // Try different versions of the API
      { name: 'Calls (v2)', path: '/v2/calls' },
      { name: 'Calls (no version)', path: '/../calls' },
      
      // Try different related resources
      { name: 'Activities', path: '/activities' },
      { name: 'Events', path: '/events' },
      { name: 'Tasks', path: '/tasks' },
      { name: 'Outreach', path: '/outreach' }
    ];
    
    console.log('\n2. TESTING CALL-RELATED ENDPOINTS');
    
    for (const endpoint of callEndpoints) {
      try {
        console.log(`\nTesting endpoint: ${endpoint.path}`);
        const response = await client.get(endpoint.path);
        
        console.log(`✅ Success! Status: ${response.status}`);
        logResponse(endpoint.name, response);
        
        results.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          success: true,
          status: response.status,
          data: response.data
        });
      } catch (error) {
        console.log(`❌ Failed with status: ${error.response?.status || 'unknown'}`);
        if (error.response?.data) {
          console.log('Error details:', JSON.stringify(error.response.data, null, 2));
        }
        
        results.push({
          endpoint: endpoint.path,
          name: endpoint.name,
          success: false,
          status: error.response?.status,
          error: error.response?.data || error.message
        });
      }
    }
    
    // Try using query parameters to find calls
    console.log('\n3. TESTING QUERY PARAMETERS FOR FINDING CALLS');
    
    const queryParams = [
      { name: 'Date Range', path: '/calls', params: { from: '2025-01-01', to: '2025-03-30' } },
      { name: 'Status Filter', path: '/calls', params: { status: 'completed' } },
      { name: 'List Filter', path: '/calls', params: { list_id: firstListId } },
      { name: 'Pagination', path: '/calls', params: { page: 1, perPage: 10 } },
      { name: 'Search by Phone', path: '/calls', params: { phone: '+1234567890' } }
    ];
    
    for (const query of queryParams) {
      try {
        console.log(`\nTesting query: ${JSON.stringify(query.params)}`);
        const response = await client.get(query.path, { params: query.params });
        
        console.log(`✅ Success! Status: ${response.status}`);
        logResponse(query.name, response);
        
        results.push({
          endpoint: `${query.path} with params ${JSON.stringify(query.params)}`,
          name: query.name,
          success: true,
          status: response.status,
          data: response.data
        });
      } catch (error) {
        console.log(`❌ Failed with status: ${error.response?.status || 'unknown'}`);
        if (error.response?.data) {
          console.log('Error details:', JSON.stringify(error.response.data, null, 2));
        }
        
        results.push({
          endpoint: `${query.path} with params ${JSON.stringify(query.params)}`,
          name: query.name,
          success: false,
          status: error.response?.status,
          error: error.response?.data || error.message
        });
      }
    }
    
    // Try alternative formats or content types
    console.log('\n4. TESTING ALTERNATIVE FORMATS');
    
    const formatTests = [
      { name: 'CSV Format', path: '/calls', headers: { 'Accept': 'text/csv' } },
      { name: 'JSON Format', path: '/calls', headers: { 'Accept': 'application/json' } },
      { name: 'JSON-API Format', path: '/calls', headers: { 'Accept': 'application/vnd.api+json' } }
    ];
    
    for (const format of formatTests) {
      try {
        console.log(`\nTesting format: ${format.name}`);
        const response = await client.get(format.path, { headers: format.headers });
        
        console.log(`✅ Success! Status: ${response.status}`);
        console.log('Response headers:', response.headers);
        console.log('Data preview:', typeof response.data === 'string' ? response.data.substring(0, 100) : JSON.stringify(response.data).substring(0, 100));
        
        results.push({
          endpoint: format.path,
          name: format.name,
          success: true,
          status: response.status,
          format: format.headers['Accept']
        });
      } catch (error) {
        console.log(`❌ Failed with status: ${error.response?.status || 'unknown'}`);
        if (error.response?.data) {
          console.log('Error details:', error.response?.data);
        }
        
        results.push({
          endpoint: format.path,
          name: format.name,
          success: false,
          status: error.response?.status,
          error: error.response?.data || error.message,
          format: format.headers['Accept']
        });
      }
    }
    
    // Summary of findings
    console.log('\n=== SUMMARY OF FINDINGS ===');
    console.log(`Total endpoints tested: ${results.length}`);
    
    const successfulEndpoints = results.filter(r => r.success);
    console.log(`Successful endpoints: ${successfulEndpoints.length}`);
    
    if (successfulEndpoints.length > 0) {
      console.log('\nWorking endpoints:');
      successfulEndpoints.forEach(endpoint => {
        console.log(`- ${endpoint.name} (${endpoint.endpoint}): Status ${endpoint.status}`);
      });
    } else {
      console.log('\n❌ No working call-related endpoints found.');
      console.log('Based on our testing, it appears that retrieving call data is not supported by the current API key or access level.');
    }
    
  } catch (error) {
    console.error('❌ Error during API testing:', error);
  }
}

// Run the test
testCallEndpoints().catch(error => {
  console.error('❌ Unhandled error:', error);
}); 
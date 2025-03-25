const axios = require('axios');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Get API credentials - use the new API key
const SALESFINITY_API_KEY = process.env.SALESFINITY_API_KEY || 'ff463994-d38c-43f3-a100-7dcc519570b9';

// Base URL from documentation
const BASE_URL = 'https://client-api.salesfinity.co/v1';

// Function to test the Salesfinity API connection
async function testSalesfinity() {
  console.log('Testing Salesfinity API connection...');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);
  
  // Create axios client with headers according to documentation
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': SALESFINITY_API_KEY // Note the lowercase 'x' in header name
    },
    timeout: 10000
  });
  
  try {
    console.log('\n1. Testing contact-lists endpoint...');
    // According to docs, this endpoint should retrieve contact lists
    const listsResponse = await client.get('/contact-lists/csv?page=1');
    
    if (listsResponse.status === 200) {
      console.log('✅ Connection successful!');
      console.log('Lists data:', JSON.stringify(listsResponse.data, null, 2).substring(0, 500) + (JSON.stringify(listsResponse.data, null, 2).length > 500 ? '...' : ''));
      
      // Try to get the contacts for the first list if available
      if (listsResponse.data && listsResponse.data.data && listsResponse.data.data.length > 0) {
        const firstListId = listsResponse.data.data[0]._id;
        console.log(`\n1.1 Testing contacts for list ${firstListId}...`);
        
        try {
          const contactsResponse = await client.get(`/contact-lists/${firstListId}/contacts?page=1`);
          console.log('✅ Contacts endpoint successful!');
          console.log('Contacts data:', JSON.stringify(contactsResponse.data, null, 2).substring(0, 500) + (JSON.stringify(contactsResponse.data, null, 2).length > 500 ? '...' : ''));
        } catch (error) {
          console.log('❌ Contacts endpoint failed:');
          if (error.response) {
            console.log(`Status: ${error.response.status}`);
            console.log(`Message: ${JSON.stringify(error.response.data)}`);
          } else {
            console.log(`Error: ${error.message}`);
          }
        }
      }
    } else {
      console.log('❌ Connection failed with status:', listsResponse.status);
      console.log(listsResponse.data);
    }

    console.log('\n2. Trying other possible endpoints...');
    
    // Create an array of endpoints to try
    const possibleEndpoints = [
      {name: 'Users', path: '/users'},
      {name: 'Call logs', path: '/call-logs'},
      {name: 'Contacts', path: '/contacts'},
      {name: 'Calls', path: '/calls'},
      {name: 'Contact lists', path: '/contact-lists'},
      {name: 'Account', path: '/account'},
      {name: 'Me', path: '/me'},
      {name: 'Campaigns', path: '/campaigns'}
    ];
    
    const workingEndpoints = [];
    const failedEndpoints = [];
    
    // Test each endpoint
    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`Testing ${endpoint.name} endpoint: ${endpoint.path}`);
        const response = await client.get(endpoint.path);
        console.log(`✅ ${endpoint.name} endpoint successful!`);
        console.log(`${endpoint.name} data:`, JSON.stringify(response.data, null, 2).substring(0, 200) + (JSON.stringify(response.data, null, 2).length > 200 ? '...' : ''));
        
        workingEndpoints.push({
          name: endpoint.name,
          path: endpoint.path,
          status: response.status
        });
      } catch (error) {
        console.log(`❌ ${endpoint.name} endpoint failed:`);
        if (error.response) {
          console.log(`Status: ${error.response.status}`);
          console.log(`Message: ${JSON.stringify(error.response.data)}`);
        } else {
          console.log(`Error: ${error.message}`);
        }
        
        failedEndpoints.push({
          name: endpoint.name,
          path: endpoint.path,
          error: error.response?.status || error.message
        });
      }
    }

    console.log('\nSalesfinity API test completed!');
    
    return {
      baseUrl: BASE_URL,
      authenticated: true,
      contactLists: listsResponse.data,
      workingEndpoints,
      failedEndpoints
    };
  } catch (error) {
    console.log('❌ Error during Salesfinity API test:');
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(`Status code: ${error.response.status}`);
      console.log('Error data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.log('No response received');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log('Error message:', error.message);
    }
    
    return {
      authenticated: false,
      error: error.message
    };
  }
}

// Run the test
testSalesfinity()
  .then(result => {
    console.log('\n=== SUMMARY ===');
    if (result.authenticated) {
      console.log('✅ Successfully authenticated with Salesfinity API');
      console.log('Base URL:', result.baseUrl);
      
      if (result.workingEndpoints.length > 0) {
        console.log('\nWorking endpoints:');
        result.workingEndpoints.forEach(endpoint => {
          console.log(`- ${endpoint.name}: ${endpoint.path}`);
        });
      } else {
        console.log('\nNo additional working endpoints found beyond /contact-lists/csv');
      }
      
      if (result.failedEndpoints.length > 0) {
        console.log('\nFailed endpoints:');
        result.failedEndpoints.forEach(endpoint => {
          console.log(`- ${endpoint.name}: ${endpoint.path} (${endpoint.error})`);
        });
      }
    } else {
      console.log('❌ Failed to authenticate with Salesfinity API');
      console.log('Error:', result.error);
    }
  })
  .catch(error => {
    console.error('Unhandled error during test:', error);
  }); 
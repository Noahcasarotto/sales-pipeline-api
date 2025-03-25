const dotenv = require('dotenv');
const fs = require('fs').promises;
const fetch = require('node-fetch');

// Load environment variables
dotenv.config();

// Get API credentials
const SALESFINITY_API_KEY = process.env.SALESFINITY_API_KEY || 'ff463994-d38c-43f3-a100-7dcc519570b9';

// Base URL from documentation
const BASE_URL = 'https://client-api.salesfinity.co/v1';

// Helper function to log API responses cleanly
function logResponse(title, data) {
  console.log(`\n=== ${title} ===`);
  if (typeof data === 'object') {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

// Function to test a variety of POST requests to understand API requirements
async function testPostRequests() {
  console.log('🔬 TESTING SALESFINITY POST REQUESTS WITH FETCH');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);
  
  try {
    // First, get the current lists to understand structure
    console.log('\n1. FETCHING CURRENT LISTS TO UNDERSTAND STRUCTURE');
    const getResponse = await fetch(`${BASE_URL}/contact-lists/csv`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SALESFINITY_API_KEY
      }
    });
    
    if (!getResponse.ok) {
      throw new Error(`GET request failed with status ${getResponse.status}`);
    }
    
    const listData = await getResponse.json();
    logResponse('Current Lists', listData);
    
    // Test a simple POST request first
    console.log('\n2. TESTING SIMPLE POST REQUEST');
    const simpleResponse = await fetch(`${BASE_URL}/contact-lists/csv`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SALESFINITY_API_KEY
      },
      body: JSON.stringify({})
    });
    
    const simpleResult = await simpleResponse.json();
    logResponse(`Simple POST Result (Status: ${simpleResponse.status})`, simpleResult);
    
    // Test different payload structures
    console.log('\n3. TESTING DIFFERENT PAYLOAD STRUCTURES');
    
    // Empty request with CSV file in URL
    const testCases = [
      {
        name: 'Empty body',
        payload: {},
        path: '/contact-lists/csv'
      },
      {
        name: 'With filename',
        payload: { filename: 'test.csv' },
        path: '/contact-lists/csv'
      },
      {
        name: 'With file parameter',
        payload: { file: 'test.csv' },
        path: '/contact-lists/csv'
      },
      {
        name: 'With path parameter',
        payload: { path: '/tmp/test.csv' },
        path: '/contact-lists/csv'
      },
      {
        name: 'With data parameter',
        payload: { data: 'First Name,Last Name\nJohn,Doe' },
        path: '/contact-lists/csv'
      },
      {
        name: 'With type parameter',
        payload: { type: 'csv' },
        path: '/contact-lists/csv'
      },
      {
        name: 'With alternate endpoint',
        payload: {},
        path: '/contact-lists/upload'
      },
      {
        name: 'With import endpoint',
        payload: {},
        path: '/contacts/import'
      }
    ];
    
    for (const testCase of testCases) {
      try {
        console.log(`\nTesting: ${testCase.name}`);
        const response = await fetch(`${BASE_URL}${testCase.path}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': SALESFINITY_API_KEY
          },
          body: JSON.stringify(testCase.payload)
        });
        
        const result = await response.json();
        logResponse(`Response (Status: ${response.status})`, result);
        
        if (response.ok) {
          console.log('✅ SUCCESS! This approach works!');
        }
      } catch (error) {
        console.log(`❌ Error with ${testCase.name}:`, error.message);
      }
    }
    
    // Test with Headers-Only Request
    console.log('\n4. TESTING HEADERS-ONLY APPROACH');
    try {
      // Some APIs allow you to specify the file path in a header
      const headersResponse = await fetch(`${BASE_URL}/contact-lists/csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': SALESFINITY_API_KEY,
          'X-File-Path': '/tmp/test.csv',
          'X-File-Type': 'csv'
        },
        body: JSON.stringify({})
      });
      
      const headersResult = await headersResponse.json();
      logResponse(`Headers-Only Response (Status: ${headersResponse.status})`, headersResult);
      
      if (headersResponse.ok) {
        console.log('✅ SUCCESS! Headers-only approach works!');
      }
    } catch (error) {
      console.log('❌ Error with headers-only approach:', error.message);
    }
    
    // Test with different content types
    console.log('\n5. TESTING DIFFERENT CONTENT TYPES');
    const contentTypes = [
      'application/json',
      'text/csv',
      'multipart/form-data',
      'application/x-www-form-urlencoded'
    ];
    
    for (const contentType of contentTypes) {
      try {
        console.log(`\nTesting Content-Type: ${contentType}`);
        
        let body;
        let headers = {
          'x-api-key': SALESFINITY_API_KEY
        };
        
        if (contentType === 'application/json') {
          headers['Content-Type'] = contentType;
          body = JSON.stringify({});
        } else if (contentType === 'text/csv') {
          headers['Content-Type'] = contentType;
          body = 'First Name,Last Name\nJohn,Doe';
        } else if (contentType === 'application/x-www-form-urlencoded') {
          headers['Content-Type'] = contentType;
          body = 'format=csv&data=First Name,Last Name\nJohn,Doe';
        } else {
          // Skipping multipart/form-data with fetch for simplicity
          console.log('Skipping multipart/form-data test with fetch');
          continue;
        }
        
        const response = await fetch(`${BASE_URL}/contact-lists/csv`, {
          method: 'POST',
          headers,
          body
        });
        
        let result;
        try {
          result = await response.json();
        } catch (e) {
          result = await response.text();
        }
        
        logResponse(`Response (Status: ${response.status})`, result);
        
        if (response.ok) {
          console.log('✅ SUCCESS! This content type works!');
        }
      } catch (error) {
        console.log(`❌ Error with content type ${contentType}:`, error.message);
      }
    }
    
    console.log('\n🔍 POST REQUEST ANALYSIS COMPLETE');
  } catch (error) {
    console.error('❌ Error during API testing:', error);
  }
}

// We need to use node-fetch for the tests
async function ensureNodeFetchInstalled() {
  try {
    require.resolve('node-fetch');
    console.log('node-fetch package is already installed');
    return true;
  } catch (e) {
    console.log('Installing node-fetch package...');
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('npm install node-fetch@2', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error installing node-fetch: ${error.message}`);
          reject(error);
          return;
        }
        console.log('node-fetch package installed successfully');
        resolve(true);
      });
    });
  }
}

// Run the test
async function run() {
  try {
    await ensureNodeFetchInstalled();
    await testPostRequests();
  } catch (error) {
    console.error('❌ Unhandled error:', error);
  }
}

run(); 
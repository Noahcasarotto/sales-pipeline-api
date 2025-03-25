const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs').promises;

// Load environment variables
dotenv.config();

// Get API credentials - use the new API key
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

// Helper function to log response data with proper formatting
function logResponse(title, data, maxLength = 500) {
  console.log(`\n==== ${title} ====`);
  const jsonString = JSON.stringify(data, null, 2);
  console.log(jsonString.length > maxLength 
    ? jsonString.substring(0, maxLength) + '...' 
    : jsonString);
}

// Test retrieving contact lists with different parameters
async function testContactListsWithParams() {
  console.log('\n🔍 TESTING CONTACT LISTS WITH DIFFERENT PARAMETERS');
  
  // Test different page sizes
  try {
    console.log('\n1. Testing page sizes...');
    
    // Test with page=1, perPage=5
    const smallPage = await client.get('/contact-lists/csv?page=1&perPage=5');
    console.log(`✅ Small page (perPage=5): Retrieved ${smallPage.data.data?.length || 0} lists`);
    
    // Test with page=1, perPage=20 
    const largePage = await client.get('/contact-lists/csv?page=1&perPage=20');
    console.log(`✅ Large page (perPage=20): Retrieved ${largePage.data.data?.length || 0} lists`);
    
    // Test second page
    const secondPage = await client.get('/contact-lists/csv?page=2&perPage=5');
    console.log(`✅ Second page: Retrieved ${secondPage.data.data?.length || 0} lists`);
    
    // Check if pagination is working correctly
    if (smallPage.data.data && smallPage.data.data.length > 0 && 
        secondPage.data.data && secondPage.data.data.length > 0) {
      // Check if first item on second page is different than first page
      const firstPageIds = smallPage.data.data.map(list => list._id);
      const secondPageIds = secondPage.data.data.map(list => list._id);
      
      const uniqueIdsOnSecondPage = secondPageIds.filter(id => !firstPageIds.includes(id));
      console.log(`📊 Unique IDs on second page: ${uniqueIdsOnSecondPage.length} out of ${secondPageIds.length}`);
      
      if (uniqueIdsOnSecondPage.length === secondPageIds.length) {
        console.log('✅ Pagination appears to be working correctly!');
      } else {
        console.log('⚠️ Pagination might have issues - second page contains some items from first page');
      }
    }
  } catch (error) {
    console.log('❌ Error testing paging parameters:');
    console.log(error.response?.data || error.message);
  }
  
  // Test searching and filtering (if supported)
  try {
    console.log('\n2. Testing search/filter parameters (if supported)...');
    
    // Try searching by name (this may or may not be supported)
    if (searchTerm) {
      const searchResult = await client.get(`/contact-lists/csv?search=${searchTerm}`);
      console.log(`✅ Search by name "${searchTerm}": Retrieved ${searchResult.data.data?.length || 0} lists`);
      logResponse('Search Results', searchResult.data);
    } else {
      console.log('⚠️ No search term available, skipping search test');
    }
  } catch (error) {
    console.log('❌ Error testing search parameters:');
    console.log(error.response?.data || error.message);
    console.log('📝 Note: Search functionality may not be supported by the API');
  }
  
  // Test sorting (if supported)
  try {
    console.log('\n3. Testing sort parameters (if supported)...');
    
    // Try sorting by name ascending (this may or may not be supported)
    const sortAscResult = await client.get('/contact-lists/csv?sort=name&order=asc');
    console.log(`✅ Sort by name (asc): Retrieved ${sortAscResult.data.data?.length || 0} lists`);
    
    // Try sorting by name descending
    const sortDescResult = await client.get('/contact-lists/csv?sort=name&order=desc');
    console.log(`✅ Sort by name (desc): Retrieved ${sortDescResult.data.data?.length || 0} lists`);
    
    // Check if sort appears to work
    if (sortAscResult.data.data && sortAscResult.data.data.length > 0 && 
        sortDescResult.data.data && sortDescResult.data.data.length > 0) {
      console.log('First item in ascending sort: ' + sortAscResult.data.data[0].name);
      console.log('First item in descending sort: ' + sortDescResult.data.data[0].name);
    }
  } catch (error) {
    console.log('❌ Error testing sort parameters:');
    console.log(error.response?.data || error.message);
    console.log('📝 Note: Sorting functionality may not be supported by the API');
  }
}

// Try to examine a contact list in more detail
async function testExamineContactList() {
  console.log('\n🔍 TESTING DETAILED CONTACT LIST EXAMINATION');
  
  try {
    // Get first available list
    const listsResponse = await client.get('/contact-lists/csv?page=1&perPage=1');
    
    if (!listsResponse.data.data || listsResponse.data.data.length === 0) {
      console.log('❌ No contact lists found to examine');
      return;
    }
    
    const listId = listsResponse.data.data[0]._id;
    console.log(`\nExamining contact list: ${listId}`);
    
    // Try getting details for a specific list
    try {
      console.log('\n1. Testing direct list retrieval...');
      const listDetails = await client.get(`/contact-lists/csv/${listId}`);
      console.log('✅ Successfully retrieved specific list details');
      logResponse('List Details', listDetails.data);
    } catch (error) {
      console.log('❌ Error retrieving specific list:');
      console.log(error.response?.data || error.message);
      console.log('📝 Note: Direct list retrieval may not be supported');
    }
    
    // Try different contact list detail endpoints
    const detailEndpoints = [
      { name: 'Metadata', path: `/contact-lists/${listId}/metadata` },
      { name: 'Stats', path: `/contact-lists/${listId}/stats` },
      { name: 'Contacts', path: `/contact-lists/${listId}/contacts` }
    ];
    
    console.log('\n2. Testing potential list detail endpoints...');
    for (const endpoint of detailEndpoints) {
      try {
        const response = await client.get(endpoint.path);
        console.log(`✅ ${endpoint.name} endpoint worked!`);
        logResponse(`${endpoint.name} Response`, response.data);
      } catch (error) {
        console.log(`❌ ${endpoint.name} endpoint failed: ${error.response?.status || error.message}`);
      }
    }
  } catch (error) {
    console.log('❌ Error in contact list examination:');
    console.log(error.response?.data || error.message);
  }
}

// Try to test POST operations (with caution to avoid creating real data if possible)
async function testPostOperations() {
  console.log('\n🔍 TESTING POST OPERATIONS (READ-ONLY TESTS)');
  
  // Test if endpoint structure can be discovered from OPTIONS request
  console.log('\n1. Discovering API structure with OPTIONS request...');
  try {
    const optionsResponse = await client.options('/contact-lists/csv');
    console.log('✅ OPTIONS request succeeded');
    console.log('Available methods:', optionsResponse.headers['allow'] || 'Not specified');
    console.log('CORS headers:', optionsResponse.headers['access-control-allow-methods'] || 'Not specified');
  } catch (error) {
    console.log('❌ OPTIONS request failed:');
    console.log(error.response?.status || error.message);
    console.log('📝 Note: OPTIONS method may not be supported');
  }
  
  // Check if we can retrieve API documentation or schema
  console.log('\n2. Checking for API documentation endpoints...');
  const docEndpoints = [
    '/docs', 
    '/swagger', 
    '/openapi',
    '/schema'
  ];
  
  for (const endpoint of docEndpoints) {
    try {
      const response = await client.get(endpoint);
      console.log(`✅ Found documentation at ${endpoint}`);
      logResponse('Documentation Response', response.data);
    } catch (error) {
      console.log(`❌ No documentation at ${endpoint}: ${error.response?.status || error.message}`);
    }
  }
  
  // Test creating a contact list without actually submitting (dry run if possible)
  console.log('\n3. Testing dry-run creation (if supported)...');
  try {
    const testData = {
      name: 'Test List (Dry Run)',
      description: 'This is a test list for API testing',
      dryRun: true // This parameter may or may not be supported
    };
    
    const response = await client.post('/contact-lists/csv?dryRun=true', testData);
    console.log('✅ Dry run creation succeeded!');
    logResponse('Dry Run Response', response.data);
  } catch (error) {
    console.log('❌ Dry run creation failed:');
    console.log(error.response?.data || error.message);
    console.log('📝 Note: Dry run mode may not be supported');
  }
}

// Test downloading CSV template or list data
async function testDataExport() {
  console.log('\n🔍 TESTING DATA EXPORT CAPABILITIES');
  
  try {
    // Get first available list
    const listsResponse = await client.get('/contact-lists/csv?page=1&perPage=1');
    
    if (!listsResponse.data.data || listsResponse.data.data.length === 0) {
      console.log('❌ No contact lists found to export');
      return;
    }
    
    const listId = listsResponse.data.data[0]._id;
    
    // Try exporting the list as CSV
    console.log(`\n1. Testing CSV export for list: ${listId}`);
    
    try {
      // Modify headers for CSV response
      const csvClient = axios.create({
        baseURL: BASE_URL,
        headers: {
          'Accept': 'text/csv',
          'x-api-key': SALESFINITY_API_KEY
        },
        responseType: 'text'
      });
      
      const csvResponse = await csvClient.get(`/contact-lists/${listId}/export`);
      console.log('✅ CSV export successful!');
      console.log('CSV Data Preview:');
      console.log(csvResponse.data.substring(0, 500) + '...');
      
      // Save CSV to file
      try {
        await fs.writeFile(`contact_list_${listId}.csv`, csvResponse.data);
        console.log(`✅ Saved CSV to file: contact_list_${listId}.csv`);
      } catch (fsError) {
        console.log('❌ Failed to save CSV to file:', fsError.message);
      }
    } catch (error) {
      console.log('❌ CSV export failed:');
      console.log(error.response?.data || error.message);
      console.log('📝 Note: CSV export may not be supported');
    }
    
    // Try getting a CSV template
    console.log('\n2. Testing CSV template download');
    try {
      const templateClient = axios.create({
        baseURL: BASE_URL,
        headers: {
          'Accept': 'text/csv',
          'x-api-key': SALESFINITY_API_KEY
        },
        responseType: 'text'
      });
      
      const templateResponse = await templateClient.get('/contact-lists/template');
      console.log('✅ CSV template download successful!');
      console.log('Template Preview:');
      console.log(templateResponse.data.substring(0, 500) + '...');
      
      // Save template to file
      try {
        await fs.writeFile('contact_list_template.csv', templateResponse.data);
        console.log('✅ Saved template to file: contact_list_template.csv');
      } catch (fsError) {
        console.log('❌ Failed to save template to file:', fsError.message);
      }
    } catch (error) {
      console.log('❌ Template download failed:');
      console.log(error.response?.data || error.message);
      console.log('📝 Note: CSV template download may not be supported');
    }
  } catch (error) {
    console.log('❌ Error in data export testing:');
    console.log(error.response?.data || error.message);
  }
}

// Main function to run all tests
async function runTests() {
  console.log('🚀 ADVANCED SALESFINITY API TESTING');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);
  
  // First, get a list to potentially use in tests
  let searchTerm = '';
  try {
    const initialLists = await client.get('/contact-lists/csv?page=1&perPage=10');
    
    if (initialLists.data.data && initialLists.data.data.length > 0) {
      console.log(`📋 Found ${initialLists.data.data.length} contact lists`);
      
      // Take a sample of list names to use in search tests
      const sampleList = initialLists.data.data[0];
      console.log('📝 Sample list:', JSON.stringify(sampleList, null, 2));
      
      if (sampleList.name && sampleList.name.includes('_')) {
        // Extract a search term from the name (e.g., if name is "VC_1000-2000.csv", use "VC")
        searchTerm = sampleList.name.split('_')[0];
        console.log(`🔍 Using search term from list name: "${searchTerm}"`);
      }
    } else {
      console.log('⚠️ No contact lists found in initial request');
    }
  } catch (error) {
    console.log('❌ Error during initial lists retrieval:');
    console.log(error.response?.data || error.message);
  }
  
  // Run all test suites
  await testContactListsWithParams();
  await testExamineContactList();
  await testPostOperations();
  await testDataExport();
  
  console.log('\n🏁 ALL TESTS COMPLETED');
}

// Run all tests and handle errors
runTests()
  .catch(error => {
    console.error('❌ Unhandled error during testing:', error);
  }); 
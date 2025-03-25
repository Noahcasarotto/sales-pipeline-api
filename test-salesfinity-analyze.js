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

// Helper function to format objects for display
function formatObject(obj, indent = 0) {
  const indentStr = ' '.repeat(indent);
  if (!obj || typeof obj !== 'object') {
    return `${indentStr}${obj}`;
  }
  
  if (Array.isArray(obj)) {
    if (obj.length === 0) return `${indentStr}[]`;
    
    // For arrays, describe the first item and total length
    const firstItem = obj[0];
    const firstItemDesc = typeof firstItem === 'object' 
      ? `[Object]: ${JSON.stringify(firstItem).substring(0, 100)}` 
      : firstItem;
    
    return `${indentStr}Array(${obj.length}) - First item: ${firstItemDesc}`;
  }
  
  // For objects, list all keys and their types
  const keys = Object.keys(obj);
  if (keys.length === 0) return `${indentStr}{}`;
  
  const keyDescriptions = keys.map(key => {
    const value = obj[key];
    const valueType = typeof value;
    
    if (value === null) return `${key}: null`;
    if (valueType === 'object') {
      if (Array.isArray(value)) {
        return `${key}: Array(${value.length})`;
      }
      return `${key}: Object`;
    }
    return `${key}: ${valueType}`;
  });
  
  return `${indentStr}{${keyDescriptions.join(', ')}}`;
}

// Function to analyze data structure recursively
function analyzeStructure(data, path = '', depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return { description: '(Max depth reached)' };
  
  if (data === null) return { type: 'null', description: 'null' };
  
  const type = typeof data;
  
  if (type !== 'object') {
    return {
      type,
      description: data.toString().substring(0, 100)
    };
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return { type: 'array', isEmpty: true, description: 'Empty array' };
    }
    
    // Analyze the first item to understand array contents
    const firstItem = data[0];
    const firstItemAnalysis = analyzeStructure(firstItem, `${path}[0]`, depth + 1, maxDepth);
    
    // Check if all items have the same structure
    let consistent = true;
    for (let i = 1; i < Math.min(data.length, 5); i++) {
      const itemAnalysis = analyzeStructure(data[i], `${path}[${i}]`, depth + 1, maxDepth);
      if (JSON.stringify(itemAnalysis.type) !== JSON.stringify(firstItemAnalysis.type)) {
        consistent = false;
        break;
      }
    }
    
    return {
      type: 'array',
      length: data.length,
      consistent,
      itemType: firstItemAnalysis.type,
      sampleItem: firstItemAnalysis,
      description: `Array with ${data.length} items`
    };
  }
  
  // If it's an object (not an array)
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return { type: 'object', isEmpty: true, description: 'Empty object' };
  }
  
  const properties = {};
  keys.forEach(key => {
    properties[key] = analyzeStructure(data[key], `${path}.${key}`, depth + 1, maxDepth);
  });
  
  return {
    type: 'object',
    properties,
    description: `Object with ${keys.length} properties: ${keys.join(', ')}`
  };
}

// Function to print analysis in a readable format
function printAnalysis(analysis, indent = 0) {
  const indentStr = ' '.repeat(indent);
  
  if (analysis.type === 'array') {
    console.log(`${indentStr}Array (${analysis.length} items, consistent: ${analysis.consistent})`);
    console.log(`${indentStr}Item type: ${analysis.itemType}`);
    console.log(`${indentStr}Sample item:`);
    printAnalysis(analysis.sampleItem, indent + 2);
  } else if (analysis.type === 'object') {
    console.log(`${indentStr}Object (${Object.keys(analysis.properties).length} properties)`);
    for (const [key, prop] of Object.entries(analysis.properties)) {
      console.log(`${indentStr}  ${key}:`);
      printAnalysis(prop, indent + 4);
    }
  } else {
    console.log(`${indentStr}${analysis.type}: ${analysis.description}`);
  }
}

// Get all available parameters from the response
function extractParameters(data) {
  if (!data || typeof data !== 'object') return [];
  
  // Direct parameters in the object
  const directParams = Object.keys(data);
  
  // Look for pagination, query or filter parameters in the response
  const nestedParams = [];
  
  // Common locations where API parameters might be referenced
  const paramLocations = ['query', 'params', 'pagination', 'meta', 'links'];
  
  paramLocations.forEach(location => {
    if (data[location] && typeof data[location] === 'object') {
      nestedParams.push(...Object.keys(data[location]));
    }
  });
  
  // If there's an array of data items, check the first item for potential parameters
  if (Array.isArray(data.data) && data.data[0]) {
    nestedParams.push(...Object.keys(data.data[0]));
  }
  
  // Remove duplicates and return
  return [...new Set([...directParams, ...nestedParams])];
}

async function analyzeContactListsEndpoint() {
  console.log('🔬 DETAILED ANALYSIS OF SALESFINITY CONTACT-LISTS ENDPOINT');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);
  
  try {
    // Get initial data
    console.log('\n1. FETCHING DATA WITH DEFAULT PARAMETERS');
    const response = await client.get('/contact-lists/csv');
    
    console.log(`✅ Received response with status ${response.status}`);
    console.log(`Top-level response keys: ${Object.keys(response.data).join(', ')}`);
    
    // Analyze the structure of the received data
    console.log('\n2. ANALYZING DATA STRUCTURE');
    const analysis = analyzeStructure(response.data);
    printAnalysis(analysis);
    
    // Extract all possible parameters from the response
    console.log('\n3. POTENTIAL QUERY PARAMETERS');
    const possibleParams = extractParameters(response.data);
    console.log(`Detected ${possibleParams.length} potential parameters: ${possibleParams.join(', ')}`);
    
    // Test if endpoint responds to HEAD request (to get metadata)
    console.log('\n4. TESTING ADDITIONAL HTTP METHODS');
    try {
      const headResponse = await client.head('/contact-lists/csv');
      console.log('✅ HEAD request succeeded');
      console.log('Headers:', headResponse.headers);
    } catch (error) {
      console.log('❌ HEAD request failed:', error.message);
    }
    
    // Try to test if a POST request would work (but don't actually create anything)
    console.log('\n5. CHECKING FOR ALLOWED HTTP METHODS');
    // This is usually provided via the OPTIONS method or the 'Allow' header
    try {
      const optionsResponse = await client.options('/contact-lists/csv');
      console.log('✅ OPTIONS request succeeded');
      console.log('Allowed methods:', optionsResponse.headers.allow || 'Not specified in headers');
      console.log('Access-Control-Allow-Methods:', optionsResponse.headers['access-control-allow-methods'] || 'Not specified');
    } catch (error) {
      console.log('❌ OPTIONS request failed:', error.message);
    }
    
    // Test if we can use special request headers
    console.log('\n6. TESTING SPECIAL REQUEST HEADERS');
    try {
      const specialHeaderResponse = await client.get('/contact-lists/csv', {
        headers: {
          'Accept': 'application/json',
          'x-api-key': SALESFINITY_API_KEY,
          'X-Fields': 'id,name', // Some APIs support field limiting
          'X-Page': '1',         // Some APIs support header-based pagination
          'X-Per-Page': '5'      // Some APIs support header-based pagination
        }
      });
      console.log('✅ Request with special headers succeeded');
      console.log('Response has same structure:', 
        JSON.stringify(Object.keys(specialHeaderResponse.data).sort()) === 
        JSON.stringify(Object.keys(response.data).sort()));
    } catch (error) {
      console.log('❌ Request with special headers failed:', error.message);
    }
    
    console.log('\n7. ANALYZING CONTACT LIST DATA STRUCTURE');
    if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
      const listItem = response.data.data[0];
      console.log('Sample contact list data:');
      console.log(JSON.stringify(listItem, null, 2));
      
      console.log('\nContact list properties:');
      Object.keys(listItem).forEach(key => {
        const value = listItem[key];
        const valueDesc = formatObject(value);
        console.log(`- ${key}: ${valueDesc}`);
      });
    } else {
      console.log('No contact list data available for analysis');
    }
    
    // Test different parameter combinations to see patterns in responses
    console.log('\n8. TESTING PARAMETER COMBINATIONS');
    const testParameters = [
      { label: 'Default', params: {} },
      { label: 'Page 2', params: { page: 2 } },
      { label: 'Limit 2', params: { perPage: 2 } },
      { label: 'Page 1 + Limit 2', params: { page: 1, perPage: 2 } },
      { label: 'Page 2 + Limit 2', params: { page: 2, perPage: 2 } }
    ];
    
    for (const test of testParameters) {
      try {
        // Construct query string
        const queryParams = new URLSearchParams();
        Object.entries(test.params).forEach(([key, value]) => {
          queryParams.append(key, value);
        });
        const queryString = queryParams.toString();
        
        console.log(`\nTesting: ${test.label} (${queryString || 'no params'})`);
        const testResponse = await client.get(`/contact-lists/csv${queryString ? '?' + queryString : ''}`);
        
        // Analyze the response for patterns
        console.log(`✅ Status: ${testResponse.status}`);
        if (testResponse.data.data && Array.isArray(testResponse.data.data)) {
          console.log(`Items returned: ${testResponse.data.data.length}`);
          
          if (testResponse.data.data.length > 0) {
            // Show first item ID to see if data is changing
            console.log(`First item ID: ${testResponse.data.data[0]._id}`);
          }
        }
      } catch (error) {
        console.log(`❌ Error with ${test.label}:`, error.message);
      }
    }
    
    console.log('\n🔍 CONTACT LISTS ANALYSIS COMPLETE');
  } catch (error) {
    console.error('❌ Error analyzing endpoints:', error);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the analysis
analyzeContactListsEndpoint()
  .catch(error => {
    console.error('❌ Unhandled error during analysis:', error);
  }); 
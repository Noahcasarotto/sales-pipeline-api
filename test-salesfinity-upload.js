const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');
const FormData = require('form-data');

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

// Create a sample CSV file for testing
async function createSampleCsvFile() {
  const csvContent = `First Name,Last Name,Email,Phone,Company,Job Title
John,Doe,john.doe@example.com,+1234567890,Test Company,CEO
Jane,Smith,jane.smith@example.com,+1987654321,Another Company,CTO`;
  
  const filename = 'sample_contacts.csv';
  await fs.writeFile(filename, csvContent);
  console.log(`✅ Created sample CSV file: ${filename}`);
  return filename;
}

// Try to discover the API capabilities by testing different endpoints
async function testApiCapabilities() {
  console.log('🔬 TESTING SALESFINITY API UPLOAD CAPABILITIES');
  console.log('API Key:', `${SALESFINITY_API_KEY.substring(0, 5)}...${SALESFINITY_API_KEY.substring(SALESFINITY_API_KEY.length - 4)}`);
  
  // Create a sample CSV file
  const csvFilename = await createSampleCsvFile();
  const csvPath = path.resolve(csvFilename);
  
  try {
    // First, check if we can find any documentation
    console.log('\n1. CHECKING FOR API DOCUMENTATION');
    const docEndpoints = [
      '/help', 
      '/docs', 
      '/documentation'
    ];
    
    let documentationFound = false;
    for (const endpoint of docEndpoints) {
      try {
        const response = await client.get(endpoint);
        console.log(`✅ Found documentation at ${endpoint}`);
        documentationFound = true;
      } catch (error) {
        console.log(`❌ No documentation at ${endpoint}`);
      }
    }
    
    if (!documentationFound) {
      console.log('No API documentation endpoints found');
    }
    
    // Check if the server supports file uploading
    console.log('\n2. CHECKING ALLOWED METHODS FOR CONTACT LISTS');
    try {
      const optionsResponse = await client.options('/contact-lists/csv');
      const allowedMethods = optionsResponse.headers['access-control-allow-methods'] || 'Not specified';
      console.log(`Allowed methods: ${allowedMethods}`);
      
      const supportsPost = allowedMethods.includes('POST');
      console.log(`✓ POST method ${supportsPost ? 'is' : 'is not'} supported`);
      
      if (supportsPost) {
        // Try to create a new contact list (read-only, won't actually create)
        console.log('\n3. TESTING READ-ONLY POST REQUEST WITH DRY RUN');
        try {
          // Some APIs support a dryRun parameter to test without making changes
          const dryRunResponse = await client.post('/contact-lists/csv?dryRun=true', {
            name: 'Test List (Dry Run)'
          });
          console.log('✅ Dry run POST succeeded');
          console.log('Response:', JSON.stringify(dryRunResponse.data, null, 2));
        } catch (error) {
          console.log('❌ Dry run POST failed:', error.message);
          if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response data:', error.response.data);
          }
        }
      }
      
      // Try to upload a CSV file using multipart/form-data
      console.log('\n4. TESTING CSV UPLOAD');
      
      try {
        // Read the CSV file
        const csvContent = await fs.readFile(csvPath, 'utf8');
        console.log('CSV content:', csvContent.substring(0, 100) + '...');
        
        // Try direct JSON upload first (this is safer than creating a real file upload)
        console.log('\n4.1 Testing direct JSON upload');
        try {
          const jsonUploadResponse = await client.post('/contact-lists/csv', {
            content: csvContent,
            format: 'csv',
            name: 'Test Contact List'
          });
          console.log('✅ JSON upload succeeded');
          console.log('Response:', JSON.stringify(jsonUploadResponse.data, null, 2));
        } catch (error) {
          console.log('❌ JSON upload failed:', error.message);
          if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response data:', error.response.data);
          }
        }
        
        // Try multipart/form-data upload
        console.log('\n4.2 Testing multipart/form-data upload');
        
        try {
          const form = new FormData();
          form.append('file', await fs.readFile(csvPath), {
            filename: 'sample_contacts.csv',
            contentType: 'text/csv'
          });
          form.append('name', 'Test Contact List');
          
          const formDataResponse = await axios.post(`${BASE_URL}/contact-lists/csv/upload`, form, {
            headers: {
              ...form.getHeaders(),
              'x-api-key': SALESFINITY_API_KEY
            }
          });
          
          console.log('✅ Multipart upload succeeded');
          console.log('Response:', JSON.stringify(formDataResponse.data, null, 2));
        } catch (error) {
          console.log('❌ Multipart upload failed:', error.message);
          if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Response data:', error.response.data);
          }
        }
      } catch (fileError) {
        console.log('❌ Error reading CSV file:', fileError.message);
      }
      
      // Try to find upload endpoints by brute force
      console.log('\n5. LOOKING FOR ALTERNATIVE UPLOAD ENDPOINTS');
      const uploadEndpoints = [
        '/contact-lists/upload',
        '/contact-lists/csv/upload',
        '/contacts/import',
        '/contacts/upload',
        '/import',
        '/upload'
      ];
      
      for (const endpoint of uploadEndpoints) {
        try {
          // Just check if the endpoint exists
          console.log(`Testing endpoint: ${endpoint}`);
          const response = await client.options(endpoint);
          console.log(`✅ Found potential upload endpoint: ${endpoint}`);
          console.log('Allowed methods:', response.headers['access-control-allow-methods'] || 'Not specified');
        } catch (error) {
          // If it's a 404, the endpoint doesn't exist
          if (error.response && error.response.status === 404) {
            console.log(`❌ Endpoint not found: ${endpoint}`);
          } else {
            // If it's another error, the endpoint might exist but we can't access it
            console.log(`⚠️ Endpoint may exist but returned error: ${endpoint}`);
            console.log('Status:', error.response?.status || 'Unknown');
          }
        }
      }
    } catch (error) {
      console.log('❌ Options request failed:', error.message);
    }
    
    // Clean up sample file
    await fs.unlink(csvPath);
    console.log(`\n✅ Cleaned up sample CSV file: ${csvFilename}`);
    
    console.log('\n🔍 UPLOAD CAPABILITY ANALYSIS COMPLETE');
  } catch (error) {
    console.error('❌ Error during API capability testing:', error);
  }
}

// We need to use form-data for multipart/form-data uploads
// Let's check if it's installed
async function ensureFormDataInstalled() {
  try {
    require.resolve('form-data');
    console.log('form-data package is already installed');
    return true;
  } catch (e) {
    console.log('Installing form-data package...');
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec('npm install form-data', (error, stdout, stderr) => {
        if (error) {
          console.error(`Error installing form-data: ${error.message}`);
          reject(error);
          return;
        }
        console.log('form-data package installed successfully');
        resolve(true);
      });
    });
  }
}

// Run the test
async function run() {
  try {
    await ensureFormDataInstalled();
    await testApiCapabilities();
  } catch (error) {
    console.error('❌ Unhandled error:', error);
  }
}

run(); 
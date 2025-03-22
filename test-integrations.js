const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 5000}`;
let token;

// Function to login and get auth token
async function login() {
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: process.env.TEST_USER_EMAIL || 'admin@example.com',
      password: process.env.TEST_USER_PASSWORD || 'password123'
    });
    
    token = response.data.token;
    console.log('Login successful! Token received.');
    return true;
  } catch (error) {
    console.error('Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test Instantly integration
async function testInstantly() {
  try {
    console.log('\n--- Testing Instantly.ai Integration ---');
    const response = await axios.get(`${API_URL}/api/outreach/test/instantly`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Instantly integration test successful!');
    console.log('User info:', response.data.data.user.email);
    console.log(`Found ${response.data.data.campaigns.length} campaigns`);
    
    return true;
  } catch (error) {
    console.error('❌ Instantly test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test Salesfinity integration
async function testSalesfinity() {
  try {
    console.log('\n--- Testing Salesfinity Integration ---');
    const response = await axios.get(`${API_URL}/api/outreach/test/salesfinity`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Salesfinity integration test successful!');
    console.log('Account info:', response.data.data.account.name);
    console.log(`Found ${response.data.data.campaigns.length} campaigns`);
    
    return true;
  } catch (error) {
    console.error('❌ Salesfinity test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Test LinkedIn integration
async function testLinkedIn() {
  try {
    console.log('\n--- Testing LinkedIn Integration ---');
    const response = await axios.get(`${API_URL}/api/outreach/test/linkedin`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ LinkedIn integration test successful!');
    console.log('Account info:', response.data.data.account.name);
    console.log(`Found ${response.data.data.agents.length} agents`);
    
    return true;
  } catch (error) {
    console.error('❌ LinkedIn test failed:', error.response?.data?.message || error.message);
    return false;
  }
}

// Send test email
async function sendTestEmail(leadId, campaignId) {
  try {
    console.log('\n--- Sending Test Email ---');
    const response = await axios.post(
      `${API_URL}/api/outreach/campaign/${campaignId}/lead/${leadId}/email`,
      {
        subject: 'Test Email from Sales Pipeline',
        body: 'Hello {{firstName}},\n\nThis is a test email from our sales pipeline system.',
        fromName: 'Test User',
        fromEmail: 'test@example.com'
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log('✅ Email sent successfully!');
    console.log('Outreach ID:', response.data.data.outreachActivity._id);
    
    return response.data.data.outreachActivity._id;
  } catch (error) {
    console.error('❌ Email sending failed:', error.response?.data?.message || error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log('Starting integration tests...');
  
  // Login first
  const loggedIn = await login();
  if (!loggedIn) return;
  
  // Test each integration
  const instantlySuccess = await testInstantly();
  const salesfinitySuccess = await testSalesfinity();
  const linkedInSuccess = await testLinkedIn();
  
  // Send a test email if all integrations are working
  if (instantlySuccess && process.env.TEST_LEAD_ID && process.env.TEST_CAMPAIGN_ID) {
    await sendTestEmail(process.env.TEST_LEAD_ID, process.env.TEST_CAMPAIGN_ID);
  }
  
  console.log('\n--- Integration Test Summary ---');
  console.log(`Instantly.ai:  ${instantlySuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Salesfinity:   ${salesfinitySuccess ? '✅ Connected' : '❌ Failed'}`);
  console.log(`LinkedIn:      ${linkedInSuccess ? '✅ Connected' : '❌ Failed'}`);
}

// Run the tests
runTests()
  .then(() => console.log('\nAll tests completed.'))
  .catch(err => console.error('Test script error:', err)); 
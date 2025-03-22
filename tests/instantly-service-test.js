require('dotenv').config();
const InstantlyService = require('../services/InstantlyService');

async function testInstantlyService() {
  console.log('Testing InstantlyService...');
  
  // Initialize the service with API key from environment variables
  const apiKey = process.env.INSTANTLY_API_KEY;
  if (!apiKey) {
    console.error('API key is missing! Please check your .env file.');
    return;
  }
  
  // Create service instance
  const instantlyService = new InstantlyService(apiKey);
  console.log('Service initialized');
  
  try {
    // Test connection
    console.log('\nTesting API connection...');
    const isConnected = await instantlyService.testConnection();
    
    if (isConnected) {
      console.log('✅ Successfully connected to Instantly.ai API');
      
      // Display API tier info
      const apiTierInfo = instantlyService.getApiTierInfo();
      console.log('\nAPI Tier Information:');
      console.log(`  API Tier: ${apiTierInfo.apiTier}`);
      console.log(`  API Scopes: ${apiTierInfo.apiScopes.join(', ')}`);
      
      // Get campaigns
      console.log('\nFetching campaigns...');
      const campaigns = await instantlyService.getCampaigns();
      console.log(`✅ Retrieved ${campaigns.length} campaigns`);
      
      if (campaigns.length > 0) {
        const campaign = campaigns[0];
        console.log(`\nFetching details for campaign "${campaign.name}" (${campaign.id})...`);
        
        // Get campaign details
        try {
          const campaignDetails = await instantlyService.getCampaign(campaign.id);
          console.log('✅ Retrieved campaign details');
          
          // Display some campaign details
          console.log('\nCampaign details:');
          console.log(`  Name: ${campaignDetails.name}`);
          console.log(`  Status: ${campaignDetails.status}`);
          console.log(`  Created: ${campaignDetails.timestamp_created}`);
          
          // Get leads from the campaign
          console.log('\nFetching leads for this campaign...');
          try {
            const leads = await instantlyService.getLeads(campaign.id, 5);
            if (leads.length > 0) {
              console.log(`✅ Retrieved ${leads.length} leads from campaign`);
              console.log('\nSample leads:');
              leads.slice(0, 3).forEach((lead, index) => {
                console.log(`  ${index + 1}. ${lead.email || 'No email'} (${lead.first_name || 'Unknown'} ${lead.last_name || ''})`);
              });
            } else {
              console.log('⚠️ No leads found in this campaign or leads endpoint not available in your API tier');
            }
          } catch (error) {
            console.error('❌ Error fetching leads:', error.message);
          }
          
          // Get campaign analytics
          console.log('\nFetching analytics for this campaign...');
          try {
            const analytics = await instantlyService.getCampaignAnalytics(campaign.id);
            if (analytics.message && analytics.message.includes('not available')) {
              console.log(`⚠️ ${analytics.message}`);
            } else {
              console.log('✅ Retrieved campaign analytics');
              console.log('Analytics data:', analytics);
            }
          } catch (error) {
            console.error('❌ Error fetching campaign analytics:', error.message);
          }
        } catch (error) {
          console.error('❌ Error fetching campaign details:', error.message);
        }
      }
      
      // After testing, show available endpoints status
      const finalApiTierInfo = instantlyService.getApiTierInfo();
      console.log('\nAvailable Endpoints:');
      Object.entries(finalApiTierInfo.availableEndpoints).forEach(([endpoint, available]) => {
        if (available === true) {
          console.log(`  ✅ ${endpoint}`);
        } else if (available === false) {
          console.log(`  ❌ ${endpoint}`);
        } else {
          console.log(`  ❓ ${endpoint} (not tested)`);
        }
      });
    } else {
      console.error('❌ Failed to connect to Instantly.ai API');
    }
  } catch (error) {
    console.error('❌ Error during service test:', error.message);
  }
  
  console.log('\nTest completed');
}

// Run the test
testInstantlyService()
  .catch(error => console.error('Unhandled error:', error)); 
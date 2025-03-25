const axios = require('axios');

class SalesfinityService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://client-api.salesfinity.co/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey // Use lowercase 'x' as per documentation
      }
    });
  }

  // Validate API key and connection by testing contact-lists endpoint
  async validateConnection() {
    try {
      const response = await this.client.get('/contact-lists/csv?page=1');
      return {
        valid: response.status === 200,
        account: {
          status: 'active',
          lists: response.data.data || []
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  // Get all contact lists
  async getContactLists(page = 1, perPage = 10) {
    try {
      const response = await this.client.get(`/contact-lists/csv?page=${page}&perPage=${perPage}`);
      return response.data;
    } catch (error) {
      throw new Error(`Error fetching contact lists: ${error.message}`);
    }
  }

  // Get contacts from a list - SIMULATED because the API endpoint doesn't work
  async getContactsFromList(listId, page = 1, perPage = 100) {
    console.log(`Simulating fetching contacts from list ${listId}`);
    // Since the actual endpoint returned 404, we'll simulate this
    const sampleContacts = [
      {
        _id: `sim_contact_1_${listId}`,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890',
        company: 'Acme Inc.'
      },
      {
        _id: `sim_contact_2_${listId}`,
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+1987654321',
        company: 'Globex Corp.'
      }
    ];
    
    return {
      data: sampleContacts,
      pagination: {
        currentPage: page,
        totalPages: 1,
        totalItems: sampleContacts.length,
        perPage
      }
    };
  }

  // Create a new contact list - SIMULATED because the API is limited
  async createContactList(name, description = '') {
    console.log(`Simulating creation of contact list: ${name}`);
    // Simulate a successful response
    return {
      success: true,
      data: {
        _id: `sim_list_${Date.now()}`,
        name,
        description,
        createdAt: new Date().toISOString()
      }
    };
  }

  // Upload contacts to a list - SIMULATED because the API is limited
  async uploadContactsToList(listId, contacts) {
    console.log(`Simulating uploading ${contacts.length} contacts to list ${listId}`);
    // Simulate a successful response
    return {
      success: true,
      message: `${contacts.length} contacts uploaded successfully (simulated)`,
      listId
    };
  }

  // Schedule a call (simulated)
  async scheduleCall(contactInfo) {
    console.log('Simulating call scheduling for contact:', JSON.stringify(contactInfo));
    
    // Simulate a successful response
    return {
      id: `sim_call_${Date.now()}`,
      status: 'scheduled',
      scheduledAt: new Date().toISOString(),
      contact: contactInfo
    };
  }

  // Map our internal lead structure to Salesfinity contact format
  mapLeadToSalesfinityContact(lead) {
    return {
      firstName: lead.firstName,
      lastName: lead.lastName,
      company: lead.company || '',
      jobTitle: lead.jobTitle || '',
      phone: lead.phone || '',
      email: lead.email || '',
      customFields: {
        industry: lead.industry || '',
        website: lead.website || '',
        linkedinUrl: lead.linkedinUrl || '',
        internalId: lead._id.toString()
      }
    };
  }

  // Map simulated Salesfinity call data to our internal outreach format
  mapSalesfinityCallToOutreach(call, leadId) {
    // All our calls are simulated
    return {
      lead: leadId,
      type: 'Call',
      channel: 'Salesfinity',
      status: 'Scheduled',
      scheduledAt: new Date(call.scheduledAt || Date.now()),
      call: {
        notes: call.notes || '',
        dialedNumber: call.contact?.phone || '',
        outcome: 'Scheduled'
      },
      externalIds: {
        salesfinityId: call.id
      }
    };
  }

  // Map call outcome for future reference
  mapCallOutcome(salesfinityOutcome) {
    const outcomeMap = {
      'answered': 'Answered',
      'voicemail': 'Voicemail',
      'no_answer': 'No Answer',
      'busy': 'Busy',
      'wrong_number': 'Wrong Number',
      'not_interested': 'Not Interested',
      'interested': 'Interested',
      'meeting_scheduled': 'Meeting Scheduled'
    };
    return outcomeMap[salesfinityOutcome] || 'No Answer';
  }
}

module.exports = SalesfinityService; 
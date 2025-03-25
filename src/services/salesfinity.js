const axios = require('axios');

/**
 * Service for interacting with the Salesfinity API
 * Based on the official documentation:
 * - GET /contact-lists/csv - Get contact lists
 * - GET /call-log - Get call logs
 * - GET /team - Get team members/users
 */
class SalesfinityService {
  /**
   * Initialize the Salesfinity service
   * @param {string} apiKey - The Salesfinity API key
   */
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://client-api.salesfinity.co/v1';
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey
      },
      timeout: 15000
    });
  }

  /**
   * Validate the API connection by testing the contact-lists endpoint
   * @returns {Promise<Object>} Connection status and account information
   */
  async validateConnection() {
    try {
      const response = await this.client.get('/contact-lists/csv');
      return {
        valid: response.status === 200,
        account: {
          status: 'active',
          lists: response.data.data || [],
          pagination: response.data.pagination || {}
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Get all contact lists with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} perPage - Number of items per page
   * @returns {Promise<Object>} Contact lists and pagination info
   */
  async getContactLists(page = 1, perPage = 10) {
    try {
      const response = await this.client.get('/contact-lists/csv', {
        params: { page, perPage }
      });
      
      return {
        success: true,
        data: response.data.data || [],
        pagination: response.data.pagination || {},
        totalLists: response.data.pagination?.total || 0
      };
    } catch (error) {
      throw new Error(`Error fetching contact lists: ${error.message}`);
    }
  }

  /**
   * Get all call logs with pagination
   * @param {number} page - Page number (1-based)
   * @param {number} limit - Number of items per page
   * @returns {Promise<Object>} Call logs and pagination info
   */
  async getCallLogs(page = 1, limit = 10) {
    try {
      const response = await this.client.get('/call-log', {
        params: { page, limit }
      });
      
      return {
        success: true,
        data: response.data.data || [],
        pagination: response.data.pagination || {},
        totalCalls: response.data.pagination?.total || 0
      };
    } catch (error) {
      throw new Error(`Error fetching call logs: ${error.message}`);
    }
  }

  /**
   * Get call log details by ID
   * @param {string} callId - The ID of the call log
   * @returns {Promise<Object>} Call log details
   */
  async getCallDetails(callId) {
    try {
      const response = await this.client.get(`/call-log/${callId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw new Error(`Error fetching call details: ${error.message}`);
    }
  }

  /**
   * Get all team members (users)
   * @returns {Promise<Object>} Team members data
   */
  async getTeamMembers() {
    try {
      const response = await this.client.get('/team');
      
      // According to docs, response has _id, name, and users array
      const teamData = response.data || { users: [] };
      
      return {
        success: true,
        data: teamData,
        total: teamData.users ? teamData.users.length : 0
      };
    } catch (error) {
      console.error(`Error fetching team members: ${error.message}`);
      throw new Error(`Error fetching team members: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get a specific contact list by ID
   * @param {string} listId - The ID of the contact list to retrieve
   * @returns {Promise<Object|null>} The contact list or null if not found
   */
  async getContactListById(listId) {
    try {
      // Get all contact lists (API doesn't support direct retrieval by ID)
      const listsResult = await this.getContactLists(1, 50);
      const allLists = listsResult.data || [];
      
      // Find the matching list
      const list = allLists.find(list => list._id === listId);
      
      if (!list) {
        // If not found in first page and there are more pages, get all lists
        if (listsResult.pagination?.total > listsResult.pagination?.perPage) {
          const allListsResult = await this.getAllContactLists();
          return allListsResult.find(list => list._id === listId) || null;
        }
        return null;
      }
      
      return list;
    } catch (error) {
      throw new Error(`Error finding contact list with ID ${listId}: ${error.message}`);
    }
  }

  /**
   * Get all contact lists without pagination (fetches all pages)
   * @returns {Promise<Array>} Complete array of contact lists
   */
  async getAllContactLists() {
    try {
      // Get first page to determine total pages
      const firstPage = await this.getContactLists(1, 50);
      const lists = [...firstPage.data];
      
      const totalItems = firstPage.pagination?.total || 0;
      const fetchedItems = lists.length;
      
      if (fetchedItems < totalItems) {
        // Calculate remaining pages
        const totalPages = Math.ceil(totalItems / 50);
        
        // Fetch remaining pages
        const remainingRequests = [];
        for (let page = 2; page <= totalPages; page++) {
          remainingRequests.push(this.getContactLists(page, 50));
        }
        
        const responses = await Promise.all(remainingRequests);
        
        // Combine all lists
        responses.forEach(response => {
          if (response.success && response.data) {
            lists.push(...response.data);
          }
        });
      }
      
      return lists;
    } catch (error) {
      throw new Error(`Error fetching all contact lists: ${error.message}`);
    }
  }

  /**
   * Get all call logs without pagination (fetches all pages)
   * @param {number} maxPages - Maximum number of pages to fetch (default: 5, set to 0 for all)
   * @returns {Promise<Array>} Complete array of call logs
   */
  async getAllCallLogs(maxPages = 5) {
    try {
      // Get first page to determine total pages
      const firstPage = await this.getCallLogs(1, 100);
      const calls = [...firstPage.data];
      
      const totalItems = firstPage.pagination?.total || 0;
      const fetchedItems = calls.length;
      const pageSize = 100;
      
      if (fetchedItems < totalItems) {
        // Calculate total pages
        const totalPages = Math.ceil(totalItems / pageSize);
        
        // Limit pages if maxPages is specified
        const pagesToFetch = maxPages > 0 ? Math.min(totalPages, maxPages) : totalPages;
        
        // Fetch remaining pages
        const remainingRequests = [];
        for (let page = 2; page <= pagesToFetch; page++) {
          remainingRequests.push(this.getCallLogs(page, pageSize));
        }
        
        const responses = await Promise.all(remainingRequests);
        
        // Combine all calls
        responses.forEach(response => {
          if (response.success && response.data) {
            calls.push(...response.data);
          }
        });
      }
      
      return calls;
    } catch (error) {
      throw new Error(`Error fetching all call logs: ${error.message}`);
    }
  }

  /**
   * SIMULATED: Get contacts from a list
   * Note: The API does not support retrieving contacts from a list directly
   * @param {string} listId - The ID of the contact list
   * @returns {Promise<Object>} Simulated contacts data
   */
  async getContactsFromList(listId) {
    console.log(`Simulating fetching contacts from list ${listId}`);
    
    // Get the actual list to use its name in the simulation
    let listName = '';
    try {
      const list = await this.getContactListById(listId);
      listName = list ? list.name : 'Unknown List';
    } catch (e) {
      listName = 'Unknown List';
    }
    
    // Generate simulated contacts based on list name
    const sampleContacts = [];
    const numContacts = Math.floor(Math.random() * 8) + 3; // 3-10 contacts
    
    for (let i = 1; i <= numContacts; i++) {
      sampleContacts.push({
        _id: `sim_contact_${i}_${listId}`,
        firstName: `FirstName${i}`,
        lastName: `LastName${i}`,
        email: `contact${i}@example.com`,
        phone: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`,
        company: `Company ${i}`,
        list: listName
      });
    }
    
    return {
      success: true,
      data: sampleContacts,
      listId,
      listName,
      simulation: true
    };
  }

  /**
   * SIMULATED: Create a contact list
   * @param {string} name - The name of the list
   * @param {string} description - Optional description
   * @returns {Promise<Object>} Simulated new list data
   */
  async createContactList(name, description = '') {
    console.log(`Simulating creation of contact list: ${name}`);
    
    return {
      success: true,
      data: {
        _id: `sim_list_${Date.now()}`,
        name,
        user: 'simulated_user',
        simulation: true
      },
      message: 'List created (simulated)'
    };
  }

  /**
   * SIMULATED: Add contacts to a list
   * @param {string} listId - The ID of the list
   * @param {Array} contacts - Array of contact objects
   * @returns {Promise<Object>} Simulated result
   */
  async addContactsToList(listId, contacts) {
    console.log(`Simulating adding ${contacts.length} contacts to list ${listId}`);
    
    return {
      success: true,
      message: `Added ${contacts.length} contacts (simulated)`,
      listId,
      contacts: contacts.length,
      simulation: true
    };
  }

  /**
   * SIMULATED: Schedule a call
   * @param {Object} contactInfo - Contact information
   * @returns {Promise<Object>} Simulated call data
   */
  async scheduleCall(contactInfo) {
    console.log('Simulating call scheduling for contact:', JSON.stringify(contactInfo));
    
    const scheduledTime = new Date();
    scheduledTime.setHours(scheduledTime.getHours() + Math.floor(Math.random() * 24) + 1);
    
    return {
      id: `sim_call_${Date.now()}`,
      status: 'scheduled',
      scheduledAt: scheduledTime.toISOString(),
      contact: contactInfo,
      simulation: true
    };
  }

  /**
   * Maps a lead to the format expected by Salesfinity
   * @param {Object} lead - The lead data
   * @returns {Object} Formatted contact data
   */
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

  /**
   * Maps a Salesfinity call to our internal outreach format
   * @param {Object} call - The call data
   * @param {string} leadId - The lead ID
   * @returns {Object} Formatted outreach data
   */
  mapSalesfinityCallToOutreach(call, leadId) {
    return {
      lead: leadId,
      type: 'Call',
      channel: 'Salesfinity',
      status: this.mapCallStatus(call),
      scheduledAt: new Date(call.createdAt || Date.now()),
      sentAt: new Date(call.updatedAt || Date.now()),
      call: {
        to: call.to || '',
        from: call.from || '',
        notes: call.transcription || '',
        dialedNumber: call.to || '',
        outcome: this.mapCallOutcome(call),
        recordingUrl: call.recording_url || '',
        disposition: call.disposition?.external_name || 'Unknown'
      },
      externalIds: {
        salesfinityId: call._id
      }
    };
  }

  /**
   * Helper method to map call status from API response
   * @param {Object} call - Call log object
   * @returns {string} Mapped call status
   */
  mapCallStatus(call) {
    if (!call) return 'Unknown';
    
    if (call.disposition && typeof call.disposition === 'object') {
      return call.disposition.external_name || call.disposition.name || 'Unknown';
    }
    
    if (call.status) {
      const statusMap = {
        'completed': 'Completed',
        'no-answer': 'No Answer',
        'busy': 'Busy',
        'failed': 'Failed',
        'canceled': 'Canceled',
        'not_reached': 'Not Reached',
        'machine_detection': 'Voicemail',
        'voicemail': 'Voicemail'
      };
      return statusMap[call.status.toLowerCase()] || call.status;
    }
    
    return 'Unknown';
  }

  /**
   * Maps call outcome based on disposition
   * @param {Object} call - The call data
   * @returns {string} Call outcome
   */
  mapCallOutcome(call) {
    if (!call.disposition) return 'Unknown';
    
    return call.disposition.external_name || 'Unknown';
  }

  /**
   * Create a new contact list
   * @param {string} name - The name of the contact list
   * @param {string} userId - The user ID to assign the list to
   * @param {Array} contacts - Optional array of contacts to add to the list
   * @returns {Promise<Object>} Created contact list information
   */
  async createContactList(name, userId = null, contacts = []) {
    try {
      // Get the first team member if userId not provided
      if (!userId) {
        try {
          const teamResult = await this.getTeamMembers();
          if (teamResult.success && teamResult.data && teamResult.data.users && teamResult.data.users.length > 0) {
            userId = teamResult.data.users[0].user._id;
          }
        } catch (error) {
          console.log('Could not fetch team members, using default user ID');
        }
      }

      const requestData = {
        name: name,
        user_id: userId || '67e20043bde3c5d71c48295e', // Fallback to a default user ID from the logs
        contacts: contacts.map(c => ({
          first_name: c.firstName || c.first_name || '',
          last_name: c.lastName || c.last_name || '',
          email: c.email || '',
          company: c.company || '',
          title: c.title || c.jobTitle || '',
          phone_numbers: [{
            type: 'mobile',
            number: c.phone || c.phoneNumber || '',
            country_code: c.countryCode || 'US'
          }]
        }))
      };

      const response = await this.client.post('/contact-lists', requestData);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error creating contact list: ${error.message}`);
      throw new Error(`Failed to create contact list: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Add a contact to a list
   * @param {string} listId - The ID of the contact list
   * @param {Object} contactData - Contact information
   * @returns {Promise<Object>} Added contact information
   */
  async addContact(listId, contactData) {
    try {
      // Format contact data according to API requirements
      const formattedContact = {
        first_name: contactData.firstName || contactData.first_name || '',
        last_name: contactData.lastName || contactData.last_name || '',
        email: contactData.email || '',
        company: contactData.company || '',
        title: contactData.title || contactData.jobTitle || '',
        linkedin: contactData.linkedin || '',
        website: contactData.website || '',
        notes: contactData.notes || '',
        phone_numbers: []
      };

      // Handle phone numbers
      if (contactData.phone || contactData.phoneNumber) {
        formattedContact.phone_numbers.push({
          type: 'mobile',
          number: contactData.phone || contactData.phoneNumber || '',
          country_code: contactData.countryCode || 'US'
        });
      } else if (contactData.phone_numbers && Array.isArray(contactData.phone_numbers)) {
        formattedContact.phone_numbers = contactData.phone_numbers;
      } else {
        // Ensure at least one phone number is present
        formattedContact.phone_numbers.push({
          type: 'mobile',
          number: '',
          country_code: 'US'
        });
      }

      const response = await this.client.post(`/contact-lists/${listId}`, formattedContact);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`Error adding contact to list ${listId}: ${error.message}`);
      throw new Error(`Failed to add contact: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Delete a contact list
   * @param {string} listId - The ID of the contact list to delete
   * @returns {Promise<Object>} Result of the deletion
   */
  async deleteContactList(listId) {
    try {
      // The API endpoint is specifically /contact-lists/csv/{id} for deletion
      const response = await this.client.delete(`/contact-lists/csv/${listId}`);
      
      return {
        success: true,
        data: response.data || { deleted: true, listId }
      };
    } catch (error) {
      console.error(`Error deleting contact list ${listId}: ${error.message}`);
      throw new Error(`Failed to delete contact list: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Reimport contacts (add list to dialing queue)
   * @param {string} listId - The ID of the contact list to reimport
   * @returns {Promise<Object>} Result of the reimport operation
   */
  async reimportContacts(listId) {
    try {
      // The API endpoint is specifically /contact-lists/csv/{id}/reimport for reimporting
      const response = await this.client.post(`/contact-lists/csv/${listId}/reimport`);
      
      return {
        success: true,
        data: response.data || { queued: true, listId }
      };
    } catch (error) {
      console.error(`Error reimporting contacts for list ${listId}: ${error.message}`);
      throw new Error(`Failed to reimport contacts: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = SalesfinityService; 
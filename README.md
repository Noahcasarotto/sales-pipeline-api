# Centralized Sales Pipeline

A centralized sales pipeline backend for managing outreach across multiple channels:

1. Cold Email through Instantly.ai & Personal Accounts
2. Cold Calling through salesfinity.co
3. LinkedIn outreach

## Features

- **Lead Management**: Import, store, and manage leads in a centralized database
- **Campaign Management**: Create and manage outreach campaigns across multiple channels
- **Sequence Automation**: Design multi-step outreach sequences with custom timing and logic
- **Integration with 3rd Party Tools**: Instantly.ai for email, Salesfinity for calls, and LinkedIn outreach
- **Unified Analytics**: Track performance across all outreach channels in one place
- **Team Collaboration**: Assign campaigns and leads to team members

## Tech Stack

- Node.js with Express
- MongoDB with Mongoose
- JWT Authentication
- RESTful API

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB
- API keys for Instantly.ai, Salesfinity, etc.

### Installation

1. Clone the repository
```
git clone https://github.com/your-username/sales-pipeline.git
cd sales-pipeline
```

2. Install dependencies
```
npm install
```

3. Set up environment variables
Create a `.env` file in the root directory with the following variables:
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sales_pipeline
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development

# API credentials for integration
INSTANTLY_API_KEY=your_instantly_api_key
SALESFINITY_API_KEY=your_salesfinity_api_key
LINKEDIN_API_KEY=your_linkedin_api_key
```

4. Start the server
```
npm run dev
```

## API Documentation

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user profile
- `PATCH /api/auth/update-password` - Update password

### Leads

- `GET /api/leads` - Get all leads with pagination and filtering
- `GET /api/leads/:id` - Get a single lead
- `POST /api/leads` - Create a new lead
- `PATCH /api/leads/:id` - Update a lead
- `DELETE /api/leads/:id` - Delete a lead
- `POST /api/leads/bulk-import` - Bulk import leads
- `GET /api/leads/search` - Search leads

### Campaigns

- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get a single campaign
- `POST /api/campaigns` - Create a new campaign
- `PATCH /api/campaigns/:id` - Update a campaign
- `DELETE /api/campaigns/:id` - Delete a campaign
- `GET /api/campaigns/:id/leads` - Get leads in a campaign
- `POST /api/campaigns/:id/leads` - Add leads to a campaign
- `DELETE /api/campaigns/:id/leads` - Remove leads from a campaign
- `POST /api/campaigns/:id/team` - Add team members to a campaign
- `DELETE /api/campaigns/:id/team` - Remove team members from a campaign

### Outreach

- `GET /api/outreach` - Get all outreach activities
- `GET /api/outreach/:id` - Get a single outreach activity
- `GET /api/outreach/lead/:leadId/history` - Get lead outreach history
- `POST /api/outreach/campaign/:campaignId/lead/:leadId/email` - Send email to a lead
- `POST /api/outreach/campaign/:campaignId/lead/:leadId/call` - Schedule a call with a lead
- `POST /api/outreach/lead/:leadId/linkedin/connect` - Send LinkedIn connection request
- `POST /api/outreach/lead/:leadId/linkedin/message` - Send LinkedIn message
- `PATCH /api/outreach/:id` - Update outreach activity
- `POST /api/outreach/:id/sync` - Sync outreach status with third-party services
- `POST /api/outreach/:id/follow-up` - Create a follow-up outreach

## Integrations

### Instantly.ai (Email)

This integration allows you to send cold emails through Instantly.ai and sync the results back to the sales pipeline.

### Salesfinity (Cold Calling)

This integration enables scheduling calls through Salesfinity and tracking call outcomes.

### LinkedIn

This integration facilitates sending connection requests and messages via LinkedIn.

## License

MIT 
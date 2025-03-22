const express = require('express');
const outreachController = require('../controllers/outreach');
const authController = require('../controllers/auth');

const router = express.Router();

// Temporarily disable authentication for testing
// router.use(authController.protect);

// Get all outreach activities
router.get('/', outreachController.getOutreachActivities);

// Get a single outreach activity
router.get('/:id', outreachController.getOutreachActivity);

// Get lead outreach history
router.get('/lead/:leadId/history', outreachController.getLeadOutreachHistory);

// Send email to a lead
router.post('/campaign/:campaignId/lead/:leadId/email', outreachController.sendEmail);

// Schedule a call with a lead
router.post('/campaign/:campaignId/lead/:leadId/call', outreachController.scheduleCall);

// Send LinkedIn connection request to a lead
router.post('/lead/:leadId/linkedin/connect', outreachController.sendLinkedInConnection);

// Send LinkedIn message to an existing connection
router.post('/lead/:leadId/linkedin/message', outreachController.sendLinkedInMessage);

// Update outreach activity
router.patch('/:id', outreachController.updateOutreachActivity);

// Sync outreach status with third-party services
router.post('/:id/sync', outreachController.syncOutreachStatus);

// Create a follow-up outreach
router.post('/:id/follow-up', outreachController.createFollowUp);

// Test endpoints for integrations
router.get('/test/instantly', outreachController.testInstantlyIntegration);
router.get('/test/salesfinity', outreachController.testSalesfinityIntegration);
router.get('/test/linkedin', outreachController.testLinkedInIntegration);

module.exports = router; 
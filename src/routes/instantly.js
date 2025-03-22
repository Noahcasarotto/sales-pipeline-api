const express = require('express');
const router = express.Router();
const instantlyController = require('../controllers/instantly');
const authController = require('../controllers/auth');

// Temporarily disable authentication for testing
// router.use(authController.protect);

/**
 * @route   GET /api/instantly/info
 * @desc    Get Instantly.ai API tier information
 * @access  Private
 */
router.get('/info', instantlyController.getApiInfo.bind(instantlyController));

/**
 * @route   GET /api/instantly/campaigns
 * @desc    Get all campaigns
 * @access  Private
 */
router.get('/campaigns', instantlyController.getCampaigns.bind(instantlyController));

/**
 * @route   GET /api/instantly/campaigns/:campaignId
 * @desc    Get a specific campaign
 * @access  Private
 */
router.get('/campaigns/:campaignId', instantlyController.getCampaign.bind(instantlyController));

/**
 * @route   POST /api/instantly/campaigns
 * @desc    Create a new campaign
 * @access  Private
 */
router.post('/campaigns', instantlyController.createCampaign.bind(instantlyController));

/**
 * @route   POST /api/instantly/campaigns/:campaignId/start
 * @desc    Start a campaign
 * @access  Private
 */
router.post('/campaigns/:campaignId/start', instantlyController.startCampaign.bind(instantlyController));

/**
 * @route   POST /api/instantly/campaigns/:campaignId/pause
 * @desc    Pause a campaign
 * @access  Private
 */
router.post('/campaigns/:campaignId/pause', instantlyController.pauseCampaign.bind(instantlyController));

module.exports = router; 
const express = require('express');
const campaignsController = require('../controllers/campaigns');
const authController = require('../controllers/auth');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Campaign CRUD operations
router.route('/')
  .get(campaignsController.getCampaigns)
  .post(campaignsController.createCampaign);

router.route('/:id')
  .get(campaignsController.getCampaign)
  .patch(campaignsController.updateCampaign)
  .delete(authController.restrictTo('admin', 'manager'), campaignsController.deleteCampaign);

// Campaign lead management
router.get('/:id/leads', campaignsController.getCampaignLeads);
router.post('/:id/leads', campaignsController.addLeadsToCampaign);
router.delete('/:id/leads', campaignsController.removeLeadsFromCampaign);

// Campaign team management
router.post('/:id/team', campaignsController.addTeamMembersToCampaign);
router.delete('/:id/team', campaignsController.removeTeamMembersFromCampaign);

module.exports = router; 
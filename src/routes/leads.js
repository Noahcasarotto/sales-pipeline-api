const express = require('express');
const leadsController = require('../controllers/leads');
const authController = require('../controllers/auth');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

// Routes that all users can access
router.get('/', leadsController.getLeads);
router.get('/search', leadsController.searchLeads);
router.get('/:id', leadsController.getLead);
router.post('/', leadsController.createLead);
router.patch('/:id', leadsController.updateLead);

// Routes that only admins and managers can access
router.use(authController.restrictTo('admin', 'manager'));
router.delete('/:id', leadsController.deleteLead);
router.post('/bulk-import', leadsController.bulkImportLeads);

module.exports = router; 
const express = require('express');
const userController = require('../controllers/users'); // We'll create this next
const authController = require('../controllers/auth');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// User profile routes
router.get('/me', authController.getMe);
router.patch('/update-password', authController.updatePassword);

// Only admin can access these routes
router.use(authController.restrictTo('admin'));

// User management routes
router.route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);

router.route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

// User integration routes
router.patch('/:id/integrations', userController.updateUserIntegrations);

module.exports = router; 
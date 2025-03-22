const express = require('express');
const authController = require('../controllers/auth');

const router = express.Router();

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.use(authController.protect);
router.get('/me', authController.getMe);
router.patch('/update-password', authController.updatePassword);

module.exports = router; 
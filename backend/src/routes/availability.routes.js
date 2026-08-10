const express = require('express');
const router = express.Router();
const AvailabilityController = require('../controllers/availability.controller');

// GET /api/v1/availability/courts/:courtId
// Public route to check availability and get pricing
router.get('/courts/:courtId', AvailabilityController.checkAvailability);

module.exports = router;

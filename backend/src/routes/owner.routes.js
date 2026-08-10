const express = require('express');
const router = express.Router();
const OwnerController = require('../controllers/owner.controller');
const authMiddleware = require('../middleware/auth.middleware');
const rbacMiddleware = require('../middleware/rbac.middleware');

// All endpoints in this file are strictly for OWNERs
router.use(authMiddleware.authenticateJWT);
router.use(rbacMiddleware.requireRole('OWNER'));

// 12.01 Owner Dashboard
router.get('/dashboard', OwnerController.getDashboard);

// 12.06 Booking Management
router.get('/bookings', OwnerController.getBookings);

// 12.07 Customer
router.get('/customers', OwnerController.getCustomers);

// 12.11 Revenue
router.get('/revenue', OwnerController.getRevenue);

module.exports = router;

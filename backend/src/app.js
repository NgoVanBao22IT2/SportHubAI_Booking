'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount Auth API Routes
app.use('/api/v1/auth', authRoutes);

// Mount Admin Operations (Must be before generic /api/v1 to avoid catching middleware)
const adminRoutes = require('./routes/admin.routes');
app.use('/api/v1/admin', adminRoutes);

// Mount Venue API Routes
const venueRoutes = require('./routes/venue.routes');
const venueSearchRoutes = require('./routes/venue-search.routes');

app.use('/api/v1', venueSearchRoutes); // public GET /venues
app.use('/api/v1', venueRoutes); // protected POST/PUT/DELETE /venues

// Mount Availability & Pricing Engine
const availabilityRoutes = require('./routes/availability.routes');
const slotBlockingRoutes = require('./routes/slot-blocking.routes');
const ownerAggregateRoutes = require('./routes/owner.routes');

app.use('/api/v1/availability', availabilityRoutes);
app.use('/api/v1/owner', slotBlockingRoutes);
app.use('/api/v1/owner', ownerAggregateRoutes);

// Mount Booking Engine
const bookingRoutes = require('./routes/booking.routes');
app.use('/api/v1/bookings', bookingRoutes);

// Mount Payment Integration
const paymentRoutes = require('./routes/payment.routes');
app.use('/api/v1/payments', paymentRoutes);

// (Admin Operations moved up)

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(err.statusCode || 500).json({
    success: false,
    code: err.code || 'SERVER_ERROR',
    message: err.message || 'Internal Server Error'
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[SportHubAI Backend] Running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

module.exports = app;

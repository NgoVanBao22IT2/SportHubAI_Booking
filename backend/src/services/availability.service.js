const { Court, SlotBlocking, Booking } = require('../models');
const { Op } = require('sequelize');
const PricingService = require('./pricing.service');

class AvailabilityService {
  /**
   * Check court availability for a specific interval and return pricing if available.
   */
  static async checkAvailability(courtId, date, startTime, endTime) {
    // 1. Basic format validation
    if (!date || !startTime || !endTime) {
      const error = new Error('date, start_time, and end_time are required');
      error.statusCode = 400;
      throw error;
    }

    if (startTime >= endTime) {
      const error = new Error('start_time must be before end_time');
      error.statusCode = 400;
      throw error;
    }

    // 2. Court Status Check
    const court = await Court.findOne({ where: { court_id: courtId } });
    if (!court) {
      const error = new Error('Court not found');
      error.statusCode = 404;
      throw error;
    }
    
    if (court.court_status !== 'ACTIVE') {
      return {
        is_available: false,
        reason: `Court is currently ${court.court_status}`
      };
    }

    // 3. Operating Hours & Pricing Check
    let priceDetails;
    try {
      priceDetails = await PricingService.calculatePrice(courtId, date, startTime, endTime);
    } catch (err) {
      if (err.message === 'Requested time is outside operating hours') {
        return {
          is_available: false,
          reason: 'Outside operating hours'
        };
      }
      throw err;
    }

    // 4. Check Court Blockings
    // Conflict formula: block_start < requested_end AND block_end > requested_start
    const blocking = await SlotBlocking.findOne({
      where: {
        court_id: courtId,
        block_date: date,
        start_time: { [Op.lt]: endTime },
        end_time: { [Op.gt]: startTime }
      }
    });

    if (blocking) {
      return {
        is_available: false,
        reason: 'Court is blocked by owner during this time',
        block_reason: blocking.block_reason
      };
    }

    // 5. Check Existing Bookings (Conflict Detection)
    // TBD-PH08-CONFLICT-01: True double-booking protection using locks will be in Phase 09.
    const booking = await Booking.findOne({
      where: {
        court_id: courtId,
        booking_date: date,
        booking_status: {
          [Op.in]: ['HOLDING', 'PAYMENT_PENDING', 'CONFIRMED', 'COMPLETED']
        },
        start_time: { [Op.lt]: endTime },
        end_time: { [Op.gt]: startTime }
      }
    });

    if (booking) {
      return {
        is_available: false,
        reason: 'Time slot is already booked'
      };
    }

    // Available!
    return {
      is_available: true,
      pricing: priceDetails
    };
  }
}

module.exports = AvailabilityService;

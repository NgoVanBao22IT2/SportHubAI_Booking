const { Court, SlotBlocking, Booking, Venue, Branch } = require('../models');
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

  /**
   * Fetch full visual schedule matrix & pricing for all courts in a venue for a given date.
   */
  static async getVenueDailyAvailability(venueId, date) {
    if (!venueId || !date) {
      const error = new Error('venueId and date parameters are required');
      error.statusCode = 400;
      throw error;
    }

    // 1. Load Venue with Branches and Courts
    const venue = await Venue.findOne({
      where: { venue_id: venueId },
      include: [
        {
          model: Branch,
          as: 'branches',
          include: [
            {
              model: Court,
              as: 'courts'
            }
          ]
        }
      ]
    });

    if (!venue) {
      const error = new Error('Venue not found');
      error.statusCode = 404;
      throw error;
    }

    // Collect all courts across branches
    const allCourts = [];
    if (venue.branches) {
      venue.branches.forEach(branch => {
        if (branch.courts) {
          allCourts.push(...branch.courts);
        }
      });
    }

    const courtIds = allCourts.map(c => c.court_id);
    const sports = Array.from(new Set(allCourts.map(c => c.sport_category).filter(Boolean)));

    // 2. Fetch all blockings for these courts on the specified date
    const blockings = await SlotBlocking.findAll({
      where: {
        court_id: { [Op.in]: courtIds.length ? courtIds : ['__NONE__'] },
        block_date: date
      }
    });

    // 3. Fetch all active bookings for these courts on the specified date
    const bookings = await Booking.findAll({
      where: {
        court_id: { [Op.in]: courtIds.length ? courtIds : ['__NONE__'] },
        booking_date: date,
        booking_status: {
          [Op.in]: ['HOLDING', 'PAYMENT_PENDING', 'CONFIRMED', 'COMPLETED']
        }
      }
    });

    // 4. Standard 1-hour time slots definition (06:00 to 22:00)
    const timeSlots = [
      { start_time: '06:00:00', end_time: '07:00:00', label: '06:00 - 07:00' },
      { start_time: '07:00:00', end_time: '08:00:00', label: '07:00 - 08:00' },
      { start_time: '08:00:00', end_time: '09:00:00', label: '08:00 - 09:00' },
      { start_time: '09:00:00', end_time: '10:00:00', label: '09:00 - 10:00' },
      { start_time: '10:00:00', end_time: '11:00:00', label: '10:00 - 11:00' },
      { start_time: '11:00:00', end_time: '12:00:00', label: '11:00 - 12:00' },
      { start_time: '12:00:00', end_time: '13:00:00', label: '12:00 - 13:00' },
      { start_time: '13:00:00', end_time: '14:00:00', label: '13:00 - 14:00' },
      { start_time: '14:00:00', end_time: '15:00:00', label: '14:00 - 15:00' },
      { start_time: '15:00:00', end_time: '16:00:00', label: '15:00 - 16:00' },
      { start_time: '16:00:00', end_time: '17:00:00', label: '16:00 - 17:00' },
      { start_time: '17:00:00', end_time: '18:00:00', label: '17:00 - 18:00' },
      { start_time: '18:00:00', end_time: '19:00:00', label: '18:00 - 19:00' },
      { start_time: '19:00:00', end_time: '20:00:00', label: '19:00 - 20:00' },
      { start_time: '20:00:00', end_time: '21:00:00', label: '20:00 - 21:00' },
      { start_time: '21:00:00', end_time: '22:00:00', label: '21:00 - 22:00' },
      { start_time: '22:00:00', end_time: '23:00:00', label: '22:00 - 23:00' }
    ];

    // Helper functions for time interval overlap check
    const isOverlapping = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

    // 5. Build Court Matrix
    const courtMatrix = await Promise.all(
      allCourts.map(async (court) => {
        const courtBlockings = blockings.filter(b => b.court_id === court.court_id);
        const courtBookings = bookings.filter(b => b.court_id === court.court_id);

        const slots = await Promise.all(
          timeSlots.map(async (slot) => {
            if (court.court_status !== 'ACTIVE') {
              return {
                ...slot,
                status: 'UNAVAILABLE',
                price: null,
                reason: `Sân đang ${court.court_status === 'MAINTENANCE' ? 'Bảo trì' : 'Ngưng hoạt động'}`
              };
            }

            // Check pricing & operating schedule
            let pricing = null;
            try {
              pricing = await PricingService.calculatePrice(
                court.court_id,
                date,
                slot.start_time,
                slot.end_time
              );
            } catch (err) {
              return {
                ...slot,
                status: 'UNAVAILABLE',
                price: null,
                reason: 'Ngoài giờ hoạt động'
              };
            }

            // Check blockings
            const blockingMatch = courtBlockings.find(b =>
              isOverlapping(b.start_time, b.end_time, slot.start_time, slot.end_time)
            );
            if (blockingMatch) {
              return {
                ...slot,
                status: 'BLOCKED',
                price: pricing.total_price,
                reason: blockingMatch.block_reason || 'Chủ sân tạm khóa'
              };
            }

            // Check bookings
            const bookingMatch = courtBookings.find(b =>
              isOverlapping(b.start_time, b.end_time, slot.start_time, slot.end_time)
            );
            if (bookingMatch) {
              return {
                ...slot,
                status: 'BOOKED',
                price: pricing.total_price,
                reason: 'Đã có người đặt'
              };
            }

            // Available
            return {
              ...slot,
              status: 'AVAILABLE',
              price: pricing.total_price,
              reason: 'Còn trống'
            };
          })
        );

        return {
          court_id: court.court_id,
          court_name: court.court_name,
          sport_category: court.sport_category,
          court_status: court.court_status,
          slots
        };
      })
    );

    return {
      venue_id: venue.venue_id,
      venue_name: venue.venue_name,
      date,
      sports,
      time_slots: timeSlots,
      courts: courtMatrix
    };
  }
}

module.exports = AvailabilityService;

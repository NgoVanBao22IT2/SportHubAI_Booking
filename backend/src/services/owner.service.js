const { Booking, Court, Branch, Venue, Payment, User, sequelize } = require('../models');
const { Op } = require('sequelize');

class OwnerService {
  /**
   * Retrieves bookings belonging to the owner's venues
   */
  static async getBookings(ownerId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { rows, count } = await Booking.findAndCountAll({
      include: [
        {
          model: Court,
          as: 'court',
          required: true,
          include: [
            {
              model: Branch,
              as: 'branch',
              required: true,
              include: [
                {
                  model: Venue,
                  as: 'venue',
                  required: true,
                  where: { owner_user_id: ownerId } // CRITICAL: Enforce ownership
                }
              ]
            }
          ]
        },
        {
          model: User,
          as: 'customer',
          attributes: ['user_id', 'full_name', 'email', 'phone_number']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      data: rows,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Retrieves unique customers who have booked at the owner's venues
   */
  static async getCustomers(ownerId, options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // To get unique customers, we find all bookings owned by this owner, grouped by customer_user_id
    const { rows, count } = await User.findAndCountAll({
      include: [
        {
          model: Booking,
          as: 'bookings',
          required: true,
          include: [
            {
              model: Court,
              as: 'court',
              required: true,
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  required: true,
                  include: [
                    {
                      model: Venue,
                      as: 'venue',
                      required: true,
                      where: { owner_user_id: ownerId }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      distinct: true, // Count distinct users
      attributes: ['user_id', 'full_name', 'email', 'phone_number', 'user_status'],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      data: rows,
      meta: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    };
  }

  /**
   * Retrieves revenue metrics strictly from PAID payments
   * Only includes COMPLETED/CONFIRMED bookings.
   */
  static async getRevenue(ownerId) {
    const revenueStats = await Payment.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('Payment.amount')), 'total_revenue'],
        [sequelize.fn('COUNT', sequelize.col('Payment.payment_id')), 'total_transactions']
      ],
      where: {
        payment_status: 'PAID'
      },
      include: [
        {
          model: Booking,
          as: 'booking',
          required: true,
          where: {
            booking_status: {
              [Op.in]: ['CONFIRMED', 'COMPLETED']
            }
          },
          include: [
            {
              model: Court,
              as: 'court',
              required: true,
              include: [
                {
                  model: Branch,
                  as: 'branch',
                  required: true,
                  include: [
                    {
                      model: Venue,
                      as: 'venue',
                      required: true,
                      where: { owner_user_id: ownerId }
                    }
                  ]
                }
              ]
            }
          ]
        }
      ],
      raw: true
    });

    return {
      total_revenue: parseFloat(revenueStats[0].total_revenue) || 0,
      total_transactions: parseInt(revenueStats[0].total_transactions) || 0
    };
  }

  /**
   * Dashboard aggregate endpoint
   */
  static async getDashboard(ownerId) {
    // 1. Get Venue Count
    const venueCount = await Venue.count({ where: { owner_user_id: ownerId } });

    // 2. Get Revenue
    const revenue = await this.getRevenue(ownerId);

    // 3. Get total bookings
    const bookingCount = await Booking.count({
      include: [
        {
          model: Court,
          as: 'court',
          required: true,
          include: [
            {
              model: Branch,
              as: 'branch',
              required: true,
              include: [
                {
                  model: Venue,
                  as: 'venue',
                  required: true,
                  where: { owner_user_id: ownerId }
                }
              ]
            }
          ]
        }
      ]
    });

    return {
      venue_count: venueCount,
      total_bookings: bookingCount,
      revenue: revenue.total_revenue,
      transactions: revenue.total_transactions
    };
  }
}

module.exports = OwnerService;

const { User, Venue, Booking, Payment, sequelize } = require('../models');

class AdminService {
  /**
   * 13.01 Dashboard aggregate endpoint
   */
  static async getDashboard() {
    const userCount = await User.count();
    const ownerCount = await User.count({ where: { primary_role: 'OWNER' } });
    const venueCount = await Venue.count();
    const pendingVenueCount = await Venue.count({ where: { operating_status: 'PENDING' } });
    const bookingCount = await Booking.count();
    
    // Revenue from PAID payments
    const revenueStats = await Payment.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue'],
        [sequelize.fn('COUNT', sequelize.col('payment_id')), 'total_transactions']
      ],
      where: {
        payment_status: 'PAID'
      },
      raw: true
    });

    return {
      total_users: userCount,
      total_owners: ownerCount,
      total_venues: venueCount,
      pending_venues: pendingVenueCount,
      total_bookings: bookingCount,
      total_revenue: parseFloat(revenueStats[0].total_revenue) || 0,
      total_transactions: parseInt(revenueStats[0].total_transactions) || 0
    };
  }

  /**
   * 13.02 / 13.03 List Users (Handles Customers and Owners based on role filter)
   */
  static async getUsers(options = {}) {
    const { page = 1, limit = 10, role } = options;
    const offset = (page - 1) * limit;

    const where = {};
    if (role) {
      where.primary_role = role;
    }

    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash'] }, // Do not expose password hashes
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      data: rows,
      meta: { total: count, page: parseInt(page), limit: parseInt(limit) }
    };
  }

  /**
   * 13.02 Update User Role/Status
   */
  static async updateUser(userId, updateData) {
    const user = await User.findByPk(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }
    
    // Only allow updating specific fields
    if (updateData.primary_role) user.primary_role = updateData.primary_role;
    if (updateData.account_status) user.account_status = updateData.account_status;

    await user.save();
    
    // Return sanitized user
    const { password_hash, ...safeUser } = user.toJSON();
    return safeUser;
  }

  /**
   * 13.04 Venue Approval
   */
  static async getVenues(options = {}) {
    const { page = 1, limit = 10, status } = options;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.operating_status = status;
    }

    const { rows, count } = await Venue.findAndCountAll({
      where,
      include: [{ model: User, as: 'owner', attributes: ['user_id', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      data: rows,
      meta: { total: count, page: parseInt(page), limit: parseInt(limit) }
    };
  }

  static async updateVenueStatus(venueId, status) {
    const venue = await Venue.findByPk(venueId);
    if (!venue) {
      const error = new Error('Venue not found');
      error.statusCode = 404;
      throw error;
    }

    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'];
    if (!validStatuses.includes(status)) {
      const error = new Error('Invalid operating status');
      error.statusCode = 400;
      throw error;
    }

    venue.operating_status = status;
    await venue.save();
    return venue;
  }

  /**
   * 13.05 Booking Management (Platform-wide Read-only)
   */
  static async getBookings(options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { rows, count } = await Booking.findAndCountAll({
      include: [
        { model: User, as: 'customer', attributes: ['user_id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      data: rows,
      meta: { total: count, page: parseInt(page), limit: parseInt(limit) }
    };
  }

  /**
   * 13.06 Payment Management (Platform-wide Read-only)
   */
  static async getPayments(options = {}) {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    const { rows, count } = await Payment.findAndCountAll({
      include: [
        { model: User, as: 'user', attributes: ['user_id', 'full_name', 'email'] }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return {
      data: rows,
      meta: { total: count, page: parseInt(page), limit: parseInt(limit) }
    };
  }
}

module.exports = AdminService;

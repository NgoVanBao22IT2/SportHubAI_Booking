const OwnerService = require('../services/owner.service');

class OwnerController {
  static async getDashboard(req, res, next) {
    try {
      const ownerId = req.user.userId;
      const data = await OwnerService.getDashboard(ownerId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getBookings(req, res, next) {
    try {
      const ownerId = req.user.userId;
      const { page, limit } = req.query;
      const result = await OwnerService.getBookings(ownerId, { page, limit });
      res.status(200).json({ status: 'success', data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomers(req, res, next) {
    try {
      const ownerId = req.user.userId;
      const { page, limit } = req.query;
      const result = await OwnerService.getCustomers(ownerId, { page, limit });
      res.status(200).json({ status: 'success', data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async getRevenue(req, res, next) {
    try {
      const ownerId = req.user.userId;
      const data = await OwnerService.getRevenue(ownerId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = OwnerController;

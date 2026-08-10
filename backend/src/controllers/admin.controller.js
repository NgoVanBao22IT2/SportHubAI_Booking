const AdminService = require('../services/admin.service');

class AdminController {
  static async getDashboard(req, res, next) {
    try {
      const data = await AdminService.getDashboard();
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req, res, next) {
    try {
      const { page, limit, role } = req.query;
      const result = await AdminService.getUsers({ page, limit, role });
      res.status(200).json({ status: 'success', data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const user = await AdminService.updateUser(id, updateData);
      res.status(200).json({ status: 'success', data: user });
    } catch (error) {
      next(error);
    }
  }

  static async getVenues(req, res, next) {
    try {
      const { page, limit, status } = req.query;
      const result = await AdminService.getVenues({ page, limit, status });
      res.status(200).json({ status: 'success', data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async updateVenueStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const venue = await AdminService.updateVenueStatus(id, status);
      res.status(200).json({ status: 'success', data: venue });
    } catch (error) {
      next(error);
    }
  }

  static async getBookings(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await AdminService.getBookings({ page, limit });
      res.status(200).json({ status: 'success', data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }

  static async getPayments(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await AdminService.getPayments({ page, limit });
      res.status(200).json({ status: 'success', data: result.data, meta: result.meta });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminController;

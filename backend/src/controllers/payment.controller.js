const PaymentService = require('../services/payment.service');

class PaymentController {
  static async createPayment(req, res, next) {
    try {
      const userId = req.user.userId;
      const { bookingId, paymentMethod, amount, returnUrl } = req.body;
      
      const payment = await PaymentService.createPayment(userId, {
        bookingId, paymentMethod, amount, returnUrl
      });
      
      res.status(201).json({
        data: payment,
        meta: {
          requestId: 'req_init_pay_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message,
            details: []
          }
        });
      }
      next(error);
    }
  }

  static async momoIpnCallback(req, res, next) {
    try {
      // Endpoint doesn't require JWT, it's server-to-server.
      // However, signature verification is strictly enforced in the service.
      const result = await PaymentService.processIpnCallback(req.body);
      
      // Standard MoMo IPN response
      res.status(200).json(result);
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message,
            details: []
          }
        });
      }
      next(error);
    }
  }

  static async getPaymentStatus(req, res, next) {
    try {
      const userId = req.user.userId;
      const userRole = req.user.role;
      const { id } = req.params;

      const payment = await PaymentService.getPaymentStatus(userId, id, userRole);
      
      res.status(200).json({
        data: payment,
        meta: {
          requestId: 'req_get_pay_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message,
            details: []
          }
        });
      }
      next(error);
    }
  }

  static async refundPayment(req, res, next) {
    try {
      const userId = req.user.userId;
      const { id } = req.params;
      const { reason } = req.body;
      
      const refund = await PaymentService.refundPayment(userId, id, reason);
      
      res.status(200).json({
        data: refund,
        meta: {
          requestId: 'req_refund_' + Date.now(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({
          error: {
            code: error.code || 'BAD_REQUEST',
            message: error.message,
            details: []
          }
        });
      }
      next(error);
    }
  }
}

module.exports = PaymentController;

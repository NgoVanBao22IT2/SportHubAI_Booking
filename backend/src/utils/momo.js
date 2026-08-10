const crypto = require('crypto');

class MoMoUtils {
  /**
   * Generates HMAC-SHA256 signature for MoMo API requests/IPNs.
   * Following the standard MoMo canonical string format.
   */
  static generateSignature(rawSignature, secretKey) {
    return crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');
  }

  /**
   * Verify IPN signature
   */
  static verifyIpnSignature(payload, secretKey, expectedSignature) {
    const {
      amount, extraData, message, orderId, orderInfo,
      orderType, partnerCode, requestId, responseTime,
      resultCode, transId
    } = payload;
    
    const accessKey = process.env.MOMO_ACCESS_KEY || 'default_access_key';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    
    const computedSignature = MoMoUtils.generateSignature(rawSignature, secretKey);
    
    if (!expectedSignature) return false;

    // Constant time comparison
    try {
      const computedBuffer = Buffer.from(computedSignature, 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      
      if (computedBuffer.length !== expectedBuffer.length) {
        return false;
      }
      return crypto.timingSafeEqual(computedBuffer, expectedBuffer);
    } catch (e) {
      return false;
    }
  }
}

module.exports = MoMoUtils;

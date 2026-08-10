'use strict';

/**
 * Email Service Abstraction Layer
 * Isolates email delivery logic from authentication core services
 */
class EmailService {
  async sendOTP(email, otpCode, purpose) {
    // In production, this integrates with SMTP / Nodemailer / SendGrid / SES
    console.log(`[EmailService] Sending OTP ${otpCode} to ${email} for purpose: ${purpose}`);
    return { success: true };
  }

  async sendPasswordResetLink(email, resetToken) {
    console.log(`[EmailService] Sending Password Reset token ${resetToken} to ${email}`);
    return { success: true };
  }
}

module.exports = new EmailService();

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Nodemailer Service Shell
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initTransporter();
  }

  initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10) || 587,
        secure: port === '465',
        auth: {
          user,
          pass,
        },
      });
      logger.info('Nodemailer SMTP Transporter initialized');
    } else {
      logger.warn('SMTP credentials missing; Nodemailer unconfigured');
    }
  }

  /**
   * Send Email Shell
   */
  async sendEmail({ to, subject, html, text }) {
    if (!this.transporter) {
      logger.warn(`Email to ${to} skipped: SMTP unconfigured`);
      return false;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'Perfume Brand <noreply@perfumebrand.com>',
      to,
      subject,
      text,
      html,
    };

    const info = await this.transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  }
}

module.exports = new EmailService();

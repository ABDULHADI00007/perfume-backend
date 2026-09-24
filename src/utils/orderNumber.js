const crypto = require('crypto');

/**
 * Generate a unique and formatted order number
 * Format: ORD-YYYY-XXXXXX (e.g. ORD-2026-8F3A29)
 * @returns {string}
 */
const generateOrderNumber = () => {
  const year = new Date().getFullYear();
  const randomSegment = crypto.randomBytes(3).toString('hex').toUpperCase();
  const timestampSegment = Date.now().toString().slice(-3);
  return `ORD-${year}-${randomSegment}${timestampSegment}`;
};

module.exports = generateOrderNumber;

/**
 * Utility for sanitizing input strings before building regex queries
 * Prevents ReDoS and regex injection attacks
 * @param {string} string
 * @returns {string}
 */
const escapeRegex = (string = '') => {
  if (typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

module.exports = {
  escapeRegex,
};

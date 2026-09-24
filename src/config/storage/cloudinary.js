const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');

const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    logger.info('Cloudinary SDK initialized');
  } else {
    logger.warn('Cloudinary credentials missing in env; Cloudinary SDK unconfigured');
  }

  return cloudinary;
};

module.exports = {
  configureCloudinary,
  cloudinary,
};

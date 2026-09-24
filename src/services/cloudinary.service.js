const { cloudinary } = require('../config/storage/cloudinary');
const logger = require('../utils/logger');

/**
 * Cloudinary Media Storage Service Shell
 */
class CloudinaryService {
  /**
   * Upload image/file buffer or file path to Cloudinary
   */
  async uploadMedia(filePath, folder = 'products') {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `perfume/${folder}`,
        resource_type: 'auto',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
      };
    } catch (error) {
      logger.error('Cloudinary Upload Error:', error);
      throw error;
    }
  }

  /**
   * Delete media asset by public ID
   */
  async deleteMedia(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      logger.error('Cloudinary Delete Error:', error);
      throw error;
    }
  }
}

module.exports = new CloudinaryService();

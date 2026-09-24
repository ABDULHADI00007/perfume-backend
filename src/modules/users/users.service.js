const mongoose = require('mongoose');
const User = require('./users.model');
const ApiError = require('../../utils/apiError');
const { ROLES } = require('../../utils/constants');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');
const logger = require('../../utils/logger');

class UsersService {
  /**
   * List admin users with pagination and search
   * @param {Object} query
   */
  async getUsers(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    if (query.role) {
      filter.role = query.role;
    }
    if (query.status) {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      const regex = new RegExp(sanitized, 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const [users, totalItems] = await Promise.all([
      User.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter),
    ]);

    const sanitizedUsers = users.map((u) => u.toPublicJSON());
    const meta = formatPaginationMeta(totalItems, page, limit);

    return { users: sanitizedUsers, meta };
  }

  /**
   * Get single user by ID
   * @param {string} id
   */
  async getUserById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid user ID format');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }

    return user.toPublicJSON();
  }

  /**
   * Create new admin user (Protected against privilege escalation)
   * @param {Object} userData
   * @param {Object} creatorUser
   */
  async createUser(userData, creatorUser) {
    const { name, email, password, role = ROLES.STAFF, status = 'active' } = userData;

    // 1. Privilege Escalation Prevention: Non-superadmins cannot create superadmins
    if (role === ROLES.SUPERADMIN && creatorUser?.role !== ROLES.SUPERADMIN) {
      throw ApiError.forbidden('Only a Superadmin can create accounts with the Superadmin role');
    }

    // 2. Email uniqueness check
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw ApiError.conflict(`User with email '${normalizedEmail}' already exists`);
    }

    // 3. Create user (pre-save hashes password automatically)
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role,
      status,
    });

    logger.info(`Admin user created: [${role}] ${user.email} by ${creatorUser?.email || 'system'}`);

    return user.toPublicJSON();
  }

  /**
   * Update admin user details (Protected against privilege escalation)
   * @param {string} id
   * @param {Object} updateData
   * @param {Object} updaterUser
   */
  async updateUser(id, updateData, updaterUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid user ID format');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }

    const isSelf = updaterUser && updaterUser._id.toString() === user._id.toString();

    // 1. Self-protection: Users cannot change their own role or status
    if (isSelf && (updateData.role || updateData.status)) {
      if (updateData.role && updateData.role !== user.role) {
        throw ApiError.forbidden('You cannot modify your own administrative role');
      }
      if (updateData.status && updateData.status !== user.status) {
        throw ApiError.forbidden('You cannot change your own account status');
      }
    }

    // 2. Non-superadmins cannot modify a Superadmin or promote someone to Superadmin
    if (user.role === ROLES.SUPERADMIN && updaterUser?.role !== ROLES.SUPERADMIN) {
      throw ApiError.forbidden('Only a Superadmin can modify a Superadmin account');
    }

    if (updateData.role === ROLES.SUPERADMIN && updaterUser?.role !== ROLES.SUPERADMIN) {
      throw ApiError.forbidden('Only a Superadmin can promote users to the Superadmin role');
    }

    // 3. Check email uniqueness if modified
    if (updateData.email) {
      const newEmail = updateData.email.toLowerCase().trim();
      if (newEmail !== user.email) {
        const emailExists = await User.findOne({ email: newEmail, _id: { $ne: id } });
        if (emailExists) {
          throw ApiError.conflict(`User with email '${newEmail}' already exists`);
        }
        user.email = newEmail;
      }
    }

    if (updateData.name) user.name = updateData.name.trim();
    if (updateData.role) user.role = updateData.role;
    if (updateData.status) user.status = updateData.status;

    await user.save();
    logger.info(`Admin user updated: ${user.email} by ${updaterUser?.email || 'system'}`);

    return user.toPublicJSON();
  }

  /**
   * Update user password
   * @param {string} id
   * @param {Object} passwordData - { currentPassword, newPassword }
   * @param {Object} actorUser
   */
  async updateUserPassword(id, { currentPassword, newPassword }, actorUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid user ID format');
    }

    const user = await User.findById(id).select('+password');
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }

    const isSelf = actorUser && actorUser._id.toString() === user._id.toString();

    // If changing own password, verify current password
    if (isSelf) {
      if (!currentPassword) {
        throw ApiError.badRequest('Current password is required to change your own password');
      }
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw ApiError.unauthorized('Current password does not match');
      }
    } else if (actorUser?.role !== ROLES.SUPERADMIN) {
      throw ApiError.forbidden('Only Superadmins can reset passwords for other accounts');
    }

    user.password = newPassword;
    await user.save(); // pre-save rehashes new password

    logger.info(`Password changed for user ${user.email} by ${actorUser?.email || 'system'}`);

    return user.toPublicJSON();
  }

  /**
   * Update user account status (Activate / Deactivate / Suspend)
   * @param {string} id
   * @param {string} status
   * @param {Object} actorUser
   */
  async updateUserStatus(id, status, actorUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid user ID format');
    }

    const user = await User.findById(id);
    if (!user) {
      throw ApiError.notFound(`User with ID ${id} not found`);
    }

    if (actorUser && actorUser._id.toString() === user._id.toString()) {
      throw ApiError.badRequest('Cannot deactivate or modify your own account status');
    }

    if (user.role === ROLES.SUPERADMIN && actorUser?.role !== ROLES.SUPERADMIN) {
      throw ApiError.forbidden('Only a Superadmin can modify a Superadmin status');
    }

    user.status = status;
    await user.save();

    logger.info(`User status updated for ${user.email} to '${status}' by ${actorUser?.email || 'system'}`);

    return user.toPublicJSON();
  }
}

module.exports = new UsersService();

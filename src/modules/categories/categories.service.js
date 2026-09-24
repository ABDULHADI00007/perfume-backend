const mongoose = require('mongoose');
const Category = require('./categories.model');
const ApiError = require('../../utils/apiError');
const slugify = require('../../utils/slugify');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class CategoriesService {
  /**
   * Create a new category
   * @param {Object} categoryData
   */
  async createCategory(categoryData) {
    const slug = categoryData.slug ? slugify(categoryData.slug) : slugify(categoryData.name);

    if (!slug) {
      throw ApiError.badRequest('Valid category slug or name is required');
    }

    const existing = await Category.findOne({ slug });
    if (existing) {
      throw ApiError.conflict(`Category with slug '${slug}' already exists`);
    }

    const category = await Category.create({
      ...categoryData,
      slug,
    });

    return category;
  }

  /**
   * List categories with optional filters, sorting, and pagination
   * @param {Object} query
   * @param {boolean} isPublic - If true, only active categories are returned
   */
  async getCategories(query = {}, isPublic = true) {
    const filter = {};

    if (isPublic) {
      filter.status = 'active';
    } else if (query.status) {
      filter.status = query.status;
    }

    if (query.search && query.search.trim()) {
      filter.name = { $regex: escapeRegex(query.search.trim()), $options: 'i' };
    }

    const sort = query.sort ? query.sort : { sortOrder: 1, name: 1 };

    // Support pagination or full list
    if (query.page || query.limit) {
      const { page, limit, skip } = getPaginationOptions(query);
      const [categories, totalItems] = await Promise.all([
        Category.find(filter).sort(sort).skip(skip).limit(limit).lean(),
        Category.countDocuments(filter),
      ]);
      const meta = formatPaginationMeta(totalItems, page, limit);
      return { categories, meta };
    }

    const categories = await Category.find(filter).sort(sort).lean();
    return { categories, meta: { total: categories.length } };
  }

  /**
   * Get single category by ObjectId or slug
   * @param {string} idOrSlug
   * @param {boolean} isPublic
   */
  async getCategoryByIdOrSlug(idOrSlug, isPublic = true) {
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug.toLowerCase().trim() };

    if (isPublic) {
      query.status = 'active';
    }

    const category = await Category.findOne(query).lean();
    if (!category) {
      throw ApiError.notFound(`Category '${idOrSlug}' not found`);
    }

    return category;
  }

  /**
   * Update category
   * @param {string} id
   * @param {Object} updateData
   */
  async updateCategory(id, updateData) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound(`Category with ID '${id}' not found`);
    }

    if (updateData.slug || updateData.name) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : slugify(updateData.name || category.name);
      if (newSlug !== category.slug) {
        const slugExists = await Category.findOne({ slug: newSlug, _id: { $ne: id } });
        if (slugExists) {
          throw ApiError.conflict(`Category with slug '${newSlug}' already exists`);
        }
        category.slug = newSlug;
      }
    }

    if (updateData.name !== undefined) category.name = updateData.name;
    if (updateData.description !== undefined) category.description = updateData.description;
    if (updateData.image !== undefined) category.image = updateData.image;
    if (updateData.sortOrder !== undefined) category.sortOrder = updateData.sortOrder;
    if (updateData.status !== undefined) category.status = updateData.status;
    if (updateData.seo !== undefined) category.seo = updateData.seo;

    await category.save();
    return category;
  }

  /**
   * Archive / Deactivate category
   * @param {string} id
   */
  async archiveCategory(id) {
    const category = await Category.findById(id);
    if (!category) {
      throw ApiError.notFound(`Category with ID '${id}' not found`);
    }

    category.status = 'inactive';
    await category.save();
    return category;
  }

  /**
   * Hard delete category
   * @param {string} id
   */
  async deleteCategory(id) {
    const category = await Category.findByIdAndDelete(id);
    if (!category) {
      throw ApiError.notFound(`Category with ID '${id}' not found`);
    }
    return category;
  }
}

module.exports = new CategoriesService();

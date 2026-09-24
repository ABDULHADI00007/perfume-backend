const mongoose = require('mongoose');
const Collection = require('./collections.model');
const ApiError = require('../../utils/apiError');
const slugify = require('../../utils/slugify');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class CollectionsService {
  /**
   * Create a new collection
   * @param {Object} collectionData
   */
  async createCollection(collectionData) {
    const slug = collectionData.slug ? slugify(collectionData.slug) : slugify(collectionData.name);

    if (!slug) {
      throw ApiError.badRequest('Valid collection slug or name is required');
    }

    const existing = await Collection.findOne({ slug });
    if (existing) {
      throw ApiError.conflict(`Collection with slug '${slug}' already exists`);
    }

    // Filter valid product IDs if passed
    let validProducts = [];
    if (collectionData.products && Array.isArray(collectionData.products)) {
      validProducts = collectionData.products.filter((p) => mongoose.Types.ObjectId.isValid(p));
    }

    const collection = await Collection.create({
      ...collectionData,
      products: validProducts,
      slug,
    });

    return collection;
  }

  /**
   * List collections with optional filters, search, and pagination
   * @param {Object} query
   * @param {boolean} isPublic
   */
  async getCollections(query = {}, isPublic = true) {
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

    if (query.page || query.limit) {
      const { page, limit, skip } = getPaginationOptions(query);
      const [collections, totalItems] = await Promise.all([
        Collection.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit)
          .populate({
            path: 'products',
            match: isPublic ? { status: 'active' } : {},
            select: 'name slug price images fragrance ratingAverage reviewCount status',
          })
          .lean(),
        Collection.countDocuments(filter),
      ]);
      const meta = formatPaginationMeta(totalItems, page, limit);
      return { collections, meta };
    }

    const collections = await Collection.find(filter)
      .sort(sort)
      .populate({
        path: 'products',
        match: isPublic ? { status: 'active' } : {},
        select: 'name slug price images fragrance ratingAverage reviewCount status',
      })
      .lean();

    return { collections, meta: { total: collections.length } };
  }

  /**
   * Get single collection by ObjectId or slug
   * @param {string} idOrSlug
   * @param {boolean} isPublic
   */
  async getCollectionByIdOrSlug(idOrSlug, isPublic = true) {
    const query = mongoose.Types.ObjectId.isValid(idOrSlug)
      ? { _id: idOrSlug }
      : { slug: idOrSlug.toLowerCase().trim() };

    if (isPublic) {
      query.status = 'active';
    }

    const collection = await Collection.findOne(query)
      .populate({
        path: 'products',
        match: isPublic ? { status: 'active' } : {},
        select: 'name slug price compareAtPrice images fragrance ratingAverage reviewCount status shortDescription',
      })
      .lean();

    if (!collection) {
      throw ApiError.notFound(`Collection '${idOrSlug}' not found`);
    }

    return collection;
  }

  /**
   * Update collection
   * @param {string} id
   * @param {Object} updateData
   */
  async updateCollection(id, updateData) {
    const collection = await Collection.findById(id);
    if (!collection) {
      throw ApiError.notFound(`Collection with ID '${id}' not found`);
    }

    if (updateData.slug || updateData.name) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : slugify(updateData.name || collection.name);
      if (newSlug !== collection.slug) {
        const slugExists = await Collection.findOne({ slug: newSlug, _id: { $ne: id } });
        if (slugExists) {
          throw ApiError.conflict(`Collection with slug '${newSlug}' already exists`);
        }
        collection.slug = newSlug;
      }
    }

    if (updateData.name !== undefined) collection.name = updateData.name;
    if (updateData.description !== undefined) collection.description = updateData.description;
    if (updateData.image !== undefined) collection.image = updateData.image;
    if (updateData.sortOrder !== undefined) collection.sortOrder = updateData.sortOrder;
    if (updateData.status !== undefined) collection.status = updateData.status;
    if (updateData.seo !== undefined) collection.seo = updateData.seo;
    if (updateData.products !== undefined && Array.isArray(updateData.products)) {
      collection.products = updateData.products.filter((p) => mongoose.Types.ObjectId.isValid(p));
    }

    await collection.save();
    return collection;
  }

  /**
   * Archive collection
   * @param {string} id
   */
  async archiveCollection(id) {
    const collection = await Collection.findById(id);
    if (!collection) {
      throw ApiError.notFound(`Collection with ID '${id}' not found`);
    }

    collection.status = 'inactive';
    await collection.save();
    return collection;
  }

  /**
   * Delete collection
   * @param {string} id
   */
  async deleteCollection(id) {
    const collection = await Collection.findByIdAndDelete(id);
    if (!collection) {
      throw ApiError.notFound(`Collection with ID '${id}' not found`);
    }
    return collection;
  }
}

module.exports = new CollectionsService();

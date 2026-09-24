const mongoose = require('mongoose');
const Product = require('./products.model');
const Category = require('../categories/categories.model');
const Collection = require('../collections/collections.model');
const Inventory = require('../inventory/inventory.model');
const ApiError = require('../../utils/apiError');
const slugify = require('../../utils/slugify');
const { escapeRegex } = require('../../utils/sanitize');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');

class ProductsService {
  /**
   * Get paginated and filtered list of products
   * @param {Object} query - Express request query
   * @param {boolean} isAdmin - Admin privilege flag
   */
  async getProducts(query = {}, isAdmin = false) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    // 1. Status Filter: Public users only see active products
    if (!isAdmin) {
      filter.status = 'active';
    } else if (query.status) {
      filter.status = query.status;
    }

    // 2. Category Filter (by ObjectId or Slug)
    if (query.category) {
      if (mongoose.Types.ObjectId.isValid(query.category)) {
        filter.category = query.category;
      } else {
        const categoryDoc = await Category.findOne({ slug: query.category.toLowerCase() }).select('_id');
        filter.category = categoryDoc ? categoryDoc._id : new mongoose.Types.ObjectId();
      }
    }

    // 3. Collection Filter (by ObjectId or Slug)
    if (query.collection) {
      if (mongoose.Types.ObjectId.isValid(query.collection)) {
        filter.collections = query.collection;
      } else {
        const collectionDoc = await Collection.findOne({ slug: query.collection.toLowerCase() }).select('_id');
        filter.collections = collectionDoc ? collectionDoc._id : new mongoose.Types.ObjectId();
      }
    }

    // 4. Price Range Filter
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {};
      if (query.minPrice !== undefined && query.minPrice !== '') {
        const min = Number(query.minPrice);
        if (!isNaN(min)) filter.price.$gte = min;
      }
      if (query.maxPrice !== undefined && query.maxPrice !== '') {
        const max = Number(query.maxPrice);
        if (!isNaN(max)) filter.price.$lte = max;
      }
      if (Object.keys(filter.price).length === 0) {
        delete filter.price;
      }
    }

    // 5. Fragrance Attribute Filters
    if (query.gender) {
      filter['fragrance.gender'] = query.gender;
    }
    if (query.concentration) {
      filter['fragrance.concentration'] = query.concentration;
    }
    if (query.scentFamily) {
      const families = query.scentFamily.split(',').map((f) => new RegExp(escapeRegex(f.trim()), 'i'));
      filter.scentFamily = { $in: families };
    }

    // 6. Merchandising Flags
    if (query.featured === 'true' || query.featured === true) {
      filter.featured = true;
    }
    if (query.bestseller === 'true' || query.bestseller === true) {
      filter.bestseller = true;
    }
    if (query.newArrival === 'true' || query.newArrival === true) {
      filter.newArrival = true;
    }

    // 7. Search Filter (Text & Regex on name, brand, SKU, notes)
    const searchTerm = query.search || query.q;
    if (searchTerm && searchTerm.trim()) {
      const sanitized = escapeRegex(searchTerm.trim());
      const regex = new RegExp(sanitized, 'i');
      filter.$or = [
        { name: regex },
        { brand: regex },
        { sku: regex },
        { shortDescription: regex },
        { scentFamily: regex },
        { 'fragrance.topNotes': regex },
        { 'fragrance.heartNotes': regex },
        { 'fragrance.baseNotes': regex },
      ];
    }

    // 8. Dynamic Sorting
    let sortOption = { createdAt: -1 };
    if (typeof sort === 'string') {
      switch (sort) {
        case 'price_asc':
        case 'price-asc':
          sortOption = { price: 1 };
          break;
        case 'price_desc':
        case 'price-desc':
          sortOption = { price: -1 };
          break;
        case 'newest':
          sortOption = { createdAt: -1 };
          break;
        case 'rating':
          sortOption = { ratingAverage: -1, reviewCount: -1 };
          break;
        case 'popular':
        case 'bestseller':
          sortOption = { bestseller: -1, reviewCount: -1 };
          break;
        case 'name_asc':
          sortOption = { name: 1 };
          break;
        case 'name_desc':
          sortOption = { name: -1 };
          break;
        default:
          if (sort.startsWith('-') || sort.startsWith('+')) {
            const field = sort.substring(1);
            const direction = sort.startsWith('-') ? -1 : 1;
            sortOption = { [field]: direction };
          }
          break;
      }
    }

    // Execute queries in parallel
    const [products, totalItems] = await Promise.all([
      Product.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .lean(),
      Product.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);

    return { products, meta };
  }

  /**
   * Get single product by slug
   * @param {string} slug
   * @param {boolean} isAdmin
   */
  async getProductBySlug(slug, isAdmin = false) {
    if (!slug) {
      throw ApiError.badRequest('Product slug is required');
    }

    const filter = { slug: slug.toLowerCase() };
    if (!isAdmin) {
      filter.status = 'active';
    }

    let product = await Product.findOne(filter)
      .populate('category', 'name slug')
      .populate('collections', 'name slug')
      .lean();

    // Fallback: If slug is valid ObjectId and not found by slug
    if (!product && mongoose.Types.ObjectId.isValid(slug)) {
      const idFilter = { _id: slug };
      if (!isAdmin) idFilter.status = 'active';
      product = await Product.findOne(idFilter)
        .populate('category', 'name slug')
        .populate('collections', 'name slug')
        .lean();
    }

    if (!product) {
      throw ApiError.notFound(`Product not found with slug: ${slug}`);
    }

    return product;
  }

  /**
   * Get product by ID
   * @param {string} id
   */
  async getProductById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await Product.findById(id)
      .populate('category', 'name slug')
      .populate('collections', 'name slug');

    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    return product;
  }

  /**
   * Create a new product (Admin)
   * @param {Object} productData
   */
  async createProduct(productData) {
    const slug = productData.slug ? slugify(productData.slug) : slugify(productData.name);

    // 1. Verify slug uniqueness
    const existingSlug = await Product.findOne({ slug });
    if (existingSlug) {
      throw ApiError.conflict(`Product with slug '${slug}' already exists`);
    }

    // 2. Verify SKU uniqueness
    const sku = productData.sku.toUpperCase().trim();
    const existingSku = await Product.findOne({ sku });
    if (existingSku) {
      throw ApiError.conflict(`Product with SKU '${sku}' already exists`);
    }

    // 3. Verify Category exists
    const categoryExists = await Category.findById(productData.category);
    if (!categoryExists) {
      throw ApiError.badRequest(`Category with ID ${productData.category} does not exist`);
    }

    // 4. Format variants and normalize SKUs
    const variants = (productData.variants || []).map((v) => ({
      ...v,
      sku: (v.sku || `${sku}-${slugify(v.size)}`).toUpperCase().trim(),
    }));

    // 5. Create Product
    const product = await Product.create({
      ...productData,
      slug,
      sku,
      variants,
    });

    // 6. Automatically sync initial inventory entries
    try {
      if (variants.length > 0) {
        for (const variant of variants) {
          await Inventory.findOneAndUpdate(
            { product: product._id, variantSku: variant.sku },
            {
              $setOnInsert: {
                product: product._id,
                variantSku: variant.sku,
                size: variant.size,
                quantity: variant.stock || 0,
                reservedQuantity: 0,
                lowStockThreshold: 5,
                status: (variant.stock || 0) > 5 ? 'in_stock' : (variant.stock || 0) > 0 ? 'low_stock' : 'out_of_stock',
              },
            },
            { upsert: true, new: true }
          );
        }
      } else {
        // Create single inventory entry for base product SKU
        await Inventory.findOneAndUpdate(
          { product: product._id, variantSku: sku },
          {
            $setOnInsert: {
              product: product._id,
              variantSku: sku,
              size: 'Standard',
              quantity: 0,
              reservedQuantity: 0,
              lowStockThreshold: 5,
              status: 'out_of_stock',
            },
          },
          { upsert: true, new: true }
        );
      }
    } catch (invErr) {
      // Non-fatal if inventory synchronization has duplicates
    }

    return product;
  }

  /**
   * Update existing product (Admin)
   * @param {string} id
   * @param {Object} updateData
   */
  async updateProduct(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    // Check slug collision
    if (updateData.slug || updateData.name) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : slugify(updateData.name || product.name);
      if (newSlug !== product.slug) {
        const slugExists = await Product.findOne({ slug: newSlug, _id: { $ne: id } });
        if (slugExists) {
          throw ApiError.conflict(`Product with slug '${newSlug}' already exists`);
        }
        updateData.slug = newSlug;
      }
    }

    // Check SKU collision
    if (updateData.sku) {
      const newSku = updateData.sku.toUpperCase().trim();
      if (newSku !== product.sku) {
        const skuExists = await Product.findOne({ sku: newSku, _id: { $ne: id } });
        if (skuExists) {
          throw ApiError.conflict(`Product with SKU '${newSku}' already exists`);
        }
        updateData.sku = newSku;
      }
    }

    // Check category validity if changed
    if (updateData.category && updateData.category.toString() !== product.category.toString()) {
      const categoryExists = await Category.findById(updateData.category);
      if (!categoryExists) {
        throw ApiError.badRequest(`Category with ID ${updateData.category} does not exist`);
      }
    }

    // Normalize variants SKUs if provided
    if (updateData.variants && Array.isArray(updateData.variants)) {
      updateData.variants = updateData.variants.map((v) => ({
        ...v,
        sku: (v.sku || `${updateData.sku || product.sku}-${slugify(v.size)}`).toUpperCase().trim(),
      }));
    }

    Object.assign(product, updateData);
    await product.save();

    // Sync inventory if new variants were added
    if (updateData.variants && Array.isArray(updateData.variants)) {
      for (const variant of updateData.variants) {
        await Inventory.findOneAndUpdate(
          { product: product._id, variantSku: variant.sku },
          {
            $setOnInsert: {
              product: product._id,
              variantSku: variant.sku,
              size: variant.size,
              quantity: variant.stock || 0,
              reservedQuantity: 0,
              lowStockThreshold: 5,
              status: (variant.stock || 0) > 5 ? 'in_stock' : (variant.stock || 0) > 0 ? 'low_stock' : 'out_of_stock',
            },
          },
          { upsert: true }
        );
      }
    }

    return product;
  }

  /**
   * Archive a product (Soft Delete)
   * @param {string} id
   */
  async archiveProduct(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    product.status = 'archived';
    await product.save();

    return product;
  }

  /**
   * Restore an archived product to active
   * @param {string} id
   */
  async restoreProduct(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest('Invalid product ID format');
    }

    const product = await Product.findById(id);
    if (!product) {
      throw ApiError.notFound(`Product with ID ${id} not found`);
    }

    product.status = 'active';
    await product.save();

    return product;
  }
}

module.exports = new ProductsService();

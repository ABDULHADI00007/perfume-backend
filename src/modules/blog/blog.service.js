const mongoose = require('mongoose');
const Blog = require('./blog.model');
const ApiError = require('../../utils/apiError');
const slugify = require('../../utils/slugify');
const { getPaginationOptions, formatPaginationMeta } = require('../../utils/pagination');
const { escapeRegex } = require('../../utils/sanitize');

class BlogService {
  /**
   * Create a new blog post
   * @param {Object} postData
   * @param {string|ObjectId} authorId
   */
  async createPost(postData, authorId) {
    const slug = postData.slug ? slugify(postData.slug) : slugify(postData.title);

    if (!slug) {
      throw ApiError.badRequest('Valid article slug or title is required');
    }

    const existing = await Blog.findOne({ slug });
    if (existing) {
      throw ApiError.conflict(`Article with slug '${slug}' already exists`);
    }

    const post = await Blog.create({
      ...postData,
      author: authorId,
      slug,
      publishedAt: postData.status === 'published' ? new Date() : undefined,
    });

    return post;
  }

  /**
   * Public: List published blog articles with pagination, category filter & search
   * @param {Object} query
   */
  async getPublishedPosts(query = {}) {
    const { page, limit, skip } = getPaginationOptions(query);
    const filter = { status: 'published' };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.tag) {
      filter.tags = query.tag;
    }

    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { excerpt: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [posts, totalItems] = await Promise.all([
      Blog.find(filter)
        .sort({ publishedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name')
        .select('-content') // Summary list omits full body content
        .lean(),
      Blog.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);
    return { posts, meta };
  }

  /**
   * Public: Get published article by slug
   * @param {string} slug
   */
  async getPublishedPostBySlug(slug) {
    if (!slug) {
      throw ApiError.badRequest('Post slug is required');
    }

    const post = await Blog.findOne({
      slug: slug.toLowerCase().trim(),
      status: 'published',
    })
      .populate('author', 'name')
      .lean();

    if (!post) {
      throw ApiError.notFound(`Article '${slug}' not found`);
    }

    return post;
  }

  /**
   * Admin: List all articles (draft, published, archived) with pagination & search
   * @param {Object} query
   */
  async getAdminPosts(query = {}) {
    const { page, limit, skip, sort } = getPaginationOptions(query);
    const filter = {};

    if (query.status) {
      filter.status = query.status;
    }
    if (query.category) {
      filter.category = query.category;
    }
    if (query.search && query.search.trim()) {
      const sanitized = escapeRegex(query.search.trim());
      filter.$or = [
        { title: { $regex: sanitized, $options: 'i' } },
        { slug: { $regex: sanitized, $options: 'i' } },
      ];
    }

    const [posts, totalItems] = await Promise.all([
      Blog.find(filter)
        .sort(sort || { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'name email')
        .lean(),
      Blog.countDocuments(filter),
    ]);

    const meta = formatPaginationMeta(totalItems, page, limit);
    return { posts, meta };
  }

  /**
   * Admin: Get article by ID
   * @param {string} id
   */
  async getPostById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid post ID: ${id}`);
    }

    const post = await Blog.findById(id).populate('author', 'name email').lean();
    if (!post) {
      throw ApiError.notFound(`Blog post with ID '${id}' not found`);
    }

    return post;
  }

  /**
   * Admin: Update article
   * @param {string} id
   * @param {Object} updateData
   */
  async updatePost(id, updateData) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid post ID: ${id}`);
    }

    const post = await Blog.findById(id);
    if (!post) {
      throw ApiError.notFound(`Blog post with ID '${id}' not found`);
    }

    if (updateData.slug || updateData.title) {
      const newSlug = updateData.slug ? slugify(updateData.slug) : slugify(updateData.title || post.title);
      if (newSlug !== post.slug) {
        const slugExists = await Blog.findOne({ slug: newSlug, _id: { $ne: id } });
        if (slugExists) {
          throw ApiError.conflict(`Blog post with slug '${newSlug}' already exists`);
        }
        post.slug = newSlug;
      }
    }

    if (updateData.title !== undefined) post.title = updateData.title;
    if (updateData.excerpt !== undefined) post.excerpt = updateData.excerpt;
    if (updateData.content !== undefined) post.content = updateData.content;
    if (updateData.featuredImage !== undefined) post.featuredImage = updateData.featuredImage;
    if (updateData.category !== undefined) post.category = updateData.category;
    if (updateData.tags !== undefined) post.tags = updateData.tags;
    if (updateData.seo !== undefined) post.seo = updateData.seo;

    if (updateData.status !== undefined) {
      post.status = updateData.status;
      if (updateData.status === 'published' && !post.publishedAt) {
        post.publishedAt = new Date();
      }
    }

    await post.save();
    return post;
  }

  /**
   * Admin: Publish article
   * @param {string} id
   */
  async publishPost(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid post ID: ${id}`);
    }

    const post = await Blog.findById(id);
    if (!post) {
      throw ApiError.notFound(`Blog post with ID '${id}' not found`);
    }

    post.status = 'published';
    post.publishedAt = post.publishedAt || new Date();
    await post.save();

    return post;
  }

  /**
   * Admin: Unpublish article (revert to draft)
   * @param {string} id
   */
  async unpublishPost(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid post ID: ${id}`);
    }

    const post = await Blog.findById(id);
    if (!post) {
      throw ApiError.notFound(`Blog post with ID '${id}' not found`);
    }

    post.status = 'draft';
    await post.save();

    return post;
  }

  /**
   * Admin: Archive article
   * @param {string} id
   */
  async archivePost(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid post ID: ${id}`);
    }

    const post = await Blog.findById(id);
    if (!post) {
      throw ApiError.notFound(`Blog post with ID '${id}' not found`);
    }

    post.status = 'archived';
    await post.save();

    return post;
  }

  /**
   * Admin: Delete article
   * @param {string} id
   */
  async deletePost(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest(`Invalid post ID: ${id}`);
    }

    const post = await Blog.findByIdAndDelete(id);
    if (!post) {
      throw ApiError.notFound(`Blog post with ID '${id}' not found`);
    }

    return post;
  }
}

module.exports = new BlogService();

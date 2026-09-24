const blogService = require('../../src/modules/blog/blog.service');
const Blog = require('../../src/modules/blog/blog.model');
const ApiError = require('../../src/utils/apiError');

describe('Blog / Journal Unit Tests', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('createPost', () => {
    test('creates article with unique slug and assigned author', async () => {
      jest.spyOn(Blog, 'findOne').mockResolvedValue(null);
      jest.spyOn(Blog, 'create').mockImplementation((data) =>
        Promise.resolve({ _id: 'post1', ...data })
      );

      const result = await blogService.createPost(
        {
          title: 'Notes of Oud & Amber',
          content: 'A deep exploration into ancient Middle Eastern resinous extracts.',
        },
        'author123'
      );

      expect(result.slug).toBe('notes-of-oud-amber');
      expect(result.author).toBe('author123');
    });
  });

  describe('getPublishedPostBySlug', () => {
    test('returns published article by slug', async () => {
      const mockPost = {
        _id: 'post1',
        title: 'Notes of Oud',
        slug: 'notes-of-oud',
        status: 'published',
      };
      jest.spyOn(Blog, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(mockPost),
        }),
      });

      const result = await blogService.getPublishedPostBySlug('notes-of-oud');
      expect(result.title).toBe('Notes of Oud');
    });

    test('throws notFound for unpublished draft post', async () => {
      jest.spyOn(Blog, 'findOne').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(blogService.getPublishedPostBySlug('draft-post')).rejects.toThrow(ApiError);
    });
  });

  describe('publishPost', () => {
    test('transitions draft to published state with timestamp', async () => {
      const mongoose = require('mongoose');
      const mockPostId = new mongoose.Types.ObjectId();
      const mockPost = {
        _id: mockPostId,
        status: 'draft',
        save: jest.fn().mockResolvedValue(true),
      };
      jest.spyOn(Blog, 'findById').mockResolvedValue(mockPost);

      const result = await blogService.publishPost(mockPostId.toString());
      expect(result.status).toBe('published');
      expect(result.publishedAt).toBeDefined();
      expect(mockPost.save).toHaveBeenCalled();
    });
  });
});

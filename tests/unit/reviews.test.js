const mongoose = require('mongoose');
const reviewsService = require('../../src/modules/reviews/reviews.service');
const Review = require('../../src/modules/reviews/reviews.model');
const Product = require('../../src/modules/products/products.model');
const Order = require('../../src/modules/orders/orders.model');

describe('Reviews Unit Tests', () => {
  const mockProductId = new mongoose.Types.ObjectId();
  const mockCustomerId = new mongoose.Types.ObjectId();

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('submitReview', () => {
    test('marks review verifiedPurchase=true when customer has completed order for product', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue({ _id: mockProductId, name: 'Oud Royal' });

      jest.spyOn(Order, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: 'order123',
          customer: mockCustomerId,
          orderStatus: 'delivered',
        }),
      });

      let createdReviewPayload = null;
      jest.spyOn(Review, 'create').mockImplementation((data) => {
        createdReviewPayload = data;
        return Promise.resolve({ _id: 'rev1', ...data });
      });

      const result = await reviewsService.submitReview({
        productId: mockProductId.toString(),
        customerName: 'Alice Perfumer',
        customerEmail: 'Alice@Example.com',
        rating: 5,
        title: 'Exquisite scent',
        comment: 'Truly remarkable sillage and longevity.',
      });

      expect(result.verifiedPurchase).toBe(true);
      expect(result.customerEmail).toBe('alice@example.com');
      expect(result.status).toBe('pending');
      expect(createdReviewPayload.verifiedPurchase).toBe(true);
    });

    test('marks review verifiedPurchase=false when no matching order is found', async () => {
      jest.spyOn(Product, 'findById').mockResolvedValue({ _id: mockProductId, name: 'Oud Royal' });
      jest.spyOn(Order, 'findOne').mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      jest.spyOn(Review, 'create').mockImplementation((data) =>
        Promise.resolve({ _id: 'rev2', ...data })
      );

      const result = await reviewsService.submitReview({
        productId: mockProductId.toString(),
        customerName: 'Bob Visitor',
        customerEmail: 'bob@example.com',
        rating: 4,
        comment: 'Loved the tester sample!',
      });

      expect(result.verifiedPurchase).toBe(false);
      expect(result.status).toBe('pending');
    });
  });

  describe('moderateReview', () => {
    test('updates status and recalculates product rating average and count', async () => {
      const mockReviewId = new mongoose.Types.ObjectId();
      const mockReview = {
        _id: mockReviewId,
        product: mockProductId,
        status: 'pending',
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Review, 'findById').mockResolvedValue(mockReview);
      jest.spyOn(Review, 'aggregate').mockResolvedValue([
        { _id: mockProductId, averageRating: 4.8, reviewCount: 12 },
      ]);
      const updateProductSpy = jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValue(true);

      const result = await reviewsService.moderateReview(mockReviewId.toString(), 'approved');
      expect(result.status).toBe('approved');
      expect(mockReview.save).toHaveBeenCalled();
      expect(updateProductSpy).toHaveBeenCalledWith(mockProductId, {
        ratingAverage: 4.8,
        reviewCount: 12,
      });
    });
  });
});

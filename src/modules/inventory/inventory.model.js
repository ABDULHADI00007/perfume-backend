const mongoose = require('mongoose');

const inventoryAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['initial', 'set_quantity', 'adjustment', 'reservation', 'release', 'commit_order'],
      required: true,
    },
    quantityChanged: { type: Number, required: true },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    previousReserved: { type: Number, default: 0 },
    newReserved: { type: Number, default: 0 },
    reason: { type: String, trim: true },
    performedBy: { type: String, trim: true, default: 'system' },
    orderNumber: { type: String, trim: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product reference is required'],
      index: true,
    },
    variantSku: {
      type: String,
      required: [true, 'Variant SKU is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    size: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
      required: [true, 'Stock physical quantity is required'],
      default: 0,
      min: [0, 'Physical stock quantity cannot be negative'],
    },
    reservedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reserved stock quantity cannot be negative'],
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Low stock threshold cannot be negative'],
    },
    status: {
      type: String,
      enum: ['in_stock', 'low_stock', 'out_of_stock'],
      default: 'in_stock',
    },
    history: [inventoryAuditLogSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Derived virtual field for real-time available stock
inventorySchema.virtual('availableQuantity').get(function () {
  return Math.max(0, (this.quantity || 0) - (this.reservedQuantity || 0));
});

// Helper method to compute inventory status
inventorySchema.methods.calculateStatus = function () {
  const available = (this.quantity || 0) - (this.reservedQuantity || 0);
  if (available <= 0) {
    this.status = 'out_of_stock';
  } else if (available <= (this.lowStockThreshold || 5)) {
    this.status = 'low_stock';
  } else {
    this.status = 'in_stock';
  }
  return this.status;
};

// Compound unique index ensuring one inventory document per product variant SKU
inventorySchema.index({ product: 1, variantSku: 1 }, { unique: true });
inventorySchema.index({ status: 1 });
inventorySchema.index({ quantity: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);

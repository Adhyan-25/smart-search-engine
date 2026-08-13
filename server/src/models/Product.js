const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    category: { type: String, required: true, index: true },
    price: { type: Number, required: true, min: 0 },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    popularity: { type: Number, default: 0 }, // search/click frequency signal
    keywords: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Text index for title/description/keywords search (section 4/6).
// Weighted so title matches rank above description/keyword matches.
productSchema.index(
  { title: 'text', description: 'text', keywords: 'text' },
  { weights: { title: 10, keywords: 5, description: 1 }, name: 'product_text_index' }
);

// Compound index supporting common filter+sort combinations without a
// collection scan: category filter + price range + sort by price/rating.
productSchema.index({ category: 1, price: 1 });
productSchema.index({ category: 1, rating: -1 });
productSchema.index({ createdAt: -1 }); // supports cursor pagination on _id/createdAt

module.exports = mongoose.model('Product', productSchema);

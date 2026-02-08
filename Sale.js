const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  // Data senza orario per raggruppare le vendite giornaliere
  dateOnly: {
    type: String,
    required: true
  },
  userId: {
    type: Number, // Telegram user ID
    required: true
  },
  username: {
    type: String
  }
});

// Indici per query efficienti
saleSchema.index({ dateOnly: 1, productId: 1 });
saleSchema.index({ productId: 1 });
saleSchema.index({ userId: 1 });

module.exports = mongoose.model('Sale', saleSchema);

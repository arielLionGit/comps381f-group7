const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  images: [{
    filename: String,
    mimetype: String,
    data: String,  // Base64 encoded image data
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  viewCount: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt timestamp
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Increment view count
postSchema.methods.incrementViewCount = async function() {
  await this.constructor.updateOne(
    { _id: this._id },
    { $inc: { viewCount: 1 } }
  );
  this.viewCount += 1;
};

module.exports = mongoose.model('Post', postSchema);

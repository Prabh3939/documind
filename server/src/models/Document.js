import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    mimeType: String,
    size: Number,
    status: { type: String, enum: ['processing', 'ready', 'failed'], default: 'processing' },
    error: String,
    chunkCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    text: { type: String, select: false },
    summaries: { type: Map, of: String, default: {} }, // cache keyed by style
  },
  { timestamps: true }
);

export default mongoose.model('Document', documentSchema);

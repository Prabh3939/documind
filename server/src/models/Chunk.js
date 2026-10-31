import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  index: { type: Number, required: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }, // 384-d, L2-normalised
});
chunkSchema.index({ user: 1, document: 1, index: 1 });

export default mongoose.model('Chunk', chunkSchema);

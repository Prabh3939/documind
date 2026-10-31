import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    sources: [{ n: Number, index: Number, text: String, score: Number }],
  },
  { timestamps: true }
);

const chatSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
  messages: [messageSchema],
});
chatSchema.index({ user: 1, document: 1 }, { unique: true });

export default mongoose.model('Chat', chatSchema);

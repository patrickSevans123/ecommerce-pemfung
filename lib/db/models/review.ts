import mongoose, { Schema } from 'mongoose';

export interface ReviewDocument extends mongoose.Document {
  product: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type ReviewModel = mongoose.Model<ReviewDocument>;

const ReviewSchema = new Schema<ReviewDocument, ReviewModel>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true }
);

// avoid duplicate reviews per user per product
ReviewSchema.index({ product: 1, user: 1 }, { unique: false });

export default (mongoose.models.Review as ReviewModel) || mongoose.model<ReviewDocument>('Review', ReviewSchema);

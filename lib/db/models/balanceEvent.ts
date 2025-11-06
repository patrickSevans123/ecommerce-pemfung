import mongoose, { Schema } from 'mongoose';

export interface BalanceEventDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  amount: number;
  type: 'deposit' | 'withdrawn' | 'payment';
  reference?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type BalanceEventModel = mongoose.Model<BalanceEventDocument>;

const BalanceEventSchema = new Schema<BalanceEventDocument, BalanceEventModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['deposit', 'withdrawn', 'payment'], required: true },
    reference: { type: String },
  },
  { timestamps: true }
);

BalanceEventSchema.index({ user: 1, createdAt: -1 });

export default (mongoose.models.BalanceEvent as BalanceEventModel) ||
  mongoose.model<BalanceEventDocument>('BalanceEvent', BalanceEventSchema);

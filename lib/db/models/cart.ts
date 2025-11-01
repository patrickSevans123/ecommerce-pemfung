import mongoose, { Schema } from 'mongoose';

export interface CartItemDocument {
  product: mongoose.Types.ObjectId;
  quantity: number;
  addedAt: Date;
}

export interface CartDocument extends mongoose.Document {
  user: mongoose.Types.ObjectId;
  items: CartItemDocument[];
  expiresAt: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

type CartModel = mongoose.Model<CartDocument>;

const CartItemSchema = new Schema<CartItemDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const CartSchema = new Schema<CartDocument, CartModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
  },
  { timestamps: true }
);

CartSchema.index({ user: 1 });
CartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (mongoose.models.Cart as CartModel) || mongoose.model<CartDocument>('Cart', CartSchema);

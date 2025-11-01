import mongoose, { Schema } from 'mongoose';

export interface OrderItemDocument {
  product: mongoose.Types.ObjectId;
  name?: string;
  price: number;
  quantity: number;
}

export interface OrderDocument extends mongoose.Document {
  user?: mongoose.Types.ObjectId;
  items: OrderItemDocument[];
  subtotal: number;
  shipping: number;
  total: number;
  status: string;
  payment?: Record<string, unknown> | null;
  shippingAddress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrderModel = mongoose.Model<OrderDocument>;

const OrderItemSchema = new Schema<OrderItemDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDocument, OrderModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 10000 },
    total: { type: Number, required: true },
    status: { type: String, default: 'pending', index: true },
  payment: { type: Schema.Types.Mixed },
  shippingAddress: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1 });
OrderSchema.index({ status: 1 });
OrderSchema.index({ createdAt: -1 });

export default (mongoose.models.Order as OrderModel) || mongoose.model<OrderDocument>('Order', OrderSchema);

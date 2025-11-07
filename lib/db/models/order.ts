import mongoose, { Schema } from 'mongoose';
import { OrderStatus } from '@/lib/domain/types';

export interface OrderItemDocument {
  product: mongoose.Types.ObjectId;
  seller: mongoose.Types.ObjectId;
  name?: string;
  price: number;
  quantity: number;
}

export interface OrderDocument extends mongoose.Document {
  user?: mongoose.Types.ObjectId;
  items: OrderItemDocument[];
  subtotal: number;
  shipping: number;
  discount?: number;
  promoCode?: mongoose.Types.ObjectId;
  promoCodeApplied?: string;
  total: number;
  status: OrderStatus;
  payment?: Record<string, unknown> | null;
  shippingAddress?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type OrderModel = mongoose.Model<OrderDocument>;

const OrderItemSchema = new Schema<OrderItemDocument>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    seller: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

// OrderStatus schema for proper type enforcement
const OrderStatusSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'paid', 'shipped', 'delivered', 'cancelled'],
      required: true,
    },
    paidAt: { type: String },
    shippedAt: { type: String },
    tracking: { type: String },
    deliveredAt: { type: String },
    reason: { type: String },
  },
  { _id: false }
);

const OrderSchema = new Schema<OrderDocument, OrderModel>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    items: { type: [OrderItemSchema], default: [] },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 10000 },
    discount: { type: Number, default: 0 },
    promoCode: { type: Schema.Types.ObjectId, ref: 'PromoCode', sparse: true },
    promoCodeApplied: { type: String, sparse: true },
    total: { type: Number, required: true },
    status: { type: OrderStatusSchema, default: { status: 'pending' }, required: true },
    payment: { type: Schema.Types.Mixed },
    shippingAddress: { type: String },
  },
  { timestamps: true }
);

OrderSchema.index({ 'items.seller': 1 });
OrderSchema.index({ user: 1 });
OrderSchema.index({ 'status.status': 1 });
OrderSchema.index({ createdAt: -1 });

export default (mongoose.models.Order as OrderModel) || mongoose.model<OrderDocument>('Order', OrderSchema);

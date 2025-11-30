import mongoose, { Schema } from 'mongoose';

// Data type definitions for notifications
export interface OrderPlacedData {
  productName: string;
  quantity: number;
  totalAmount: number;
}

export interface PaymentSuccessData {
  orderId: string;
  amount: number;
  productName?: string;
  quantity?: number;
}

export interface PaymentFailedData {
  orderId: string;
  amount: number;
  reason?: string;
}

export interface OrderShippedData {
  orderId: string;
  trackingNumber: string;
}

export interface OrderDeliveredData {
  orderId: string;
  deliveredAt?: string;
}

export interface BalanceUpdatedData {
  reason?: string;
  amount?: number;
}

// Discriminated union for notification data based on type
export type NotificationData =
  | ({ type: 'ORDER_PLACED' } & OrderPlacedData)
  | ({ type: 'PAYMENT_SUCCESS' } & PaymentSuccessData)
  | ({ type: 'PAYMENT_FAILED' } & PaymentFailedData)
  | ({ type: 'ORDER_SHIPPED' } & OrderShippedData)
  | ({ type: 'ORDER_DELIVERED' } & OrderDeliveredData)
  | ({ type: 'BALANCE_UPDATED' } & BalanceUpdatedData);

export interface NotificationDocument extends mongoose.Document {
  type: 'ORDER_PLACED' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED' | 'BALANCE_UPDATED';
  userId?: string;
  sellerId?: string;
  productId?: string;
  orderId?: string;
  data: NotificationData;
  createdAt?: Date;
  updatedAt?: Date;
}

type NotificationModel = mongoose.Model<NotificationDocument>;

const NotificationSchema = new Schema<NotificationDocument, NotificationModel>(
  {
    type: {
      type: String,
      enum: ['ORDER_PLACED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'BALANCE_UPDATED'],
      required: true,
    },
    userId: {
      type: String,
      index: true,
    },
    sellerId: {
      type: String,
      index: true,
    },
    productId: {
      type: String,
      index: true,
    },
    orderId: {
      type: String,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Compound indexes for efficient queries
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ sellerId: 1, createdAt: -1 });
NotificationSchema.index({ type: 1, createdAt: -1 });

export default (mongoose.models.Notification as NotificationModel) ||
  mongoose.model<NotificationDocument>('Notification', NotificationSchema);
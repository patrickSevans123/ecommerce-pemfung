import mongoose, { Schema } from 'mongoose';

export type DiscountKind = 'percentage' | 'fixed' | 'free_shipping' | 'buy_x_get_y';

export interface DiscountSubdocument {
  kind: DiscountKind;
  percent?: number;
  amount?: number;
  buyQuantity?: number;
  getQuantity?: number;
  productId?: mongoose.Types.ObjectId;
}

export type ConditionKind = 'min_purchase_amount' | 'category_includes' | 'product_includes';

export interface ConditionSubdocument {
  kind: ConditionKind;
  amount?: number;
  categories: string[];
  productIds: mongoose.Types.ObjectId[];
}

export interface PromoCodeDocument extends mongoose.Document {
  code: string;
  description?: string;
  discount: DiscountSubdocument;
  conditions: ConditionSubdocument[];
  freeShippingAmount?: number;
  expiresAt?: Date;
  usageLimit: number;
  usedCount: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

type PromoCodeModel = mongoose.Model<PromoCodeDocument>;

const DiscountSchema = new Schema<DiscountSubdocument>(
  {
    kind: {
      type: String,
      enum: ['percentage', 'fixed', 'free_shipping', 'buy_x_get_y'],
      required: true,
    },
    percent: { type: Number, min: 0, max: 100 },
    amount: { type: Number, min: 0 },
    buyQuantity: { type: Number, min: 1 },
    getQuantity: { type: Number, min: 1 },
    productId: { type: Schema.Types.ObjectId, ref: 'Product' },
  },
  { _id: false }
);

const ConditionSchema = new Schema<ConditionSubdocument>(
  {
    kind: {
      type: String,
      enum: ['min_purchase_amount', 'category_includes', 'product_includes'],
      required: true,
    },
    amount: { type: Number, min: 0 },
    categories: { type: [String], default: [] },
    productIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
  },
  { _id: false }
);

const PromoCodeSchema = new Schema<PromoCodeDocument, PromoCodeModel>(
  {
    code: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    discount: { type: DiscountSchema, required: true },
    conditions: { type: [ConditionSchema], default: [] },
    freeShippingAmount: { type: Number, min: 0 },
    expiresAt: { type: Date, index: true },
    usageLimit: { type: Number, default: 0 },
    usedCount: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PromoCodeSchema.index({ code: 1 });
PromoCodeSchema.index({ expiresAt: 1 });

export default (mongoose.models.PromoCode as PromoCodeModel) ||
  mongoose.model<PromoCodeDocument>('PromoCode', PromoCodeSchema);

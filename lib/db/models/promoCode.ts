import mongoose, { Schema } from 'mongoose';

export type DiscountKind = 'percentage' | 'fixed' | 'free_shipping';

export interface DiscountSubdocument {
  kind: DiscountKind;
  percent?: number;
  amount?: number;
}

export type ConditionKind = 'min_purchase_amount' | 'category_includes';

export interface ConditionSubdocument {
  kind: ConditionKind;
  amount?: number;
  categories: string[];
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
      enum: ['percentage', 'fixed', 'free_shipping'],
      required: true,
    },
    percent: { type: Number, min: 0, max: 100 },
    amount: { type: Number, min: 0 },
  },
  { _id: false }
);

const ConditionSchema = new Schema<ConditionSubdocument>(
  {
    kind: {
      type: String,
      enum: ['min_purchase_amount', 'category_includes'],
      required: true,
    },
    amount: { type: Number, min: 0 },
    categories: { type: [String], default: [] },
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

export interface PromoCode {
  _id: string;
  code: string;
  description?: string;
  discount: {
    kind: 'percentage' | 'fixed' | 'free_shipping';
    percent?: number;
    amount?: number;
  };
  conditions?: Array<{
    kind: 'min_purchase_amount' | 'category_includes';
    amount?: number;
    categories?: string[];
  }>;
  freeShippingAmount?: number;
  expiresAt?: string;
  usageLimit?: number;
  usedCount?: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
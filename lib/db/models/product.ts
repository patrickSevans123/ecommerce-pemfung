import mongoose, { Schema } from 'mongoose';

export interface ProductDocument extends mongoose.Document {
  title: string;
  description?: string;
  price: number;
  category?: string;
  images: string[];
  stock: number;
  sku?: string;
  tags: string[];
  avgRating: number;
  reviewsCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

type ProductModel = mongoose.Model<ProductDocument>;

const ProductSchema = new Schema<ProductDocument, ProductModel>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true },
    category: { type: String, index: true },
    images: { type: [String], default: [] },
    stock: { type: Number, default: 0 },
    sku: { type: String, sparse: true, unique: true },
    tags: { type: [String], default: [] },
    avgRating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 }
  },
  { timestamps: true }
);

// text search on title + description
ProductSchema.index({ title: 'text', description: 'text' });
// `sku` and `category` fields already have index definitions on the field level
// (see `sku: { unique: true }` and `category: { index: true }`) — avoid
// duplicate schema.index() declarations which cause Mongoose warnings.
ProductSchema.index({ tags: 1 });
ProductSchema.index({ version: 1 });

export default (mongoose.models.Product as ProductModel) || mongoose.model<ProductDocument>('Product', ProductSchema);

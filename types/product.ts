export interface Product {
  _id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  images: string[];
  stock: number;
  seller: { _id?: string; name?: string; email?: string };
  tags: string[];
  avgRating: number;
  reviewsCount: number;
  createdAt: string;
  updatedAt: string;
}
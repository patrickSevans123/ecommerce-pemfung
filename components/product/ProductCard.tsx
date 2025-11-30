"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  product: Product;
  className?: string;
};

export default function ProductCard({ product, className = '' }: Props) {
  return (
    <Card key={product._id} className={`hover:shadow-lg transition-shadow bg-gray-900 border-white text-white ${className}`}>
      <CardHeader>
        <div className="aspect-square bg-gray-700 rounded-md mb-4 overflow-hidden relative">
          {product.images && product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-500">No Image</span>
            </div>
          )}
        </div>
        <CardTitle className="line-clamp-2">{product.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-400 text-sm line-clamp-2 mb-4">{product.description}</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-white">${product.price}</span>
          <Badge variant="secondary" className="bg-white text-black">{product.category}</Badge>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <span>⭐ {product.avgRating.toFixed(1)}</span>
          <span>•</span>
          <span>{product.reviewsCount} reviews</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">Stock: {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}</p>
      </CardContent>
      <CardFooter>
        {product.stock > 0 ? (
          <Button asChild className="w-full bg-white text-black hover:bg-gray-200">
            <Link href={`/products/${product._id}`}>View Product</Link>
          </Button>
        ) : (
          <Button className="w-full bg-white text-black hover:bg-gray-200" disabled>
            Out of Stock
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

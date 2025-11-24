'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/store/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { productsAPI } from '@/utils/api';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader } from '@/components/loader';

const productSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  price: z.number().min(0, 'Price must be positive'),
  category: z.string().min(1, 'Category is required'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  images: z.string().optional(),
  tags: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { token } = useAuthStore();
  const { isLoading: authLoading, user } = useProtectedRoute(['seller']);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [productId, setProductId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  const category = watch('category');

  useEffect(() => {
    if (!authLoading && user?.id) {
      params.then(({ id }) => {
        setProductId(id);
        loadProduct(id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const loadProduct = async (id: string) => {
    if (!token) return;

    try {
      setIsLoading(true);
      const product = await productsAPI.getById(id);

      // Check if current user is the seller
      if (product.seller !== user?.id) {
        setError('You do not have permission to edit this product');
        return;
      }

      // Set form values
      reset({
        title: product.title,
        description: product.description,
        price: product.price,
        category: product.category,
        stock: product.stock,
        images: product.images?.join('\n') || '',
        tags: product.tags?.join(', ') || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    if (!productId || !token) {
      setError('Invalid product or not authenticated');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // Parse images and tags
      const images = data.images
        ? data.images.split('\n').filter((url) => url.trim())
        : [];
      const tags = data.tags
        ? data.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : [];

      await productsAPI.update(token, productId, {
        title: data.title,
        description: data.description,
        price: data.price,
        category: data.category,
        stock: data.stock,
        images,
        tags,
      });

      router.push('/seller/products');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || isLoading) {
    return <Loader />;
  }

  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => router.push('/seller/products')}>
              Back to Products
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Product</h1>
          <p className="text-gray-600">Update your product listing details</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Product Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Wireless Bluetooth Headphones"
                  {...register('title')}
                  disabled={isSubmitting}
                />
                {errors.title && (
                  <p className="text-sm text-red-500">{errors.title.message}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe your product in detail..."
                  rows={4}
                  {...register('description')}
                  disabled={isSubmitting}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message}</p>
                )}
              </div>

              {/* Price and Stock */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price ($) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('price', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500">{errors.price.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    type="number"
                    placeholder="0"
                    {...register('stock', { valueAsNumber: true })}
                    disabled={isSubmitting}
                  />
                  {errors.stock && (
                    <p className="text-sm text-red-500">{errors.stock.message}</p>
                  )}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={category}
                  onValueChange={(value) => setValue('category', value)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Books">Books</SelectItem>
                    <SelectItem value="Toys">Toys</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.category && (
                  <p className="text-sm text-red-500">{errors.category.message}</p>
                )}
              </div>

              {/* Images */}
              <div className="space-y-2">
                <Label htmlFor="images">Image URLs (optional)</Label>
                <Textarea
                  id="images"
                  placeholder="Enter one URL per line&#10;https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
                  rows={3}
                  {...register('images')}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500">
                  Enter one image URL per line. First image will be the main product image.
                </p>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (optional)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., wireless, bluetooth, audio"
                  {...register('tags')}
                  disabled={isSubmitting}
                />
                <p className="text-sm text-gray-500">
                  Separate tags with commas to help customers find your product.
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-4 pt-4">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? 'Updating Product...' : 'Update Product'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/seller/products')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

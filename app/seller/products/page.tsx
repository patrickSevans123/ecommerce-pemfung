'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { productsAPI } from '@/utils/api';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader } from '@/components/loader';

export default function SellerProductsPage() {
  const router = useRouter();
  const { logout, token } = useAuthStore();
  const { isLoading: authLoading, user } = useProtectedRoute(['seller']);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchProducts = async () => {
    if (!user?.id || !token) return;

    try {
      setIsLoading(true);
      const data = await productsAPI.getBySeller(token, user.id);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.productId || !token) return;

    try {
      setIsDeleting(true);
      await productsAPI.delete(token, deleteDialog.productId);
      setProducts(products.filter((p) => p._id !== deleteDialog.productId));
      setDeleteDialog({ open: false, productId: null });
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (authLoading) {
    return <Loader />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Products</h1>
            <p className="text-gray-600">Manage your product listings</p>
          </div>
          <Button asChild>
            <Link href="/seller/products/add">Add New Product</Link>
          </Button>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600">Loading products...</p>
            </CardContent>
          </Card>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">You haven&apos;t created any products yet.</p>
              <Button asChild>
                <Link href="/seller/products/add">Create Your First Product</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>All Products ({products.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Image</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product._id}>
                      <TableCell>
                        <div className="w-16 h-16 bg-gray-200 rounded overflow-hidden relative">
                          {product.images && product.images.length > 0 ? (
                            <Image
                              src={product.images[0]}
                              alt={product.title}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-xs">
                          <p className="truncate">{product.title}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{product.category}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${product.price.toFixed(2)}</TableCell>
                      <TableCell className="text-center">
                        {product.stock > 0 ? (
                          <span className="text-green-600">{product.stock}</span>
                        ) : (
                          <span className="text-red-600">Out of stock</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span>⭐</span>
                          <span>{product.avgRating?.toFixed(1) || '0.0'}</span>
                          <span className="text-gray-500 text-sm">({product.reviewsCount || 0})</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/seller/products/${product._id}/edit`}>Edit</Link>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, productId: product._id })}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, productId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ open: false, productId: null })}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { productsAPI, cartAPI } from '@/utils/api';
import { reviewsAPI } from '@/utils/api/reviews';
import ReviewForm from '@/components/review/ReviewForm';
import ReviewList from '@/components/review/ReviewList';
import { Review } from '@/types/review';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { validateQuantity } from '@/lib/fp/product-helpers';
import { parseValidationError } from '@/lib/fp/error-parsers';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isBuyingNow, setIsBuyingNow] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [productId, setProductId] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsStats, setReviewsStats] = useState<{ count: number; average: number } | null>(null);

  useEffect(() => {
    params.then(({ id }) => {
      setProductId(id);
      fetchProduct(id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProduct = async (id: string) => {
    try {
      setIsLoading(true);
      const data = await productsAPI.getById(id);
      setProduct(data);
      // fetch reviews for product
      fetchReviews(id);
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReviews = async (id: string) => {
    try {
      const res = await reviewsAPI.getByProduct(id);
      setReviews(res.reviews);
      setReviewsStats({ count: res.stats.count, average: res.stats.average });
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setReviews([]);
      setReviewsStats(null);
    }
  };

  const handleQuantityChange = (value: number) => {
    if (product) {
      setQuantity(validateQuantity(value, product.stock));
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated || !user?.id) {
      router.push('/login');
      return;
    }

    if (!productId) return;

    try {
      setIsAddingToCart(true);
      await cartAPI.addToCart(user.id, productId, quantity);
      toast.success('Added to cart!', {
        description: `${quantity} item(s) added successfully`,
      });
      setQuantity(1); // Reset quantity
    } catch (error: unknown) {
      console.error('Error adding to cart:', error);

      const { title, description } = parseValidationError(error);
      toast.error(title, { description });
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    (async () => {
      if (!isAuthenticated || !user?.id) {
        router.push('/login');
        return;
      }

      if (!productId) return;

      try {
        setIsBuyingNow(true);

        // Fetch current cart and remove other items so checkout contains only this product
        try {
          const current = await cartAPI.getCart(user.id);
          const items = current.cart?.items || [];
          await Promise.all(items.map(async (it: any) => {
            const pid = it.product || it.productId || '';
            if (pid && pid !== productId) {
              try {
                await cartAPI.removeItem(user.id, pid);
              } catch (e) {
                // Non-fatal: log and continue
                console.error('Failed to remove cart item during Buy Now:', pid, e);
              }
            }
          }));
        } catch (e) {
          // If fetching cart fails, continue — we'll still add the item
          console.error('Failed to fetch/clean cart before Buy Now:', e);
        }

        // Add the selected product to cart (or update quantity if already present)
        await cartAPI.addToCart(user.id, productId, quantity);

        // Navigate to checkout
        router.push('/checkout');
      } catch (error: unknown) {
        console.error('Buy Now failed:', error);
        const msg = (error as any)?.message || 'Failed to start checkout';
        toast.error(msg);
      } finally {
        setIsBuyingNow(false);
      }
    })();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading product...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">Product not found</p>
              <Button asChild>
                <Link href="/products">Back to Products</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600">
            <Link href="/products" className="hover:text-gray-900">
              Products
            </Link>
            <span>/</span>
            <Link href={`/products?category=${product.category}`} className="hover:text-gray-900">
              {product.category}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{product.title}</span>
          </nav>
        </div>

        {/* Product Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images Section */}
          <div className="space-y-4">
            {/* Main Image */}
            <Card>
              <CardContent className="p-4">
                <div className="w-full h-96 bg-gray-200 rounded-lg overflow-hidden relative">
                  {product.images && product.images.length > 0 ? (
                    <Image
                      src={product.images[selectedImage]}
                      alt={product.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      priority
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No image available
                    </div>
                  )}
                  {product.stock === 0 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                      <Badge variant="destructive" className="text-lg px-4 py-2">
                        Out of Stock
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-20 h-20 shrink-0 bg-gray-200 rounded-lg overflow-hidden relative border-2 ${selectedImage === index ? 'border-gray-900' : 'border-transparent'
                      }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.title} - Image ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info Section */}
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-3">
                {product.category}
              </Badge>
              <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-medium">{product.avgRating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-600">
                    ({product.reviewsCount || 0} review{product.reviewsCount !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-b py-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="text-4xl font-bold text-gray-900">
                  ${product.price.toFixed(2)}
                </span>
              </div>

              {/* Stock Status */}
              <div className="mt-4">
                {product.stock > 0 ? (
                  <>
                    <p className="text-green-600 font-medium">In Stock</p>
                    {product.stock <= 10 && (
                      <p className="text-orange-600 text-sm mt-1">
                        Only {product.stock} left - order soon!
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-red-600 font-medium">Out of Stock</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-xl font-semibold mb-3">Product Description</h2>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity and Actions */}
            {isAuthenticated && user?.role === 'buyer' && product.stock > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Purchase Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Quantity Selector */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity</Label>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 1}
                      >
                        -
                      </Button>
                      <Input
                        id="quantity"
                        type="number"
                        min="1"
                        max={product.stock}
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                        className="w-24 text-center"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={quantity >= product.stock}
                      >
                        +
                      </Button>
                      <span className="text-sm text-gray-600">
                        Max: {product.stock}
                      </span>
                    </div>
                  </div>

                  {/* Subtotal */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="text-2xl font-bold">
                      ${(product.price * quantity).toFixed(2)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={handleAddToCart}
                      disabled={isAddingToCart || product.stock === 0}
                      variant="outline"
                      className="flex-1"
                    >
                      {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                    </Button>
                    <Button
                      onClick={handleBuyNow}
                      disabled={isBuyingNow || product.stock === 0}
                      className="flex-1"
                    >
                      Buy Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Not logged in message */}
            {!isAuthenticated && product.stock > 0 && (
              <Card className="border-gray-300">
                <CardContent className="py-6 text-center">
                  <p className="text-gray-600 mb-4">
                    Please log in to purchase this product
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button asChild variant="outline">
                      <Link href="/login">Login</Link>
                    </Button>
                    <Button asChild>
                      <Link href="/register">Sign Up</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seller is viewing */}
            {isAuthenticated && user?.role === 'seller' && (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="py-4">
                  <p className="text-blue-800 text-sm">
                    You are viewing this product as a seller. Buyers can add this to their cart.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Back to Products */}
            <Button variant="ghost" asChild className="w-full">
              <Link href="/products">← Back to All Products</Link>
            </Button>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews List - Takes up 2 columns */}
            <div className="lg:col-span-2">
              <ReviewList reviews={reviews} stats={reviewsStats} />
            </div>

            {/* Review Form - Takes up 1 column */}
            <div className="lg:border-l lg:pl-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-900">
                Write a Review
              </h3>
              {isAuthenticated && user?.role === 'buyer' ? (
                <ReviewForm
                  productId={product._id}
                  onCreated={(r) => {
                    setReviews((prev) => [r, ...prev]);
                    if (productId) fetchReviews(productId);
                  }}
                />
              ) : (
                <div className="py-6 text-center border border-gray-200 rounded-lg">
                  <p className="text-gray-600 text-sm">
                    {isAuthenticated && user?.role === 'seller'
                      ? 'Only buyers can submit reviews.'
                      : 'Log in as a buyer to submit a review.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

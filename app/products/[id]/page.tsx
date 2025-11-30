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
import { Review } from '@/types';
import { CartItem, Product } from '@/types';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      setQuantity(1);
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

        try {
          const current = await cartAPI.getCart(user.id);
          const items = current.cart?.items || [];
          await Promise.all(items.map(async (it: CartItem) => {
            const pid = it.productId || '';
            if (pid && pid !== productId) {
              try {
                await cartAPI.removeItem(user.id, pid);
              } catch (e) {
                console.error('Failed to remove cart item during Buy Now:', pid, e);
              }
            }
          }));
        } catch (e) {
          console.error('Failed to fetch/clean cart before Buy Now:', e);
        }

        await cartAPI.addToCart(user.id, productId, quantity);
        router.push('/checkout');
      } catch (error: unknown) {
        console.error('Buy Now failed:', error);
        const msg = 'Failed to start checkout';
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
          <div className="bg-white rounded-lg border p-12 text-center">
            <p className="text-gray-600 mb-4">Product not found</p>
            <Button asChild>
              <Link href="/products">Back to Products</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Breadcrumb Bar */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <nav className="text-xs text-gray-600">
            <Link href="/products" className="hover:text-gray-900">
              Products
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/products?category=${product.category}`} className="hover:text-gray-900">
              {product.category}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-900">{product.title}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="grid lg:grid-cols-5 gap-0">
            {/* Image Gallery - 2 columns */}
            <div className="lg:col-span-2 p-6 border-r">
              <div className="aspect-square bg-gray-100 rounded mb-3 overflow-hidden relative">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 1024px) 100vw, 40vw"
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
              {product.images && product.images.length > 1 && (
                <div className="grid grid-cols-3 gap-2">
                  {product.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`aspect-square bg-gray-100 rounded overflow-hidden border-2 relative ${
                        selectedImage === index ? 'border-gray-900' : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${product.title} - Image ${index + 1}`}
                        fill
                        className="object-cover"
                        sizes="120px"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details - 3 columns */}
            <div className="lg:col-span-3 p-6">
              <div className="mb-6">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-2">
                  {product.category}
                </div>
                <h1 className="text-3xl font-bold mb-3">{product.title}</h1>
                
                {/* Seller info */}
                {(() => {
                  const sellerObj = product.seller;
                  const sellerId = sellerObj?._id;
                  if (sellerObj?.name) {
                    return (
                      <div className="text-sm text-gray-600 mb-3">
                        Sold by:{' '}
                        <Link href={`/users/${sellerId || ''}`} className="hover:underline text-gray-700 font-medium">
                          {sellerObj.name}
                        </Link>
                      </div>
                    );
                  }
                  if (sellerId) {
                    return (
                      <div className="text-sm text-gray-600 mb-3">
                        Sold by:{' '}
                        <Link href={`/users/${sellerId}`} className="hover:underline text-gray-700 font-medium">
                          Seller Profile
                        </Link>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex items-center gap-2 text-sm mb-4">
                  <span className="text-yellow-500">⭐</span>
                  <span className="font-semibold">{product.avgRating?.toFixed(1) || '0.0'}</span>
                  <span className="text-gray-400">|</span>
                  <span className="text-gray-600">
                    {product.reviewsCount || 0} review{product.reviewsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              {/* Price Section */}
              <div className="mb-6 pb-6 border-b">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-4xl font-bold">${product.price.toFixed(2)}</span>
                  {product.stock > 0 ? (
                    <span className="text-sm text-green-600 font-medium">In Stock</span>
                  ) : (
                    <span className="text-sm text-red-600 font-medium">Out of Stock</span>
                  )}
                </div>
                {product.stock > 0 && product.stock <= 10 && (
                  <div className="text-sm text-orange-600">Only {product.stock} left</div>
                )}
              </div>

              {/* Description */}
              <div className="mb-6">
                <p className="text-gray-700 text-sm leading-relaxed">{product.description}</p>
              </div>

              {/* Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="mb-6 flex gap-2">
                  {product.tags.map((tag, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Purchase Section - Only for authenticated buyers */}
              {isAuthenticated && user?.role === 'buyer' && product.stock > 0 && (
                <>
                  <div className="space-y-8 mb-6">
                    <div className="flex items-center gap-4">
                      <Label htmlFor="quantity" className="text-sm font-medium w-20">
                        Quantity:
                      </Label>
                      <div className="flex items-center border rounded">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-3 py-1.5 text-sm h-auto rounded-none"
                          onClick={() => handleQuantityChange(quantity - 1)}
                          disabled={quantity <= 1}
                        >
                          −
                        </Button>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          max={product.stock}
                          value={quantity}
                          onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                          className="w-14 text-center text-sm border-0 border-x rounded-none h-auto py-1.5"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-3 py-1.5 text-sm h-auto rounded-none"
                          onClick={() => handleQuantityChange(quantity + 1)}
                          disabled={quantity >= product.stock}
                        >
                          +
                        </Button>
                      </div>
                      <span className="text-sm text-gray-600">Max: {product.stock}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || product.stock === 0}
                        variant="outline"
                        className="py-2.5 border-2 border-gray-900 font-medium text-sm"
                      >
                        {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                      </Button>
                      <Button
                        onClick={handleBuyNow}
                        disabled={isBuyingNow || product.stock === 0}
                        className="py-2.5 bg-gray-900 text-white font-medium text-sm hover:bg-gray-800"
                      >
                        {isBuyingNow ? 'Processing...' : 'Buy Now'}
                      </Button>
                    </div>
                  </div>
                </>
              )}

              {/* Not logged in message */}
              {!isAuthenticated && product.stock > 0 && (
                <div className="mb-6">
                  <div className="py-4 text-center border border-gray-300 rounded-lg bg-gray-50">
                    <p className="text-gray-600 text-sm mb-3">
                      Please log in to purchase this product
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button asChild variant="outline" size="sm">
                        <Link href="/login">Login</Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href="/register">Sign Up</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Seller viewing message */}
              {isAuthenticated && user?.role === 'seller' && (
                <div className="mb-6">
                  <div className="py-3 px-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-blue-800 text-xs">
                      You are viewing this product as a seller. Buyers can add this to their cart.
                    </p>
                  </div>
                </div>
              )}


            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-8">
          <div className="bg-white rounded-lg border overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Reviews List - Takes up 2 columns */}
                <div className="lg:col-span-2">
                  <ReviewList reviews={reviews} stats={reviewsStats} />
                </div>

                {/* Review Form - Takes up 1 column */}
                <div className="lg:border-l lg:pl-8">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900">Write a Review</h3>
                  {isAuthenticated && user?.role === 'buyer' ? (
                    <ReviewForm
                      productId={product._id}
                      onCreated={(r) => {
                        setReviews((prev) => [r, ...prev]);
                        if (productId) fetchReviews(productId);
                      }}
                    />
                  ) : (
                    <div className="py-6 text-center border border-gray-200 rounded-lg bg-gray-50">
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
          </div>
        </div>

        {/* Back to Products */}
        <div className="mt-6">
          <Button variant="ghost" asChild className="text-sm">
            <Link href="/products">← Back to All Products</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { cartAPI, productsAPI } from '@/utils/api';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader } from '@/components/loader';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  extractProductId,
  createCartItemWithProduct,
  aggregateValidationErrors,
  calculateSubtotal,
  sumQuantities,
  sumSelectedQuantities,
} from '@/lib/fp/cart-helpers';

interface CartItemWithProduct {
  productId: string;
  quantity: number;
  product?: Product;
  selected: boolean;
}

const fetchCartItemWithProduct = async (
  item: { product?: string; productId?: string; quantity: number }
): Promise<CartItemWithProduct> => {
  const productId = extractProductId(item);

  if (!productId) {
    console.error('No product ID found for cart item:', item);
    return createCartItemWithProduct('', item.quantity);
  }

  try {
    const product = await productsAPI.getById(productId);
    return createCartItemWithProduct(productId, item.quantity, product);
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    return createCartItemWithProduct(productId, item.quantity);
  }
};

export default function CartPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = useProtectedRoute(['buyer']);

  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [removeDialog, setRemoveDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });

  useEffect(() => {
    if (!authLoading && user?.id) {
      fetchCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  const fetchCart = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { cart } = await cartAPI.getCart(user.id);

      // Fetch product details using functional transformation
      const itemsWithProducts = await Promise.all(
        cart.items.map(fetchCartItemWithProduct)
      );

      setCartItems(itemsWithProducts);

      // Validate cart
      if (cart.items.length > 0) {
        try {
          // Map cart items to validation format
          const validationItems = cart.items.map(item => {
            const itemWithProduct = item as { product?: string; productId?: string; quantity: number };
            return {
              productId: itemWithProduct.product || itemWithProduct.productId || '',
              quantity: item.quantity
            };
          });

          const validation = await cartAPI.validateCart(user.id, validationItems);
          if (validation && !validation.valid && validation.errors) {
            setValidationErrors(aggregateValidationErrors(validation.errors));
          } else {
            setValidationErrors({});
          }
        } catch (validationError) {
          console.error('Cart validation error:', validationError);
          setValidationErrors({});
        }
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    if (!user?.id || newQuantity < 1) return;

    try {
      setIsUpdating(productId);
      await cartAPI.updateQuantity(user.id, productId, newQuantity);

      // Update local state
      setCartItems((prev) =>
        prev.map((item) =>
          item.productId === productId ? { ...item, quantity: newQuantity } : item
        )
      );

      // Revalidate cart items
      const validationItems = cartItems.map(item => ({
        productId: item.productId,
        quantity: item.productId === productId ? newQuantity : item.quantity
      }));

      const validation = await cartAPI.validateCart(user.id, validationItems);
      if (validation && !validation.valid && validation.errors) {
        setValidationErrors(aggregateValidationErrors(validation.errors));
      } else {
        setValidationErrors({});
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      alert('Failed to update quantity');
    } finally {
      setIsUpdating(null);
    }
  };

  const handleRemoveItem = async () => {
    if (!user?.id || !removeDialog.productId) return;

    try {
      setIsRemoving(removeDialog.productId);
      await cartAPI.removeItem(user.id, removeDialog.productId);

      // Update local state
      setCartItems((prev) => prev.filter((item) => item.productId !== removeDialog.productId));
      setRemoveDialog({ open: false, productId: null });
    } catch (error) {
      console.error('Error removing item:', error);
      alert('Failed to remove item');
    } finally {
      setIsRemoving(null);
    }
  };

  const subtotal = calculateSubtotal(cartItems, selectedItems);
  const totalItemsCount = sumQuantities(cartItems);
  const selectedItemsQuantity = sumSelectedQuantities(cartItems, selectedItems);

  const handleCheckout = () => {
    if (Object.keys(validationErrors).length > 0) {
      alert('Please fix cart issues before proceeding to checkout');
      return;
    }
    // Pass selected item ids to checkout via query param to ensure checkout shows only selected items
    const selected = Array.from(selectedItems);
    const query = selected.length ? `?items=${selected.map(encodeURIComponent).join(',')}` : '';
    router.push(`/checkout${query}`);
  };

  const handleToggleSelection = (productId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedItems.size === cartItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(cartItems.map(item => item.productId)));
    }
  };

  if (authLoading || isLoading) {
    return <Loader />;
  }

  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Shopping Cart</h1>
          <p className="text-gray-600">Review your items and proceed to checkout</p>
        </div>

        {cartItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">Your cart is empty</p>
              <Button asChild>
                <Link href="/products">Browse Products</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {/* Select All */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="select-all"
                      checked={selectedItems.size === cartItems.length && cartItems.length > 0}
                      onCheckedChange={handleToggleSelectAll}
                    />
                    <Label htmlFor="select-all" className="font-medium cursor-pointer">
                      Select All ({cartItems.length} item{cartItems.length !== 1 ? 's' : ''})
                    </Label>
                  </div>
                </CardContent>
              </Card>

              {hasValidationErrors && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-600 font-medium mb-2">
                      ⚠️ Some items in your cart have issues:
                    </p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {Object.entries(validationErrors).map(([productId, message]) => (
                        <li key={productId}>• {message}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {cartItems.map((item) => {
                const hasError = validationErrors[item.productId];
                const isSelected = selectedItems.has(item.productId);
                return (
                  <Card key={item.productId} className={hasError ? 'border-red-200' : isSelected ? 'border-blue-300' : ''}>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Checkbox */}
                        <div className="flex items-center pt-1">
                          <Checkbox
                            id={`select-${item.productId}`}
                            checked={isSelected}
                            onCheckedChange={() => handleToggleSelection(item.productId)}
                          />
                        </div>
                        {/* Product Image */}
                        <Link href={`/products/${item.productId}`} className="shrink-0">
                          <div className="w-24 h-24 bg-gray-200 rounded overflow-hidden relative cursor-pointer hover:opacity-80 transition-opacity">
                            {item.product?.images && item.product.images.length > 0 ? (
                              <Image
                                src={item.product.images[0]}
                                alt={item.product.title}
                                fill
                                className="object-cover"
                                sizes="96px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <Link href={`/products/${item.productId}`}>
                                <h3 className="font-medium text-lg truncate hover:text-blue-600 cursor-pointer transition-colors">
                                  {item.product?.title || 'Product not found'}
                                </h3>
                              </Link>
                              {item.product?.category && (
                                <Badge variant="secondary" className="mt-1">
                                  {item.product.category}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xl font-bold text-gray-900 shrink-0">
                              ${item.product && typeof item.product.price === 'number' ? (item.product.price * item.quantity).toFixed(2) : '0.00'}
                            </p>
                          </div>

                          {hasError && (
                            <p className="text-sm text-red-600 mb-2">⚠️ {hasError}</p>
                          )}

                          {item.product && typeof item.product.price === 'number' && (
                            <>
                              <p className="text-sm text-gray-600 mb-3">
                                ${item.product.price.toFixed(2)} each
                              </p>

                              {item.product.stock > 0 && item.product.stock < item.quantity && (
                                <p className="text-sm text-orange-600 mb-2">
                                  Only {item.product.stock} available in stock
                                </p>
                              )}

                              {item.product.stock === 0 && (
                                <p className="text-sm text-red-600 mb-2">Out of stock</p>
                              )}
                            </>
                          )}

                          {/* Quantity Controls */}
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Label className="text-sm">Quantity:</Label>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                                  disabled={item.quantity <= 1 || isUpdating === item.productId}
                                >
                                  -
                                </Button>
                                <Input
                                  type="number"
                                  min="1"
                                  max={item.product?.stock || 999}
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    if (val > 0) handleUpdateQuantity(item.productId, val);
                                  }}
                                  className="w-16 text-center"
                                  disabled={isUpdating === item.productId}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                                  disabled={
                                    isUpdating === item.productId ||
                                    !item.product ||
                                    item.quantity >= (item.product.stock || 0)
                                  }
                                >
                                  +
                                </Button>
                              </div>
                            </div>

                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setRemoveDialog({ open: true, productId: item.productId })}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-4">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Items in Cart</span>
                      <span className="font-medium">{totalItemsCount}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Selected Items</span>
                      <span className="font-medium">{selectedItemsQuantity}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-900 font-medium">Subtotal</span>
                        <span className="text-2xl font-bold text-gray-900">${subtotal.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Shipping and taxes calculated at checkout</p>
                    </div>
                  </div>

                  {hasValidationErrors && (
                    <p className="text-sm text-red-600">
                      Fix cart issues before checkout
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    onClick={handleCheckout}
                    disabled={hasValidationErrors || selectedItems.size === 0}
                  >
                    {selectedItems.size === 0 ? 'Select items to checkout' : 'Proceed to Checkout'}
                  </Button>
                  <Button variant="outline" className="w-full" asChild>
                    <Link href="/products">Continue Shopping</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Remove Confirmation Dialog */}
      <Dialog
        open={removeDialog.open}
        onOpenChange={(open) => setRemoveDialog({ open, productId: null })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this item from your cart?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemoveDialog({ open: false, productId: null })}
              disabled={isRemoving !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemoveItem}
              disabled={isRemoving !== null}
            >
              {isRemoving ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { cartAPI, productsAPI, promoCodesAPI, balanceAPI } from '@/utils/api';
import { checkoutAPI } from '@/utils/api/checkout';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/navbar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader } from '@/components/loader';
import {
  extractProductId,
  createCartItemWithProduct,
  aggregateValidationErrors,
  sumQuantities,
} from '@/lib/fp/cart-helpers';
import { CheckoutPayload, PromoCode } from '@/types';
import { toast } from 'sonner';

import type { CartItemWithProduct as HelperCartItem } from '@/lib/fp/cart-helpers';
import { ApiError } from '@/lib/api';

type CartItemWithProduct = HelperCartItem;

interface CartItemInput {
  product?: string;
  productId?: string;
  quantity: number;
}

const fetchCartItemWithProduct = async (
  item: CartItemInput
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

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, user } = useProtectedRoute(['buyer']);

  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [shipping, setShipping] = useState(5.0);
  const [paymentMethod, setPaymentMethod] = useState<'balance' | 'cash_on_delivery'>('balance');
  const [shippingAddress, setShippingAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

      // get user's cart (may be used to derive quantities if selected items are already in cart)
      const { cart } = await cartAPI.getCart(user.id);
      const itemsParam = searchParams?.get('items');

      // parse items param: allow entries like `id` or `id:qty`, comma-separated
      const selectedEntries: { id: string; quantity?: number }[] = [];
      if (itemsParam) {
        itemsParam.split(',').forEach((raw) => {
          const dec = decodeURIComponent(raw.trim());
          if (!dec) return;
          const [idPart, qtyPart] = dec.split(':');
          const pid = idPart;
          const qty = qtyPart ? parseInt(qtyPart, 10) : undefined;
          if (pid) selectedEntries.push({ id: pid, quantity: Number.isFinite(qty) ? qty : undefined });
        });
      }

      // Build a map from cart items for quick lookup
      const cartMap = new Map<string, { productId: string; quantity: number }>();
      (cart.items || []).forEach((it) => {
        const pid = extractProductId(it) || '';
        if (pid) cartMap.set(pid, { productId: pid, quantity: it.quantity });
      });

      const itemsWithProducts: CartItemWithProduct[] = [];

      if (selectedEntries.length > 0) {
        // For each selected entry, prefer cart quantity if present, otherwise use provided quantity or 1
        for (const entry of selectedEntries) {
          const inCart = cartMap.get(entry.id);
          const qty = inCart ? inCart.quantity : entry.quantity ?? 1;
          // If product exists in cart, fetch product details via helper which accepts cart-like input
          if (inCart) {
            const item = await fetchCartItemWithProduct({ productId: entry.id, quantity: qty });
            itemsWithProducts.push(item);
          } else {
            // Not in cart — fetch product directly and construct item
            const item = await fetchCartItemWithProduct({ productId: entry.id, quantity: qty });
            itemsWithProducts.push(item);
          }
        }
        setCartItems(itemsWithProducts);
      } else {
        // No selection: show full cart
        const allItems = await Promise.all((cart.items || []).map(fetchCartItemWithProduct));
        setCartItems(allItems);
      }

      // Validate either the selected items or the whole cart depending on presence
      const validationItems = (selectedEntries.length > 0
        ? selectedEntries.map((e) => ({ productId: e.id, quantity: e.quantity ?? (cartMap.get(e.id)?.quantity ?? 1) }))
        : (cart.items || []).map((item) => ({ productId: extractProductId(item) || '', quantity: item.quantity }))
      ).filter((v) => v.productId);

      if (validationItems.length > 0) {
        try {
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

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, item) => {
      if (item.product?.price) return sum + item.product.price * item.quantity;
      return sum;
    }, 0);
  }, [cartItems]);

  const total = useMemo(() => Math.max(0, subtotal + shipping - discountAmount), [subtotal, shipping, discountAmount]);
  const totalItemsCount = sumQuantities(cartItems);

  const handleApplyPromo = async () => {
    if (!promoInput) return;
    try {
      const promos = await promoCodesAPI.getAll({ active: true });
      const found = promos.find(p => p.code.toLowerCase() === promoInput.trim().toLowerCase());
      if (!found) {
        toast.error('Promo code invalid');
        setAppliedPromo(null);
        setDiscountAmount(0);
        return;
      }

      let discount = 0;
      if (found.discount.kind === 'percentage' && found.discount.percent) {
        discount = (subtotal * (found.discount.percent || 0)) / 100;
      } else if (found.discount.kind === 'fixed' && found.discount.amount) {
        discount = found.discount.amount;
      } else if (found.discount.kind === 'free_shipping') {
        setShipping(0);
      }

      setAppliedPromo(found);
      setDiscountAmount(discount);
      toast.success('Promo applied');
    } catch (error) {
      console.error('Error applying promo:', error);
      toast.error('Failed to apply promo');
    }
  };

  const handleProceed = async () => {
    if (!user?.id) {
      router.push('/login');
      return;
    }

    if (Object.keys(validationErrors).length > 0) {
      toast.error('Fix cart errors before proceeding');
      return;
    }

    if (!shippingAddress || shippingAddress.length < 10) {
      toast.error('Shipping address must be at least 10 characters');
      return;
    }

    try {
      setIsProcessing(true);

      // If paying with balance, verify user balance first
      if (paymentMethod === 'balance') {
        try {
          const balanceResp = await balanceAPI.getBalance(user.id);
          if (typeof balanceResp.balance === 'number' && balanceResp.balance < total) {
            toast.error(`Insufficient balance. Your balance: $${balanceResp.balance.toFixed(2)}, total: $${total.toFixed(2)}`);
            setIsProcessing(false);
            return;
          }
        } catch (bErr) {
          console.error('Failed to fetch balance:', bErr);
          toast.error('Failed to verify balance. Please try again later.');
          setIsProcessing(false);
          return;
        }
      }

      // include selected items (if any) passed via query param so server creates order for selected items only
      const isDirectCheckout = searchParams?.get('direct') === 'true';
      const itemsParam = searchParams?.get('items');
      const items = itemsParam ? itemsParam.split(',').map((s) => decodeURIComponent(s)) : undefined;

      const payload: CheckoutPayload = {
        userId: user.id,
        paymentMethod,
        shippingAddress,
        promoCode: appliedPromo?.code,
        isDirectCheckout: isDirectCheckout,
      };
      if (items && items.length > 0) payload.items = items;

      const res = await checkoutAPI.createCheckout(payload);
      if (res && res.orderId) {
        toast.success('Order created');
        router.push('/buyer/orders');
      } else {
        toast.error('Failed to create order');
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      const apiError = error as ApiError;

      if (apiError) {
        const main = apiError.error || apiError.details || 'Checkout failed';

        let detailMessage = '';
        if (apiError.details) {
          try {
            if (typeof apiError.details === 'string') {
              detailMessage = apiError.details;
            } else if (typeof apiError.details === 'object') {
              detailMessage = JSON.stringify(apiError.details);
            } else {
              detailMessage = String(apiError.details);
            }
          } catch {
            detailMessage = String(apiError.details);
          }
        }

        toast.error(`${main}${detailMessage ? ': ' + detailMessage : ''}`);
      } else {
        const detail = error || String(error);
        toast.error('Checkout failed: ' + (detail || 'Unknown'));
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (authLoading || isLoading) return <Loader />;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <p className="text-gray-600">Review your items, apply promo codes and proceed to payment</p>
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
            <div className="lg:col-span-2 space-y-4">
              {/* No selection controls on checkout — show items only */}

              {Object.keys(validationErrors).length > 0 && (
                <Card className="border-red-200 bg-red-50">
                  <CardContent className="pt-6">
                    <p className="text-red-600 font-medium mb-2">⚠️ Cart validation errors:</p>
                    <ul className="text-sm text-red-600 space-y-1">
                      {Object.entries(validationErrors).map(([pid, msg]) => (
                        <li key={pid}>• {msg}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {cartItems.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Link href={`/products/${item.productId}`} className="shrink-0">
                        <div className="w-24 h-24 bg-gray-200 rounded overflow-hidden relative">
                          {item.product?.images && item.product.images.length > 0 ? (
                            <Image src={item.product.images[0]} alt={item.product.title} fill className="object-cover" sizes="96px" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">No image</div>
                          )}
                        </div>
                      </Link>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <Link href={`/products/${item.productId}`}>
                              <h3 className="font-medium text-lg truncate hover:text-blue-600 cursor-pointer transition-colors">{item.product?.title || 'Product not found'}</h3>
                            </Link>
                          </div>
                          <p className="text-xl font-bold text-gray-900 shrink-0">
                            ${item.product && typeof item.product.price === 'number' ? (item.product.price * item.quantity).toFixed(2) : '0.00'}
                          </p>
                        </div>

                        {item.product && typeof item.product.price === 'number' && (
                          <p className="text-sm text-gray-600">${item.product.price.toFixed(2)} each</p>
                        )}

                        <p className="mt-3">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between py-1"><span>Items</span><span>{totalItemsCount}</span></div>
                  <div className="flex justify-between py-1"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between py-1"><span>Shipping</span><span>${shipping.toFixed(2)}</span></div>
                  <div className="flex justify-between py-1"><span>Discount</span><span>-${discountAmount.toFixed(2)}</span></div>
                  <hr className="my-2" />
                  <div className="flex justify-between font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>

                  <div className="mt-4">
                    <Label className="text-sm">Promo code</Label>
                    <div className="flex gap-2 mt-2">
                      <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value)} placeholder="Enter promo code" />
                      <Button onClick={handleApplyPromo}>Apply</Button>
                    </div>
                    {appliedPromo && <p className="text-sm text-green-600 mt-2">Applied: {appliedPromo.code} — {appliedPromo.description}</p>}
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm">Shipping address</Label>
                    <Input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Street, city, postal code" />
                  </div>

                  <div className="mt-4">
                    <Label className="text-sm">Payment method</Label>
                    <div className="flex flex-col gap-2 mt-2">
                      <label className="flex items-center gap-2">
                        <input type="radio" name="pm" checked={paymentMethod === 'balance'} onChange={() => setPaymentMethod('balance')} />
                        <span className="ml-2">Balance</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name="pm" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} />
                        <span className="ml-2">Cash on delivery</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex flex-col gap-2">
                    <Button onClick={handleProceed} disabled={isProcessing}>{isProcessing ? 'Processing...' : 'Proceed to payment'}</Button>
                  </div>
                </CardFooter>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

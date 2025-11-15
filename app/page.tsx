'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuthStore } from '@/store/authStore';
import { productsAPI, promoCodesAPI } from '@/utils/api';
import { Product, PromoCode } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [productsResponse, promoResponse] = await Promise.all([
          productsAPI.getAll({ limit: 6 }),
          promoCodesAPI.getAll({ active: true }),
        ]);
        console.log('Fetched promo codes:', promoResponse);
        setProducts(productsResponse);
        setPromoCodes(promoResponse);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const categoryData = [
    {
      name: 'Electronics',
      href: '/products?category=Electronics',
      description: 'Latest gadgets, computers, and more.',
    },
    {
      name: 'Furniture',
      href: '/products?category=Furniture',
      description: 'Stylish and comfortable home pieces.',
    },
    {
      name: 'Accessories',
      href: '/products?category=Accessories',
      description: 'Tech gear and lifestyle items.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              ECommerce
            </Link>
            <nav className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, {user?.name || user?.email}
                  </span>
                  <Button asChild>
                    <Link href={`/${user?.role}/dashboard`}>Dashboard</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" asChild>
                    <Link href="/login">Login</Link>
                  </Button>
                  <Button asChild>
                    <Link href="/register">Register</Link>
                  </Button>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-black text-white">
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Welcome to Our E-Commerce Store
          </h1>
          <p className="text-xl mb-8 max-w-2xl mx-auto text-gray-300">
            Discover amazing products at great prices. Shop Electronics, Furniture, and Accessories.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-black hover:bg-gray-200">
              <Link href="/products">Shop Now</Link>
            </Button>
            <Button size="lg" variant="ghost" asChild className="border-2 border-white text-white hover:bg-white hover:text-black">
              <Link href="/register">Get Started</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12 text-black">Shop by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {categoryData.map((category) => (
            <Link key={category.name} href={category.href}>
              <Card key={category.name} className="hover:shadow-lg transition-shadow cursor-pointer bg-gray-900 border-black text-white">
                <CardHeader>
                  <CardTitle className="text-center text-xl">{category.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-gray-400">{category.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Promo Codes Section */}
      {(isLoading || (promoCodes && promoCodes.length > 0)) && (
        <section className="bg-gray-900 py-16">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-white">Active Promotions</h2>
            {isLoading ? (
              <div className="text-center">
                <p className="text-gray-400">Loading promotions...</p>
              </div>
            ) : (
              <Carousel
                opts={{
                  align: 'start',
                  loop: promoCodes.length > 3,
                }}
                className="w-full max-w-7xl mx-auto"
              >
                <CarouselContent>
                  {promoCodes.map((promo) => (
                    <CarouselItem key={promo._id} className="md:basis-1/2 lg:basis-1/3">
                      <div className="p-1">
                        <Card className="border-white bg-black text-white h-full flex flex-col">
                          <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                              <span className="text-lg font-mono">{promo.code}</span>
                              <Badge variant="default" className="bg-white text-black">
                                Active
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="grow">
                            <p className="text-2xl font-bold text-white">
                              {promo.discount.kind === 'percentage' && `${promo.discount.percent}% OFF`}
                              {promo.discount.kind === 'fixed' && `$${promo.discount.amount} OFF`}
                              {promo.discount.kind === 'free_shipping' && 'FREE SHIPPING'}
                            </p>
                            {promo.conditions && promo.conditions.length > 0 && (
                              <div className="mt-2 space-y-1">
                                {promo.conditions.find((c) => c.kind === 'min_purchase_amount') && (
                                  <p className="text-sm text-gray-400">
                                    Min. purchase: ${promo.conditions.find((c) => c.kind === 'min_purchase_amount')?.amount}
                                  </p>
                                )}
                                {promo.conditions.find((c) => c.kind === 'category_includes') && (
                                  <p className="text-sm text-gray-400">
                                    Categories: {promo.conditions.find((c) => c.kind === 'category_includes')?.categories?.join(', ')}
                                  </p>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="text-white bg-black/50 border-white hover:bg-white hover:text-black" />
                <CarouselNext className="text-white bg-black/50 border-white hover:bg-white hover:text-black" />
              </Carousel>
            )}
          </div>
        </section>
      )}

      {/* Featured Products Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-bold text-black">Featured Products</h2>
          <Button asChild variant="outline" className="border-white bg-gray-900 text-white hover:bg-white hover:text-black">
            <Link href="/products">See All Products</Link>
          </Button>
        </div>
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading products...</p>
          </div>
        ) : !products || products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product._id} className="hover:shadow-lg transition-shadow bg-gray-900 border-white text-white">
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
                  <p className="text-gray-400 text-sm line-clamp-2 mb-4">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-white">${product.price}</span>
                    <Badge variant="secondary" className="bg-white text-black">{product.category}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <span>⭐ {product.avgRating.toFixed(1)}</span>
                    <span>•</span>
                    <span>{product.reviewsCount} reviews</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    Stock: {product.stock > 0 ? `${product.stock} available` : 'Out of stock'}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full bg-white text-black hover:bg-gray-200" disabled={product.stock === 0}>
                    {product.stock > 0 ? 'Add to Cart' : 'Out of Stock'}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 E-Commerce Platform. Built with Next.js and Functional Programming.
          </p>
        </div>
      </footer>
    </div>
  );
}

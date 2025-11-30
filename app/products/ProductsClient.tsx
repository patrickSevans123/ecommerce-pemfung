"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { productsAPI } from '@/utils/api';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProductCard from '@/components/product/ProductCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FilterState, buildSearchParams } from '@/lib/fp/url-helpers';
import Navbar from '@/components/navbar';

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState(searchParams.get('category') || 'all');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [minRating, setMinRating] = useState(searchParams.get('minRating') || '');
  const [sortBy, setSortBy] = useState<'newest' | 'price-asc' | 'price-desc' | 'rating-desc'>(
    (searchParams.get('sort') as 'newest' | 'price-asc' | 'price-desc' | 'rating-desc') || 'newest'
  );
  const [inStockOnly, setInStockOnly] = useState(searchParams.get('inStock') === 'true');

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const params: {
        sort: 'newest' | 'price-asc' | 'price-desc' | 'rating-desc';
        inStock?: boolean;
        limit: number;
        q?: string;
        category?: string;
        minPrice?: number;
        maxPrice?: number;
        minRating?: number;
      } = {
        sort: sortBy,
        inStock: inStockOnly || undefined,
        limit: 50,
      };

      if (searchQuery) params.q = searchQuery;
      if (category && category !== 'all') params.category = category;
      if (minPrice) params.minPrice = parseFloat(minPrice);
      if (maxPrice) params.maxPrice = parseFloat(maxPrice);
      if (minRating) params.minRating = parseFloat(minRating);

      const data = await productsAPI.search(params);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    const filters: FilterState = {
      q: searchQuery || undefined,
      category: category !== 'all' ? category : undefined,
      minPrice: minPrice || undefined,
      maxPrice: maxPrice || undefined,
      minRating: minRating || undefined,
      inStock: inStockOnly || undefined,
      sort: sortBy,
    };

    router.push(`/products?${buildSearchParams(filters).toString()}`);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategory('all');
    setMinPrice('');
    setMaxPrice('');
    setMinRating('');
    setSortBy('newest');
    setInStockOnly(false);
    router.push('/products');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse Products</h1>
          <p className="text-gray-600">Discover amazing products for you</p>
        </div>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="Electronics">Electronics</SelectItem>
                    <SelectItem value="Furniture">Furniture</SelectItem>
                    <SelectItem value="Accessories">Accessories</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Books">Books</SelectItem>
                    <SelectItem value="Toys">Toys</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Min Price */}
              <div className="space-y-2">
                <Label htmlFor="minPrice">Min Price ($)</Label>
                <Input
                  id="minPrice"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                />
              </div>

              {/* Max Price */}
              <div className="space-y-2">
                <Label htmlFor="maxPrice">Max Price ($)</Label>
                <Input
                  id="maxPrice"
                  type="number"
                  step="0.01"
                  placeholder="999.99"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                />
              </div>

              {/* Min Rating */}
              <div className="space-y-2">
                <Label htmlFor="minRating">Min Rating</Label>
                <Select value={minRating || 'any'} onValueChange={(v) => setMinRating(v === 'any' ? '' : v)}>
                  <SelectTrigger id="minRating">
                    <SelectValue placeholder="Any Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Rating</SelectItem>
                    <SelectItem value="4">4+ Stars</SelectItem>
                    <SelectItem value="3">3+ Stars</SelectItem>
                    <SelectItem value="2">2+ Stars</SelectItem>
                    <SelectItem value="1">1+ Stars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sort and Stock */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label htmlFor="sort">Sort By</Label>
                <Select value={sortBy} onValueChange={(v: 'newest' | 'price-asc' | 'price-desc' | 'rating-desc') => setSortBy(v)}>
                  <SelectTrigger id="sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="price-asc">Price: Low to High</SelectItem>
                    <SelectItem value="price-desc">Price: High to Low</SelectItem>
                    <SelectItem value="rating-desc">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="inStock" className="cursor-pointer">
                  In Stock Only
                </Label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleSearch} className="flex-1">
                Apply Filters
              </Button>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-600 mb-4">No products found matching your criteria.</p>
              <Button variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
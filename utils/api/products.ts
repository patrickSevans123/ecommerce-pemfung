import { Product } from '@/types';
import { fetchAPI } from './fetcher';

export const productsAPI = {
  getAll: (params?: {
    category?: string;
    limit?: number;
  }): Promise<Product[]> => {
    const queryParams = new URLSearchParams();
    if (params?.category) queryParams.append('category', params.category);
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return fetchAPI<Product[]>(`/products/search${query ? `?${query}` : ''}`);
  },

  search: (params?: {
    q?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    inStock?: boolean;
    sort?: 'price-asc' | 'price-desc' | 'rating-desc' | 'newest';
    limit?: number;
    skip?: number;
  }): Promise<Product[]> => {
    const queryParams = new URLSearchParams();
    if (params?.q) queryParams.append('q', params.q);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.minPrice !== undefined) queryParams.append('minPrice', params.minPrice.toString());
    if (params?.maxPrice !== undefined) queryParams.append('maxPrice', params.maxPrice.toString());
    if (params?.minRating !== undefined) queryParams.append('minRating', params.minRating.toString());
    if (params?.inStock !== undefined) queryParams.append('inStock', params.inStock.toString());
    if (params?.sort) queryParams.append('sort', params.sort);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.skip) queryParams.append('skip', params.skip.toString());

    const query = queryParams.toString();
    return fetchAPI<Product[]>(`/products/search${query ? `?${query}` : ''}`);
  },

  getById: (id: string): Promise<Product> => {
    return fetchAPI<Product>(`/products/${id}`);
  },

  getBySeller: (token: string, sellerId: string): Promise<Product[]> => {
    return fetchAPI<Product[]>(`/products?seller=${sellerId}`, { token });
  },

  create: (
    token: string,
    data: {
      title: string;
      description: string;
      price: number;
      category: string;
      images: string[];
      stock: number;
      seller: string;
      tags: string[];
    }
  ): Promise<Product> => {
    return fetchAPI<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  },

  update: (
    token: string,
    id: string,
    data: {
      title?: string;
      description?: string;
      price?: number;
      category?: string;
      images?: string[];
      stock?: number;
      tags?: string[];
    }
  ): Promise<Product> => {
    return fetchAPI<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      token,
    });
  },

  delete: (token: string, id: string): Promise<{ message: string }> => {
    return fetchAPI<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};
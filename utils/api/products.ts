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
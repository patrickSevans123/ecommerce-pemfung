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
};
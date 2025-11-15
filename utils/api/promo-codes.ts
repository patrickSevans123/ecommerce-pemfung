import { PromoCode } from '@/types';
import { fetchAPI } from './fetcher';

export const promoCodesAPI = {
  getAll: (params?: {
    active?: boolean;
  }): Promise<PromoCode[]> => {
    const queryParams = new URLSearchParams();
    if (params?.active !== undefined)
      queryParams.append('active', params.active.toString());

    const query = queryParams.toString();
    return fetchAPI<PromoCode[]>(`/promo-codes${query ? `?${query}` : ''}`);
  },
};
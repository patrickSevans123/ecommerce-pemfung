import { NotificationsResponse } from '@/types/api';
import { fetchAPI } from './fetcher';

export const notificationsAPI = {
  getForUser: (userId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<NotificationsResponse> => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return fetchAPI<NotificationsResponse>(`/notifications/${userId}${query ? `?${query}` : ''}`);
  },

  getForSeller: (sellerId: string, params?: {
    limit?: number;
    offset?: number;
  }): Promise<NotificationsResponse> => {
    const queryParams = new URLSearchParams();
    queryParams.append('sellerId', sellerId);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const query = queryParams.toString();
    return fetchAPI<NotificationsResponse>(`/notifications/seller-notifications?${query}`);
  },
};
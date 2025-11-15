import { AuthResponse } from '@/types';
import { fetchAPI } from './fetcher';

export const authAPI = {
  register: (credentials: {
    email: string;
    name: string;
    password: string;
    role: 'seller' | 'buyer';
  }): Promise<AuthResponse> => {
    return fetchAPI<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  login: (credentials: {
    email: string;
    password: string;
  }): Promise<AuthResponse> => {
    return fetchAPI<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },
};
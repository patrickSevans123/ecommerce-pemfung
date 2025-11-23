"use client";

import { useAuthStore } from '@/store/authStore';
import BuyerNavbar from './buyer-navbar';
import SellerNavbar from './seller-navbar';

export default function Navbar() {
  const { isAuthenticated, user } = useAuthStore();

  if (isAuthenticated && user?.role === 'seller') {
    return <SellerNavbar />;
  }

  return <BuyerNavbar />;
}

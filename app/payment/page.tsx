"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Payment page disabled — payment should be performed/verified on checkout.
export default function PaymentPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to checkout (or buyer dashboard) if someone visits /payment
    router.replace('/checkout');
  }, [router]);

  return null;
}

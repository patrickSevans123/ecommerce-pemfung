"use client";

import React from 'react';
import Navbar from '@/components/navbar';
import SellerAnalyticsClient from './SellerAnalyticsClient';

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <SellerAnalyticsClient />
    </div>
  );
}

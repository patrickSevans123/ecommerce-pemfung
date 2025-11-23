import React, { Suspense } from 'react';
import ProductsClient from './ProductsClient';

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ProductsClient />
    </Suspense>
  );
}

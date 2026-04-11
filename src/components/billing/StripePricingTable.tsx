'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { getSupabaseClient } from '@/lib/supabase/client';

export default function StripePricingTable() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  if (!user) return (
    <div className="flex items-center justify-center p-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  );

  return (
    <div className="w-full bg-transparent rounded-3xl overflow-hidden">
      <Script 
        src="https://js.stripe.com/v3/pricing-table.js" 
        strategy="lazyOnload" 
      />
      
      {/* 
        Usamos React.createElement para instanciar o componente customizado do Stripe.
        O cast 'as any' garante que o TS não valide propriedades do elemento string.
      */}
      {React.createElement('stripe-pricing-table' as any, {
        'pricing-table-id': "prctbl_1TL9g8iUeqXANSvNMFQv9ix",
        'publishable-key': "pk_test_51TL8jy8iUeqXANSvjIom0nEX50EKm38wuEf6QKQnxvc3B0lqFrRGy8gav0dnfyyu5mJp9axqZry1UC0Fu49KsbSq00qBkEkpqp",
        'client-reference-id': user.id,
        'customer-email': user.email
      })}
    </div>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Script from 'next/script';
import { getSupabaseClient } from '@/lib/supabase/client';

// Tipagem global para suporte ao TypeScript e documentação
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'pricing-table-id': string;
        'publishable-key': string;
        'client-reference-id'?: string;
        'customer-email'?: string;
      };
    }
  }
}

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
        Isso evita erros de validação JSX.IntrinsicElements no IDE e no Build da Vercel,
        mantendo a compatibilidade total com o Web Component do Stripe.
      */}
      {React.createElement('stripe-pricing-table', {
        'pricing-table-id': "prctbl_1TL9g8iUeqXANSvNMFQv9ix",
        'publishable-key': "pk_test_51TL8jy8iUeqXANSvjIom0nEX50EKm38wuEf6QKQnxvc3B0lqFrRGy8gav0dnfyyu5mJp9axqZry1UC0Fu49KsbSq00qBkEkpqp",
        'client-reference-id': user.id,
        'customer-email': user.email
      })}
    </div>
  );
}

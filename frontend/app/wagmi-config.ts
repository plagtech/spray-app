'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, optimism, arbitrum, polygon } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Spray - Batch Payments',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [base, optimism, arbitrum, polygon],
  ssr: true,
});

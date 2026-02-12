'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, optimism, arbitrum, polygon, plasma } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Spraay - Batch Payments',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [base, plasma, optimism, arbitrum, polygon],
  ssr: true,
});
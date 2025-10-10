"use client";

import React from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, darkTheme, getDefaultWallets, Chain } from '@rainbow-me/rainbowkit';
import { supportedChains, pushChainDonut } from '../config/chains';
import { mainnet, polygon, bsc, arbitrum, optimism, sepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// Get RPC URLs from environment
const PUSH_CHAIN_RPC_URL = process.env.NEXT_PUBLIC_PUSH_CHAIN_RPC_URL || 'https://evm.rpc-testnet-donut-node1.push.org/';
const ETHEREUM_SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL || 'https://1rpc.io/sepolia';
const ETHEREUM_RPC_URL = process.env.ETHEREUM_RPC_URL || 'https://eth.llamarpc.com';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com';
const BSC_RPC_URL = process.env.BSC_RPC_URL || 'https://bsc.llamarpc.com';
const ARBITRUM_RPC_URL = process.env.ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc';
const OPTIMISM_RPC_URL = process.env.OPTIMISM_RPC_URL || 'https://mainnet.optimism.io';

const { connectors } = getDefaultWallets({
  appName: 'Push Name Service - Universal .push Domains',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '226b43b703188d269fb70d02c107c34e',
});

// Create wagmi config with only Push Chain Donut and Ethereum Sepolia
const config = createConfig({
  chains: [pushChainDonut, sepolia] as readonly [Chain, ...Chain[]],
  connectors,
  transports: {
    [pushChainDonut.id]: http(PUSH_CHAIN_RPC_URL, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
    [sepolia.id]: http(ETHEREUM_SEPOLIA_RPC_URL, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  ssr: false,
  multiInjectedProviderDiscovery: false,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (cacheTime is deprecated, use gcTime)
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Custom theme for Push Protocol branding
const customTheme = darkTheme({
  accentColor: '#DD44C7', // Push Protocol pink
  accentColorForeground: 'white',
  borderRadius: 'medium',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function RainbowProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={false}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={customTheme}
          modalSize="wide"
          showRecentTransactions={true}
          coolMode={true}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}



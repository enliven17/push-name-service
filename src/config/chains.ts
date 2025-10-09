import { Chain } from 'wagmi/chains'
import { mainnet, polygon, bsc, arbitrum, optimism, sepolia } from 'wagmi/chains'

// Push Chain Donut Testnet
export const pushChainDonut: Chain = {
  id: 42101,
  name: 'Push Chain Donut Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Push Token',
    symbol: 'PC',
  },
  rpcUrls: {
    default: {
      http: ['https://evm.rpc-testnet-donut-node1.push.org/'],
    },
    public: {
      http: ['https://evm.rpc-testnet-donut-node1.push.org/', 'https://evm.rpc-testnet-donut-node2.push.org/'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Push Chain Explorer',
      url: 'https://donut.push.network',
    },
  },
  testnet: true,
}

// Push Protocol supported chains (including testnet for development)
export const pushSupportedChains = [pushChainDonut, sepolia, polygon, bsc, arbitrum, optimism] as const

export const supportedChains = pushSupportedChains

// Chain configurations for Push Name Service
export const chainConfigs = {
  [pushChainDonut.id]: {
    name: 'Push Chain Donut',
    shortName: 'PC',
    color: '#E91E63',
    registrationPrice: '1.0', // 1 PC (1 ETH = 1000 PC ratio)
    transferFee: '0.0001',
    listingFee: '0.0001',
    currency: 'PC',
    isPushHub: true, // Push Chain is the main hub
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'] as ChainFeature[],
  },
  [sepolia.id]: {
    name: 'Ethereum Sepolia',
    shortName: 'ETH',
    color: '#627EEA',
    registrationPrice: '0.001', // 0.001 ETH (1 ETH = 1000 PC ratio)
    transferFee: '0.0002',
    listingFee: '0.0002',
    currency: 'ETH',
    isPushHub: false,
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'],
  },
  [mainnet.id]: {
    name: 'Ethereum',
    shortName: 'ETH',
    color: '#627EEA',
    registrationPrice: '0.002', // Higher price for Ethereum mainnet
    transferFee: '0.0002',
    listingFee: '0.0002',
    currency: 'ETH',
    isPushHub: false, // Push Chain is now the main hub
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'],
  },
  [polygon.id]: {
    name: 'Polygon',
    shortName: 'MATIC',
    color: '#8247E5',
    registrationPrice: '0.001',
    transferFee: '0.0001',
    listingFee: '0.0001',
    currency: 'MATIC',
    isPushHub: false,
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'],
  },
  [bsc.id]: {
    name: 'BSC',
    shortName: 'BNB',
    color: '#F3BA2F',
    registrationPrice: '0.001',
    transferFee: '0.0001',
    listingFee: '0.0001',
    currency: 'BNB',
    isPushHub: false,
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'],
  },
  [arbitrum.id]: {
    name: 'Arbitrum',
    shortName: 'ARB',
    color: '#28A0F0',
    registrationPrice: '0.001',
    transferFee: '0.0001',
    listingFee: '0.0001',
    currency: 'ETH',
    isPushHub: false,
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'],
  },
  [optimism.id]: {
    name: 'Optimism',
    shortName: 'OP',
    color: '#FF0420',
    registrationPrice: '0.001',
    transferFee: '0.0001',
    listingFee: '0.0001',
    currency: 'ETH',
    isPushHub: false,
    features: ['registration', 'transfer', 'marketplace', 'crosschain', 'push-notifications'],
  },
} as const

// Push Protocol contract addresses by chain
export const pushProtocolAddresses = {
  [pushChainDonut.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS || '',
    universalExecutorFactory: process.env.NEXT_PUBLIC_PUSH_UNIVERSAL_EXECUTOR_FACTORY || '0x00000000000000000000000000000000000000eA',
    universalVerificationPrecompile: process.env.NEXT_PUBLIC_PUSH_UNIVERSAL_VERIFICATION_PRECOMPILE || '0x00000000000000000000000000000000000000ca',
  },
  [sepolia.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CORE_CONTRACT_ETH || '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE',
    gateway: process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_GATEWAY || '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A',
    communicator: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  },
  [mainnet.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CORE_CONTRACT_ETH || '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE',
    communicator: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  },
  [polygon.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CORE_CONTRACT_POLYGON || '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE',
    communicator: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  },
  [bsc.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CORE_CONTRACT_BSC || '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE',
    communicator: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  },
  [arbitrum.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CORE_CONTRACT_ARBITRUM || '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE',
    communicator: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  },
  [optimism.id]: {
    core: process.env.NEXT_PUBLIC_PUSH_CORE_CONTRACT_ARBITRUM || '0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE', // Same as Arbitrum for now
    communicator: '0xb3971BCef2D791bc4027BbfedFb47319A4AAaaAa',
  },
} as const

// Push Name Service contract addresses by chain
export const contractAddresses = {
  [pushChainDonut.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS || '', // Same contract handles marketplace
  },
  [sepolia.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_ETH || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_ETH || '',
  },
  [mainnet.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_ETH || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_ETH || '', // Same contract handles marketplace
  },
  [polygon.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_POLYGON || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_POLYGON || '',
  },
  [bsc.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_BSC || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_BSC || '',
  },
  [arbitrum.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_ARBITRUM || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_ARBITRUM || '',
  },
  [optimism.id]: {
    nameService: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_OPTIMISM || '',
    marketplace: process.env.NEXT_PUBLIC_PUSH_NAME_SERVICE_OPTIMISM || '',
  },
} as const

// Cross-chain route configurations using Push Protocol
export const crossChainRoutes = {
  // Push Chain routes (main hub)
  [`${pushChainDonut.id}-${sepolia.id}`]: {
    estimatedTime: '1-3 minutes',
    fee: '0.0001 PC',
    steps: ['Lock on Push Chain', 'Universal Gateway', 'Mint on Ethereum Sepolia'],
  },
  [`${pushChainDonut.id}-${polygon.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0001 PC',
    steps: ['Lock on Push Chain', 'Universal Gateway', 'Mint on Polygon'],
  },
  [`${pushChainDonut.id}-${bsc.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0001 PC',
    steps: ['Lock on Push Chain', 'Universal Gateway', 'Mint on BSC'],
  },
  [`${pushChainDonut.id}-${arbitrum.id}`]: {
    estimatedTime: '1-3 minutes',
    fee: '0.0001 PC',
    steps: ['Lock on Push Chain', 'Universal Gateway', 'Mint on Arbitrum'],
  },
  [`${pushChainDonut.id}-${optimism.id}`]: {
    estimatedTime: '1-3 minutes',
    fee: '0.0001 PC',
    steps: ['Lock on Push Chain', 'Universal Gateway', 'Mint on Optimism'],
  },
  
  // Ethereum Sepolia routes
  [`${sepolia.id}-${pushChainDonut.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Ethereum Sepolia', 'Push Gateway', 'Mint on Push Chain'],
  },
  
  // Ethereum routes (via Push Chain)
  [`${mainnet.id}-${polygon.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Ethereum', 'Push Chain relay', 'Mint on Polygon'],
  },
  [`${mainnet.id}-${bsc.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Ethereum', 'Push Protocol relay', 'Mint on BSC'],
  },
  [`${mainnet.id}-${arbitrum.id}`]: {
    estimatedTime: '1-3 minutes',
    fee: '0.0001 ETH',
    steps: ['Lock on Ethereum', 'Push Protocol relay', 'Mint on Arbitrum'],
  },
  [`${mainnet.id}-${optimism.id}`]: {
    estimatedTime: '1-3 minutes',
    fee: '0.0001 ETH',
    steps: ['Lock on Ethereum', 'Push Protocol relay', 'Mint on Optimism'],
  },
  
  // Polygon routes
  [`${polygon.id}-${mainnet.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.1 MATIC',
    steps: ['Lock on Polygon', 'Push Protocol relay', 'Mint on Ethereum'],
  },
  [`${polygon.id}-${bsc.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.1 MATIC',
    steps: ['Lock on Polygon', 'Push Protocol relay', 'Mint on BSC'],
  },
  [`${polygon.id}-${arbitrum.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.1 MATIC',
    steps: ['Lock on Polygon', 'Push Protocol relay', 'Mint on Arbitrum'],
  },
  [`${polygon.id}-${optimism.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.1 MATIC',
    steps: ['Lock on Polygon', 'Push Protocol relay', 'Mint on Optimism'],
  },
  
  // BSC routes
  [`${bsc.id}-${mainnet.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.001 BNB',
    steps: ['Lock on BSC', 'Push Protocol relay', 'Mint on Ethereum'],
  },
  [`${bsc.id}-${polygon.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.001 BNB',
    steps: ['Lock on BSC', 'Push Protocol relay', 'Mint on Polygon'],
  },
  [`${bsc.id}-${arbitrum.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.001 BNB',
    steps: ['Lock on BSC', 'Push Protocol relay', 'Mint on Arbitrum'],
  },
  [`${bsc.id}-${optimism.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.001 BNB',
    steps: ['Lock on BSC', 'Push Protocol relay', 'Mint on Optimism'],
  },
  
  // Arbitrum routes
  [`${arbitrum.id}-${mainnet.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0001 ETH',
    steps: ['Lock on Arbitrum', 'Push Protocol relay', 'Mint on Ethereum'],
  },
  [`${arbitrum.id}-${polygon.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Arbitrum', 'Push Protocol relay', 'Mint on Polygon'],
  },
  [`${arbitrum.id}-${bsc.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Arbitrum', 'Push Protocol relay', 'Mint on BSC'],
  },
  [`${arbitrum.id}-${optimism.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0001 ETH',
    steps: ['Lock on Arbitrum', 'Push Protocol relay', 'Mint on Optimism'],
  },
  
  // Optimism routes
  [`${optimism.id}-${mainnet.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0001 ETH',
    steps: ['Lock on Optimism', 'Push Protocol relay', 'Mint on Ethereum'],
  },
  [`${optimism.id}-${polygon.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Optimism', 'Push Protocol relay', 'Mint on Polygon'],
  },
  [`${optimism.id}-${bsc.id}`]: {
    estimatedTime: '3-7 minutes',
    fee: '0.0002 ETH',
    steps: ['Lock on Optimism', 'Push Protocol relay', 'Mint on BSC'],
  },
  [`${optimism.id}-${arbitrum.id}`]: {
    estimatedTime: '2-5 minutes',
    fee: '0.0001 ETH',
    steps: ['Lock on Optimism', 'Push Protocol relay', 'Mint on Arbitrum'],
  },
} as const

// Utility functions
export const getChainConfig = (chainId: number) => {
  return chainConfigs[chainId as keyof typeof chainConfigs]
}

export const getContractAddresses = (chainId: number) => {
  return contractAddresses[chainId as keyof typeof contractAddresses]
}

export const getPushProtocolAddresses = (chainId: number) => {
  return pushProtocolAddresses[chainId as keyof typeof pushProtocolAddresses]
}

export const isChainSupported = (chainId: number) => {
  return chainId in chainConfigs
}

export const isPushSupportedChain = (chainId: number) => {
  return chainId in pushProtocolAddresses
}

export const isCrossChainSupported = (fromChainId: number, toChainId: number) => {
  const routeKey = `${fromChainId}-${toChainId}`
  return routeKey in crossChainRoutes
}

export const getCrossChainRoute = (fromChainId: number, toChainId: number) => {
  const routeKey = `${fromChainId}-${toChainId}`
  return crossChainRoutes[routeKey as keyof typeof crossChainRoutes]
}

export const getExplorerUrl = (chainId: number, txHash: string) => {
  const chain = supportedChains.find(c => c.id === chainId)
  if (!chain || !chain.blockExplorers?.default?.url) return ''
  return `${chain.blockExplorers.default.url}/tx/${txHash}`
}

export const getAddressUrl = (chainId: number, address: string) => {
  const chain = supportedChains.find(c => c.id === chainId)
  if (!chain || !chain.blockExplorers?.default?.url) return ''
  return `${chain.blockExplorers.default.url}/address/${address}`
}

// Get all Push supported chain IDs
export const getPushSupportedChainIds = () => {
  return Object.keys(chainConfigs)
    .map(Number)
    .filter(chainId => isPushSupportedChain(chainId))
}

// Define supported features type
export type ChainFeature = 'registration' | 'transfer' | 'marketplace' | 'crosschain' | 'push-notifications'

// Check if chain supports specific Push features
export const chainSupportsFeature = (chainId: number, feature: ChainFeature) => {
  const config = getChainConfig(chainId)
  return config?.features.includes(feature) || false
}

// Get domain extension for the service
export const getDomainExtension = () => '.push'

// Format domain name with extension
export const formatDomainName = (name: string) => `${name}${getDomainExtension()}`

// Validate domain name format
export const isValidDomainName = (name: string) => {
  // Remove .push extension if present
  const cleanName = name.replace(/\.push$/, '')
  
  // Check length (3-63 characters)
  if (cleanName.length < 3 || cleanName.length > 63) return false
  
  // Check format: only lowercase letters, numbers, and hyphens (not at start/end)
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
  return domainRegex.test(cleanName)
}
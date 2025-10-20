# Push Universal Name Service

Universal .push domains powered by Push Protocol for cross-chain Web3 identity and communication.

![Push Name Service](https://img.shields.io/badge/Push-Protocol-E91E63?style=for-the-badge&logo=ethereum&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)

## Features

- **Universal Domains**: Register .push domains that work across multiple blockchains
- **Cross-Chain Transfers**: Move your domains between supported networks using Universal Signer
- **Push Notifications**: Built-in notification system for domain events
- **Marketplace**: Buy and sell domains with integrated marketplace
- **Gasless Registration**: Register domains from Ethereum Sepolia without gas fees
- **Explorer Integration**: View transactions on both Ethereum and Push Chain explorers

## Supported Networks

### Testnet (Current)
- **Push Chain Donut Testnet** (Primary) - Chain ID: 42101
- **Ethereum Sepolia** (Bridge Support) - Chain ID: 11155111

### Mainnet (Planned)
- Ethereum Mainnet
- Polygon
- BSC (Binance Smart Chain)
- Arbitrum
- Optimism

## Contract Addresses

### Push Chain Donut Testnet (42101)
```
Push Name Service Contract: 0x20Dc18392a7310962dad45FC7ba272F86F2CB197
Universal Executor Factory: 0x00000000000000000000000000000000000000eA
Universal Verification Precompile: 0x00000000000000000000000000000000000000ca
```

### Ethereum Sepolia (11155111)
```
EthBridge Contract: 0xf74d5BB4be74715e692ac32b35d631d6b9a8fC49
Ethereum Sepolia Gateway: 0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A
```

### Treasury & Management
```
Treasury Address: 0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123
Universal Signer: 0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123
```

## Quick Start

### 1. Setup MetaMask

Add Push Chain Donut Testnet to MetaMask:

```
Network Name: Push Chain Donut Testnet
RPC URL: https://evm.rpc-testnet-donut-node1.push.org/
Chain ID: 42101
Currency Symbol: PC
Block Explorer: https://donut.push.network
```

### 2. Get Test Tokens

Visit the [Push Faucet](https://faucet.push.org/) to get test PC tokens.

### 3. Register Your Domain

1. **Direct Registration (Push Chain)**:
   - Connect wallet to Push Chain Donut
   - Search for available domain
   - Pay 1.0 PC + gas fees
   - Domain registered instantly

2. **Gasless Registration (Ethereum Sepolia)**:
   - Connect wallet to Ethereum Sepolia
   - Pay 0.001 ETH (no gas fees for registration)
   - Sign authorization message
   - Domain registered on Push Chain via Universal Signer

## Architecture Overview

### Universal Bridge System
The system supports operations from both Push Chain and Ethereum Sepolia:

- **Push Chain**: Direct execution with PC tokens
- **Ethereum Sepolia**: Bridge execution via EthBridge contract and Universal Signer

### Registration Methods

#### Direct Registration (Push Chain)
```solidity
function register(string calldata name, bool makeUniversal) external payable
```

#### Gasless Registration (Ethereum Sepolia)
```solidity
function requestDomainRegistration(string calldata domainName) external payable
```

### Transfer Operations

#### Direct Transfer (Push Chain)
```solidity
function transfer(string calldata name, address to) external
```

#### Bridge Transfer (Ethereum Sepolia)
```solidity
function requestDomainTransfer(
    string calldata domainName, 
    address toAddress, 
    uint256 targetChainId
) external payable
```

### Marketplace Operations

#### Direct Listing (Push Chain)
```solidity
function listDomain(string calldata name, uint256 price) external
```

#### Bridge Listing (Ethereum Sepolia)
```solidity
function requestMarketplaceListing(
    string calldata domainName, 
    uint256 priceETH
) external payable
```

## Fee Structure

### Push Chain Donut (Direct)
- Registration: 1.0 PC
- Transfer: 0.0001 PC
- Listing: Free
- Gas: Very low (< 0.001 PC)

### Ethereum Sepolia (Bridge)
- Registration: 0.001 ETH
- Transfer: 0.0002 ETH
- Listing: 0.0002 ETH
- Gas: User pays for bridge transaction only

## Development

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/push-name-service
cd push-name-service

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run development server
npm run dev
```

### Environment Variables

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Contract Addresses
NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS=0x20Dc18392a7310962dad45FC7ba272F86F2CB197
NEXT_PUBLIC_ETH_BRIDGE_ADDRESS=0xf74d5BB4be74715e692ac32b35d631d6b9a8fC49

# Network Configuration
NEXT_PUBLIC_PUSH_CHAIN_RPC_URL=https://evm.rpc-testnet-donut-node1.push.org/
NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL=https://1rpc.io/sepolia

# Push Protocol
NEXT_PUBLIC_PUSH_ENV=staging
```

### Project Structure

```
src/
├── app/                    # Next.js app router
├── components/             # React components
│   ├── PushNameService.tsx # Main registration component
│   ├── DomainTransfer.tsx  # Transfer functionality
│   ├── MarketplaceListings.tsx # Marketplace
│   └── RegistrationSuccessModal.tsx # Success modal
├── hooks/                  # Custom React hooks
│   └── useGaslessRegistration.ts # Gasless registration logic
├── lib/                    # Utility libraries
│   ├── universalSigner.ts  # Universal Signer service
│   ├── pushProtocol.ts     # Push Protocol integration
│   └── supabase.ts         # Database client
├── contracts/              # Smart contracts
│   ├── EthBridge.sol       # Ethereum bridge contract
│   └── PushUniversalNameService.sol # Main contract
└── config/                 # Configuration files
    └── chains.ts           # Network configurations
```

## API Endpoints

### Gasless Registration
```
POST /api/gasless-register
```

Request body:
```json
{
  "domainName": "example",
  "userAddress": "0x...",
  "signature": "0x...",
  "message": "Register domain: example.push...",
  "nonce": "1234567890",
  "feeTransferTxHash": "0x..."
}
```

## Testing

### Run Tests
```bash
# Run contract tests
npm run test:contracts

# Run integration tests
npm run test:integration

# Test gasless registration
node scripts/test-gasless-registration.js

# Test universal signer
node scripts/test-universal-signer.js
```

### Test Scenarios
- Domain registration (direct and gasless)
- Domain transfers (same-chain and cross-chain)
- Marketplace operations (listing, purchasing)
- Universal Signer functionality
- Database synchronization

## Deployment

### Contract Deployment
```bash
# Deploy to Push Chain Donut
npm run deploy:push-chain

# Deploy to Ethereum Sepolia
npm run deploy:ethereum-sepolia

# Verify contracts
npm run verify:contracts
```

### Frontend Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel deploy

# Or deploy to other platforms
npm run export
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write comprehensive tests
- Update documentation for new features
- Ensure cross-browser compatibility
- Test on both supported networks

## Security

### Audit Status
- Smart contracts: Pending audit
- Frontend: Security review completed
- Database: RLS policies implemented

### Security Features
- Multi-signature treasury management
- Rate limiting on API endpoints
- Input validation and sanitization
- Secure signature verification
- Protected database operations

## Roadmap

### Phase 1 (Current)
- ✅ Basic domain registration
- ✅ Universal Signer integration
- ✅ Gasless registration
- ✅ Marketplace functionality
- ✅ Cross-chain transfers


### Community
- [Discord](https://discord.gg/pushprotocol)
- [Telegram](https://t.me/pushprotocol)
- [Twitter](https://twitter.com/pushprotocol)

### Issues
- Report bugs: [GitHub Issues](https://github.com/your-org/push-name-service/issues)
- Feature requests: [GitHub Discussions](https://github.com/your-org/push-name-service/discussions)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Push Protocol](https://push.org/) for the underlying infrastructure
- [Ethereum Foundation](https://ethereum.org/) for Ethereum support
- [Next.js](https://nextjs.org/) for the frontend framework
- [Supabase](https://supabase.com/) for database services

*Built with ❤️ for the Push Protocol ecosystem and the decentralized web.*
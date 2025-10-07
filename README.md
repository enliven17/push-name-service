# 🚀 Push Name Service

Universal .push domains powered by Push Protocol for cross-chain Web3 identity and communication.

![Push Name Service](https://img.shields.io/badge/Push-Protocol-E91E63?style=for-the-badge&logo=ethereum&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white)

## 🌟 Features

- **Universal Domains**: Register .push domains that work across multiple blockchains
- **Cross-Chain Transfers**: Move your domains between supported networks
- **Push Notifications**: Built-in notification system for domain events
- **IPFS Integration**: Host decentralized websites on your .push domain
- **DNS Records**: Traditional DNS functionality (A, CNAME, TXT records)
- **Marketplace**: Buy and sell domains in the integrated marketplace

## 🍩 Supported Networks

### Testnet (Current)
- **Push Chain Donut Testnet** (Main Hub) - Chain ID: 42101
- **Ethereum Sepolia** - Chain ID: 11155111

### Mainnet (Coming Soon)
- Ethereum Mainnet
- Polygon
- BSC (Binance Smart Chain)
- Arbitrum
- Optimism

## 🚀 Quick Start

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

1. Visit [Push Name Service](https://push-name-service.vercel.app)
2. Connect your wallet
3. Search for your desired domain name
4. Choose "Universal Domain" for cross-chain functionality
5. Pay 0.001 PC and register!

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or compatible wallet

### Installation

```bash
git clone https://github.com/push-protocol/push-name-service
cd push-name-service
npm install --legacy-peer-deps
```

### Environment Setup

Create a `.env.local` file:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Push Protocol
NEXT_PUBLIC_PUSH_ENV=staging
NEXT_PUBLIC_PUSH_CHAIN_RPC_URL=https://evm.rpc-testnet-donut-node1.push.org/

# Wallet Connect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploy Smart Contracts

```bash
# Deploy to Push Chain Donut Testnet
npm run deploy:push-chain

# Deploy to Ethereum Sepolia
npm run deploy:ethereum-sepolia

# Deploy to all testnets
npm run deploy:testnet
```

## 📚 Documentation

- [Complete User Guide](./docs/PUSH_NAME_SERVICE_GUIDE.md)
- [Quick Start Guide](./docs/QUICK_START.md)
- [Smart Contract Documentation](./contracts/)
- [API Reference](./docs/API.md)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Push Chain    │
│   (Next.js)     │◄──►│   Contracts     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│   Supabase      │    │ Push Protocol   │
│   Database      │    │   Network       │
└─────────────────┘    └─────────────────┘
```

### Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS
- **Blockchain**: Solidity, Hardhat, ethers.js
- **Database**: Supabase (PostgreSQL)
- **Wallet**: RainbowKit, wagmi
- **Notifications**: Push Protocol SDK

## 🔧 Smart Contracts

### PushUniversalNameService.sol

Main contract for domain registration and management:

```solidity
function register(string calldata name, bool makeUniversal) external payable
function crossChainTransfer(string calldata name, address to, uint256 targetChainId) external payable
function setRecord(string calldata name, string calldata recordType, string calldata value) external
```

### Deployed Addresses

#### Push Chain Donut Testnet
- **Name Service**: `TBD`
- **Universal Executor Factory**: `0x00000000000000000000000000000000000000eA`

#### Ethereum Sepolia
- **Name Service**: `TBD`
- **Gateway**: `0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A`

## 🎯 Use Cases

### 1. Web3 Identity
```
alice.push → 0x1234...5678 (wallet address)
```

### 2. Decentralized Websites
```
https://alice.push → IPFS-hosted website
```

### 3. Cross-Chain Payments
```javascript
// Send tokens to a .push domain
send(100, "alice.push")
```

### 4. Push Notifications
```javascript
// Notify domain owner
pushProtocol.notify("alice.push", "Payment received!")
```

## 🛣️ Roadmap

### Phase 1: Testnet ✅
- [x] Push Chain Donut Testnet integration
- [x] Basic domain registration
- [x] Universal domain support
- [x] Cross-chain transfers

### Phase 2: Mainnet 🔄
- [ ] Ethereum Mainnet deployment
- [ ] Multi-chain support (Polygon, BSC, Arbitrum)
- [ ] Security audit
- [ ] Production launch

### Phase 3: Advanced Features 📅
- [ ] Subdomain support
- [ ] ENS integration
- [ ] Mobile app
- [ ] Advanced DNS features

### Phase 4: Ecosystem 🚀
- [ ] Developer SDK
- [ ] Browser extension
- [ ] DeFi integrations
- [ ] Social features

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🔗 Links

- **Website**: https://push-name-service.vercel.app
- **Push Protocol**: https://push.org
- **Documentation**: https://docs.push.org
- **Discord**: https://discord.gg/pushprotocol
- **Twitter**: [@pushprotocol](https://twitter.com/pushprotocol)

## 🙏 Acknowledgments

- [Push Protocol](https://push.org) for the amazing cross-chain infrastructure
- [Ethereum](https://ethereum.org) for the foundational blockchain technology
- [Next.js](https://nextjs.org) for the excellent React framework
- [Supabase](https://supabase.com) for the backend infrastructure

---

**Built with ❤️ by the Push Protocol community**

*Universal .push domains for the decentralized web* 🌐
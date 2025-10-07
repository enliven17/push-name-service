require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  defaultNetwork: process.env.NETWORK || "pushChainDonut",
  networks: {
    // Push Chain Donut Testnet - Main Hub
    pushChainDonut: {
      url: process.env.NEXT_PUBLIC_PUSH_CHAIN_RPC_URL || "https://evm.rpc-testnet-donut-node1.push.org/",
      chainId: 42101,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },
    
    // Ethereum Sepolia - For testing cross-chain
    ethereumSepolia: {
      url: process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL || "https://1rpc.io/sepolia",
      chainId: 11155111,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },
    
    // Ethereum Mainnet - Push Protocol Hub
    ethereum: {
      url: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
      chainId: 1,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },
    
    // Polygon Mainnet - Push Protocol supported
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon.llamarpc.com",
      chainId: 137,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },

    // BSC Mainnet - Push Protocol supported
    bsc: {
      url: process.env.BSC_RPC_URL || "https://bsc.llamarpc.com",
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },

    // Arbitrum Mainnet - Push Protocol supported
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
      chainId: 42161,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },

    // Optimism Mainnet - Push Protocol supported
    optimism: {
      url: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
      chainId: 10,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      timeout: 300000,
      gasPrice: "auto",
    },

    // Local development network
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // Hardhat network for testing
    hardhat: {
      chainId: 31337,
      forking: {
        url: process.env.ARB_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
        enabled: false,
      },
    },
  },
  
  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
    },
  },
  
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
  
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  
  mocha: {
    timeout: 300000,
  },
};
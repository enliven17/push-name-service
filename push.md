# Chain Configuration

Source: https://pushchain.github.io/push-chain-website/pr-preview/pr-1067/docs/chain/setup/chain-config/

SetupChain Configuration
Chain Configuration

List of all the chain configurations, contract addresses and namespaces deployed.

Chain Specs
​
🍩 Donut Testnet
Mainnet - Coming Soon 🚀
Field	Value
Network Name	Push Chain Donut Testnet
RPC URL	https://evm.rpc-testnet-donut-node1.push.org/, https://evm.rpc-testnet-donut-node2.push.org/
Chain ID	42101
Currency Symbol	PC
Block Explorer URL	https://donut.push.network
Add to Wallet (Testnet Donut)
Chain Contracts
​
🍩 Donut Testnet
Mainnet - Coming Soon 🚀
Contract Name	Contract Address	Contract Purpose
Universal Exector Factory	0x00000000000000000000000000000000000000eA	Factory contract to create Universal Executor Accounts (UEAs) on Push Chain.
Universal Verification Precompile	0x00000000000000000000000000000000000000ca	Precompile module that verifies signature of source-chain wallet (UOAs)
Universal Gateway Contracts
​
🍩 Donut Testnet
Mainnet - Coming Soon 🚀
Chain	Contract Address
Ethereum Sepolia Testnet	0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A
Solana Devnet	CFVSincHYbETh2k7w6u1ENEkjbSLtveRCEBupKidw2VS
Universal Chain Namespace
​

Every external chain is represented as a particular string on Push Chain. Mentioned below are the supported testnet and mainnet chain namespaces on Push Chain.

🍩 Donut Testnet
Mainnet - Coming Soon 🚀
Chain	Namespace	Assigned Constant
Push Testnet (Donut)	eip155:42101	PUSH_TESTNET_DONUT
Ethereum Sepolia	eip155:11155111	ETHEREUM_SEPOLIA
Solana Devnet	solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1	SOLANA_DEVNET
Next Steps
​
Create your Universal Signer with Create Universal Signer
Send your first transaction via Send Universal Transaction
Explore on-chain helpers in Contract Helpers
Abstract on the frontend with UI Kit
Edit this page
Previous
Configure Hardhat
Next
Build
Copy page
Copy page
Copy the page as Markdown for LLMs
View as Markdown
View this page as plain text
Open in ChatGPT
Ask questions about this page
Open in Claude
Ask questions about this page
Chain Specs
Chain Contracts
Universal Gateway Contracts
Universal Chain Namespace
Next Steps



# Configure Hardhat

Source: https://pushchain.github.io/push-chain-website/pr-preview/pr-1067/docs/chain/setup/smart-contract-environment/configure-hardhat/

SetupSmart Contract EnvironmentConfigure Hardhat
Configure Hardhat

Hardhat is another popular development environment for Ethereum software, designed for professionals that need a flexible and extensible tool. Code with vibes and dawn your builder hat with Hardhat.

Push Chain Specs
Deploy Smart Contracts with Hardhat
​
1. Install Hardhat​

First, create a new directory for your project and initialize it:

mkdir myToken
cd myToken
npm init -y


Install Hardhat and required dependencies:

npm install --save-dev \
  hardhat \
  @nomicfoundation/hardhat-toolbox \
  @nomicfoundation/hardhat-verify \
  dotenv \
  @openzeppelin/contracts


This installs:

Hardhat core framework
Hardhat toolbox with common plugins
Hardhat verify for contract verification
dotenv for environment variable management
OpenZeppelin contracts library



2. Create a New Project​

Initialize a new Hardhat project:

npx hardhat init


Select "Create a JavaScript project" when prompted. This will create a basic project structure:

myToken/
├── contracts/
├── scripts/
├── test/
├── hardhat.config.js
├── package.json
└── node_modules/




3. Configure for Push Chain​

Update your hardhat.config.js file to include Push Chain testnet configuration:

require('@nomicfoundation/hardhat-toolbox');
require('@nomicfoundation/hardhat-verify');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.22',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    push_testnet: {
      url: 'https://evm.rpc-testnet-donut-node1.push.org/',
      chainId: 42101,
      accounts: [process.env.PRIVATE_KEY],
    },
    push_testnet_alt: {
      url: 'https://evm.rpc-testnet-donut-node2.push.org/',
      chainId: 42101,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      // Blockscout doesn't require an actual API key, any non-empty string will work
      push_testnet: 'blockscout',
    },
    customChains: [
      {
        network: 'push_testnet',
        chainId: 42101,
        urls: {
          apiURL: 'https://donut.push.network/api/v2/verifyContract',
          browserURL: 'https://donut.push.network/',
        },
      },
    ],
  },
  sourcify: {
    // Disable sourcify for manual verification
    enabled: false,
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  mocha: {
    timeout: 40000,
  },
};


This configuration includes:

Solidity compiler version and optimization settings
Push Chain testnet RPC endpoints
Blockscout integration for contract verification
Project structure paths
Test configuration



4. Write a Smart Contract​

Create a file at contracts/MyToken.sol with this ERC20 token implementation:

// SPDX-License-Identifier: MIT
pragma solidity 0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyToken
 * @dev A simple ERC20 token for demonstration on PUSH CHAIN
 */
contract MyToken is ERC20, Ownable {
  constructor() ERC20("MyToken", "MT") Ownable(msg.sender) {
    _mint(msg.sender, 1000 * 10**18);
  }

  /**
    * @dev Returns the number of decimals used to get its user representation.
    */
  function decimals() public view virtual override returns (uint8) {
    return 18;
  }

  /**
    * @dev Allows the owner to mint new tokens
    * @param to The address that will receive the minted tokens.
    * @param amount The amount of tokens to mint.
    */
  function mint(address to, uint256 amount) public onlyOwner {
    _mint(to, amount);
  }
}




5. Compile the Contract​

Compile your contract with:

npx hardhat compile


If successful, you should see output indicating compilation was successful:

Compiling 12 files with 0.8.22
Solidity compilation finished successfully




6. Deploy to Push Chain​
6.1. Set up your deployer account​

Create a .env file in your project root to securely store your private key:

Then create a deployment script at scripts/deploy.js:

const hre = require('hardhat');

async function main() {
  console.log('Deploying MyToken to PUSH Chain...');

  const myToken = await hre.ethers.deployContract('MyToken');
  await myToken.waitForDeployment();

  const address = await myToken.getAddress();
  console.log(`MyToken deployed to: ${address}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

WARNING

Never commit your .env file to version control. Add .env to your .gitignore file to prevent accidental exposure of private keys. Never use accounts with significant funds for test deployments.

6.2. Get testnet tokens​

Ensure you have testnet tokens to pay for deployment gas fees. If you don't have any, visit the Push Chain Faucet to request test tokens.

6.3. Deploy your contract​

Run the deployment script with:

npx hardhat run scripts/deploy.js --network push_testnet


This command:

Runs your deployment script
Connects to Push Chain testnet
Uses your private key from the .env file
Deploys your contract and waits for confirmation

Deployment Results

If successful, you'll see output similar to:

Deploying MyToken to PUSH Chain...
MyToken deployed to: 0x0B86e252B035027028C0d4D3B136d80Da4C98Ec1


Save the contract address for verification and interaction.




7. Verify the Contract​

Verify your contract on the Push Chain BlockScout explorer:

npx hardhat verify --network push_testnet 0x0B86e252B035027028C0d4D3B136d80Da4C98Ec1


Note: Replace 0x0B86e252B035027028C0d4D3B136d80Da4C98Ec1 with your actual deployed contract address.

Note: If you encounter issues with verification, you can refer to Blockscout's Hardhat verification plugin documentation for troubleshooting.

When successful, you'll receive a confirmation message with a link to view your verified contract on the Push Chain explorer.

That's it! You have successfully deployed and verified your smart contract on Push Chain using Hardhat.

Next Steps
​
Jump into building and interacting with your smart contract using the Push Chain SDK
Check out chain configuration or available helper contracts
Abstract everything on frontend with UI Kit
Edit this page
Previous
Configure Foundry
Next
Chain Configuration
Copy page
Copy page
Copy the page as Markdown for LLMs
View as Markdown
View this page as plain text
Open in ChatGPT
Ask questions about this page
Open in Claude
Ask questions about this page
Deploy Smart Contracts with Hardhat
1. Install Hardhat
2. Create a New Project
3. Configure for Push Chain
4. Write a Smart Contract
5. Compile the Contract
6. Deploy to Push Chain
7. Verify the Contract
Next Steps




# Create Universal Signer

Source: https://pushchain.github.io/push-chain-website/pr-preview/pr-1067/docs/chain/build/create-universal-signer/

BuildCreate Universal Signer
Create Universal Signer
Overview
​

Wrap any EVM or non-EVM signer (ethers, viem, Solana, etc.) into a UniversalSigner so you can send cross-chain transactions on Push Chain without touching your on-chain code.

Prerequisite
Remember to install and import required libraries. See Quickstart for install steps.

Create Universal Signer
​

PushChain.utils.signer.toUniversal(signer): Promise<UniversalSigner>

The most common way to create a Universal Signer is by converting an existing signer from supported libraries (Ethers, Viem, Solana).

Ethers (v6)
Viem
Solana (Web3 JS)
// Derive Ethers Signer
const provider = new ethers.providers.JsonRpcProvider('<RPC_URL>');
const ethersSigner = new ethers.Wallet('<PRIVATE_KEY>', provider);

// Convert to Universal Signer
const universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);

PROVIDER DETERMINES THE CHAIN OF THE ACCOUNT
RPC URL picks the chain – Sepolia RPC → Ethereum Sepolia, Donut RPC → Push Chain Testnet

TheseArgumentsare mandatory

Arguments	Type	Description
signer	viem.WalletClient | ethers.Wallet | UniversalSignerSkeleton	The signer to convert to Universal Signer format.
Returns `UniversalSigner` <object>

Ready to dive in? Try the code in live playground 👇.

Ethers (v6)
Viem
Solana (Web3 JS)
UI Kit (Frontend / Abstracted)
VIRTUAL NODE IDE
// Import Push Chain Core

import { PushChain } from '@pushchain/core';

import { ethers } from 'ethers';



async function main() {

  console.log('Creating Universal Signer - Ethers V6');



  // Create random wallet

  const wallet = ethers.Wallet.createRandom();



  // Set up provider

  // Replace it with different JsonRpcProvider to target Ethereum Account, BNB Account, etc

  // const provider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');

  const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');

  const signer = wallet.connect(provider);



  // Convert ethers signer to Universal Signer

  const universalSigner = await PushChain.utils.signer.toUniversal(signer);

  console.log('🔑 Got universal signer - Ethers');

  console.log(JSON.stringify(universalSigner));

}



await main().catch(console.error);

                                                                                                                               

Open in Github
Clear Console
►
Run Code
$ Virtual Node Environment with limited capabilities.
$ Hit "Run Code" to Execute.
Next Steps
​
Initialize Push Chain Client with the Universal Signer
Abstract away creation of the Universal Signer using UI Kit
Learn how to create Universal Signer from public / private keypair
Create custom implementation of universal signer (Advanced)
Edit this page
Previous
Recommended Practices
Next
Initialize Push Chain Client
Copy page
Copy page
Copy the page as Markdown for LLMs
View as Markdown
View this page as plain text
Open in ChatGPT
Ask questions about this page
Open in Claude
Ask questions about this page
Overview
Create Universal Signer
Next Steps
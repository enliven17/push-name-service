const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🚀 Deploying Push Universal Name Service...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deployment Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("- Balance:", ethers.formatEther(balance), "PC");
  
  // Get Push Core contract address for the current network
  const pushCoreAddresses = {
    42101: "0x00000000000000000000000000000000000000eA", // Push Chain Donut Testnet - Universal Executor Factory
    11155111: "0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE", // Ethereum Sepolia
    1: "0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE", // Ethereum Mainnet
    137: "0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE", // Polygon
    56: "0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE", // BSC
    42161: "0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE", // Arbitrum
    10: "0x66329Fdd4042928BfCAB60b179e1538D56eeeeeE", // Optimism
  };
  
  const pushCoreAddress = pushCoreAddresses[network.chainId];
  if (!pushCoreAddress) {
    throw new Error(`Push Core contract not available on chain ${network.chainId}`);
  }
  
  console.log("- Push Core Address:", pushCoreAddress);
  
  // Deploy Push Universal Name Service
  console.log("\n📦 Deploying PushUniversalNameService...");
  const PushUniversalNameService = await ethers.getContractFactory("PushUniversalNameService");
  
  const nameService = await PushUniversalNameService.deploy(
    deployer.address, // initial owner
    pushCoreAddress,  // Push Core contract address
    deployer.address, // treasury address (initially deployer)
    pushCoreAddress   // Universal Executor Factory (using same address for now)
  );
  
  await nameService.waitForDeployment();
  
  const contractAddress = await nameService.getAddress();
  console.log("✅ PushUniversalNameService deployed to:", contractAddress);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  const deployTx = nameService.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(3);
  }
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const owner = await nameService.owner();
    const supportedChains = await nameService.getSupportedChains();
    
    console.log("- Contract Owner:", owner);
    console.log("- Supported Chains:", supportedChains.map(id => id.toString()));
    
    // Test basic functionality
    const isAvailable = await nameService.isAvailable("test");
    console.log("- Test domain 'test' available:", isAvailable);
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    contracts: {
      PushUniversalNameService: {
        address: contractAddress,
        deploymentHash: deployTx ? deployTx.hash : "N/A",
        blockNumber: deployTx ? deployTx.blockNumber : "N/A",
      }
    },
    pushCoreAddress,
    timestamp: new Date().toISOString(),
    gasUsed: {
      PushUniversalNameService: deployTx ? deployTx.gasLimit?.toString() || "N/A" : "N/A"
    }
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info to file
  const filename = `push-name-service-deployment-${network.chainId}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);
  
  // Print environment variables to add
  console.log("\n📝 Add these to your .env file:");
  console.log(`NEXT_PUBLIC_PUSH_NAME_SERVICE_${getChainEnvName(network.chainId)}=${contractAddress}`);
  
  // Print verification command
  if (network.chainId !== 31337) { // Not localhost
    console.log("\n🔗 Verify contract with:");
    console.log(`npx hardhat verify --network ${network.name} ${contractAddress} "${deployer.address}" "${pushCoreAddress}" "${deployer.address}" "${pushCoreAddress}"`);
  }
  
  console.log("\n🎉 Deployment completed successfully!");
  
  return {
    nameService: contractAddress,
    deployer: deployer.address,
    network: network.name,
    chainId: network.chainId
  };
}

function getChainEnvName(chainId) {
  const chainNames = {
    42101: "PUSH_CHAIN",
    11155111: "ETH_SEPOLIA",
    1: "ETH",
    137: "POLYGON", 
    56: "BSC",
    42161: "ARBITRUM",
    10: "OPTIMISM"
  };
  return chainNames[chainId] || "UNKNOWN";
}

// Handle deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Deployment failed:", error);
      process.exit(1);
    });
}

module.exports = { main };
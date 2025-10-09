const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
  console.log("🌉 Deploying EthBridge on Ethereum Sepolia...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Deployment Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("- Balance:", ethers.formatEther(balance), "ETH");
  
  // Verify we're on Ethereum Sepolia
  if (network.chainId !== 11155111n) {
    throw new Error(`This script is for Ethereum Sepolia (11155111), but you're on chain ${network.chainId}`);
  }
  
  // Configuration
  const treasuryAddress = deployer.address; // Use deployer as treasury initially
  const universalSignerAddress = deployer.address; // Use deployer as universal signer initially
  
  console.log("- Treasury Address:", treasuryAddress);
  console.log("- Universal Signer Address:", universalSignerAddress);
  
  // Deploy EthBridge
  console.log("\n📦 Deploying EthBridge...");
  const EthBridge = await ethers.getContractFactory("EthBridge");
  
  const ethBridge = await EthBridge.deploy(
    treasuryAddress,
    universalSignerAddress
  );
  
  await ethBridge.waitForDeployment();
  
  const contractAddress = await ethBridge.getAddress();
  console.log("✅ EthBridge deployed to:", contractAddress);
  
  // Wait for a few block confirmations
  console.log("⏳ Waiting for block confirmations...");
  const deployTx = ethBridge.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait(3);
  }
  
  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  try {
    const owner = await ethBridge.owner();
    const treasury = await ethBridge.treasury();
    const universalSigner = await ethBridge.universalSigner();
    const registrationPrice = await ethBridge.getRegistrationPrice();
    
    console.log("- Contract Owner:", owner);
    console.log("- Treasury:", treasury);
    console.log("- Universal Signer:", universalSigner);
    console.log("- Registration Price:", ethers.formatEther(registrationPrice), "ETH");
    
    // Test domain validation
    const isValid = await ethBridge.isValidDomainName("test");
    console.log("- Test domain 'test' valid:", isValid);
    
    const stats = await ethBridge.getStats();
    console.log("- Total Registrations:", stats[0].toString());
    console.log("- Total ETH Collected:", ethers.formatEther(stats[1]), "ETH");
    
  } catch (error) {
    console.error("❌ Verification failed:", error.message);
  }
  
  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    deployer: deployer.address,
    contracts: {
      EthBridge: {
        address: contractAddress,
        deploymentHash: deployTx ? deployTx.hash : "N/A",
        blockNumber: deployTx ? deployTx.blockNumber : "N/A",
      }
    },
    configuration: {
      treasury: treasuryAddress,
      universalSigner: universalSignerAddress,
      registrationPrice: "0.001 ETH"
    },
    timestamp: new Date().toISOString(),
    gasUsed: {
      EthBridge: deployTx ? deployTx.gasLimit?.toString() || "N/A" : "N/A"
    }
  };
  
  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  
  // Save deployment info to file
  const filename = `eth-bridge-deployment-${network.chainId}-${Date.now()}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2));
  console.log(`\n💾 Deployment info saved to: ${filename}`);
  
  // Print environment variables to add
  console.log("\n📝 Add these to your .env file:");
  console.log(`NEXT_PUBLIC_ETH_BRIDGE_ADDRESS=${contractAddress}`);
  console.log(`NEXT_PUBLIC_ETH_BRIDGE_TREASURY=${treasuryAddress}`);
  console.log(`NEXT_PUBLIC_ETH_BRIDGE_UNIVERSAL_SIGNER=${universalSignerAddress}`);
  
  // Print verification command
  console.log("\n🔗 Verify contract with:");
  console.log(`npx hardhat verify --network ethereumSepolia ${contractAddress} "${treasuryAddress}" "${universalSignerAddress}"`);
  
  console.log("\n🎉 EthBridge deployment completed successfully!");
  console.log("\n📋 Next Steps:");
  console.log("1. Update your .env file with the contract address");
  console.log("2. Update the universal signer address to your actual universal signer");
  console.log("3. Test the bridge functionality");
  console.log("4. Verify the contract on Etherscan");
  
  return {
    ethBridge: contractAddress,
    deployer: deployer.address,
    network: network.name,
    chainId: network.chainId.toString()
  };
}

// Handle deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ EthBridge deployment failed:", error);
      process.exit(1);
    });
}

module.exports = { main };
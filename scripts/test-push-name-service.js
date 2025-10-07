const { ethers } = require("hardhat");

async function main() {
  console.log("🧪 Testing Push Universal Name Service...");
  
  const signers = await ethers.getSigners();
  const [deployer, user1, user2] = signers;
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Test Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  console.log("- User1:", user1 ? user1.address : "N/A");
  console.log("- User2:", user2 ? user2.address : "N/A");
  
  // Get contract address from environment
  const contractAddress = "0xc0b33Cc720025dD0AcF56e249C8b76A6A34170B6"; // Push Chain Donut deployment
  
  // Connect to deployed contract
  const PushNameService = await ethers.getContractFactory("PushUniversalNameService");
  const contract = PushNameService.attach(contractAddress);
  
  console.log("📍 Contract Address:", contractAddress);
  
  try {
    // Test 1: Check if domain is available
    console.log("\n🔍 Test 1: Check domain availability");
    const testDomain = "alice";
    const isAvailable = await contract.isAvailable(testDomain);
    console.log(`- Domain "${testDomain}" available:`, isAvailable);
    
    // Test 2: Add Push Chain Donut as supported chain (if not already added)
    console.log("\n⚙️ Test 2: Setup Push Chain Donut");
    try {
      const chainConfig = await contract.getChainConfig(network.chainId);
      if (!chainConfig.isSupported) {
        console.log("- Adding Push Chain Donut as supported chain...");
        const addChainTx = await contract.addSupportedChain(
          network.chainId,
          ethers.parseEther("0.001"), // 0.001 PC registration price
          ethers.parseEther("0.0001"), // 0.0001 PC transfer fee
          "https://evm.rpc-testnet-donut-node1.push.org/",
          "https://donut.push.network"
        );
        await addChainTx.wait();
        console.log("✅ Chain added successfully");
      } else {
        console.log("✅ Chain already supported");
      }
      
      // Get updated config
      const updatedConfig = await contract.getChainConfig(network.chainId);
      console.log("- Registration price:", ethers.formatEther(updatedConfig.registrationPrice), "PC");
      console.log("- Transfer fee:", ethers.formatEther(updatedConfig.transferFee), "PC");
      console.log("- Is supported:", updatedConfig.isSupported);
    } catch (error) {
      console.log("❌ Failed to setup chain:", error.message);
    }
    
    // Test 3: Register a domain (if available)
    if (isAvailable) {
      console.log("\n📝 Test 3: Register domain");
      const updatedConfig = await contract.getChainConfig(network.chainId);
      if (updatedConfig.isSupported) {
        const tx = await contract.connect(deployer).register(testDomain, true, {
          value: updatedConfig.registrationPrice
        });
      
        console.log("- Transaction hash:", tx.hash);
        await tx.wait();
        console.log("✅ Domain registered successfully");
        
        // Verify registration
        const owner = await contract.ownerOf(testDomain);
        console.log("- Domain owner:", owner);
        console.log("- Expected owner:", deployer.address);
        console.log("- Owner match:", owner.toLowerCase() === deployer.address.toLowerCase());
      } else {
        console.log("❌ Chain not supported for registration");
      }
    }
    
    // Test 4: Get domain info
    console.log("\n📊 Test 4: Get domain info");
    try {
      const domainInfo = await contract.getDomainInfo(testDomain);
      console.log("- Owner:", domainInfo.owner);
      console.log("- Expires at:", new Date(Number(domainInfo.expiration) * 1000).toLocaleString());
      console.log("- Is universal:", domainInfo.isUniversal);
      console.log("- Source chain:", domainInfo.sourceChainId.toString());
      console.log("- Is expired:", domainInfo.isExpired);
    } catch (error) {
      console.log("❌ Failed to get domain info:", error.message);
    }
    
    // Test 5: Set domain record
    console.log("\n🔧 Test 5: Set domain record");
    try {
      const owner = await contract.ownerOf(testDomain);
      if (owner !== ethers.ZeroAddress) {
        const recordTx = await contract.connect(deployer).setRecord(testDomain, "A", "192.168.1.1");
        await recordTx.wait();
        console.log("✅ A record set successfully");
        
        // Get record
        const aRecord = await contract.getRecord(testDomain, "A");
        console.log("- A record value:", aRecord);
      } else {
        console.log("❌ Domain not owned, skipping record test");
      }
    } catch (error) {
      console.log("❌ Failed to set record:", error.message);
    }
    
    // Test 6: Get user domains
    console.log("\n👤 Test 6: Get user domains");
    const userDomains = await contract.getUserDomains(deployer.address);
    console.log("- Deployer domains:", userDomains);
    
    // Test 7: Get statistics
    console.log("\n📈 Test 7: Get statistics");
    const totalDomains = await contract.getTotalDomains();
    const totalUniversal = await contract.getTotalUniversalDomains();
    console.log("- Total domains:", totalDomains.toString());
    console.log("- Total universal domains:", totalUniversal.toString());
    
    // Test 8: Marketplace listing (if domain is owned)
    try {
      const owner = await contract.ownerOf(testDomain);
      if (owner !== ethers.ZeroAddress) {
        console.log("\n🏪 Test 8: Marketplace listing");
        const listPrice = ethers.parseEther("0.01");
        const listTx = await contract.connect(deployer).listDomain(testDomain, listPrice, "PC");
        await listTx.wait();
        console.log("✅ Domain listed for sale");
        
        // Get listing info
        const listing = await contract.getMarketplaceListing(testDomain);
        console.log("- Listed price:", ethers.formatEther(listing.price), "PC");
        console.log("- Seller:", listing.seller);
        console.log("- Active:", listing.active);
      } else {
        console.log("❌ Domain not owned, skipping marketplace test");
      }
    } catch (error) {
      console.log("❌ Failed to list domain:", error.message);
    }
    
    console.log("\n🎉 All tests completed successfully!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
    // Try to get more details about the error
    if (error.reason) {
      console.error("- Reason:", error.reason);
    }
    if (error.code) {
      console.error("- Code:", error.code);
    }
  }
}

// Handle test execution
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

module.exports = { main };
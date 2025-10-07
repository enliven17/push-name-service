const { ethers } = require("hardhat");

async function main() {
  console.log("🌐 Testing Push Chain Universal Transaction for Cross-Chain Domain Transfer...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Test Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  
  // Contract address on Push Chain Donut (updated with Universal Transaction support)
  const contractAddress = "0x4073E4B33c9a6b7C5e0d0d3aaE3812Df2A61fb89";
  
  // Connect to deployed contract
  const PushNameService = await ethers.getContractFactory("PushUniversalNameService");
  const contract = PushNameService.attach(contractAddress);
  
  console.log("📍 Contract Address:", contractAddress);
  
  try {
    // Test 1: Check if we're on Push Chain
    if (Number(network.chainId) !== 42101) {
      console.log("❌ This test must be run on Push Chain Donut Testnet (Chain ID: 42101)");
      console.log("Current chain ID:", Number(network.chainId));
      return;
    }
    
    // Test 2: Setup Push Chain Donut as supported chain
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
    } catch (error) {
      console.log("❌ Failed to setup chain:", error.message);
      return;
    }

    // Test 3: Register a universal domain for cross-chain testing
    const testDomain = "universal-test";
    console.log("\n🔍 Test 3: Check domain availability");
    const isAvailable = await contract.isAvailable(testDomain);
    console.log(`- Domain "${testDomain}" available:`, isAvailable);
    
    if (isAvailable) {
      console.log("\n📝 Test 4: Register universal domain");
      const chainConfig = await contract.getChainConfig(network.chainId);
      
      const registerTx = await contract.register(testDomain, true, {
        value: chainConfig.registrationPrice
      });
      
      console.log("- Registration transaction:", registerTx.hash);
      await registerTx.wait();
      console.log("✅ Universal domain registered successfully");
    }
    
    // Test 5: Verify domain ownership
    console.log("\n👤 Test 5: Verify domain ownership");
    const owner = await contract.ownerOf(testDomain);
    console.log("- Domain owner:", owner);
    console.log("- Is deployer owner:", owner.toLowerCase() === deployer.address.toLowerCase());
    
    if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("❌ Domain not owned by deployer, cannot test cross-chain transfer");
      return;
    }
    
    // Test 6: Get domain info
    console.log("\n📊 Test 6: Get domain info");
    const domainInfo = await contract.getDomainInfo(testDomain);
    console.log("- Is universal:", domainInfo.isUniversal);
    console.log("- Source chain:", Number(domainInfo.sourceChainId));
    console.log("- Current chain:", Number(domainInfo.currentChainId));
    
    if (!domainInfo.isUniversal) {
      console.log("❌ Domain is not universal, cannot test cross-chain transfer");
      return;
    }
    
    // Test 7: Prepare cross-chain transfer to Ethereum Sepolia
    const targetChainId = 11155111; // Ethereum Sepolia
    const targetAddress = deployer.address; // Transfer to same address on target chain
    
    console.log("\n🌉 Test 7: Prepare cross-chain transfer");
    console.log("- Target chain ID:", targetChainId);
    console.log("- Target address:", targetAddress);
    
    // Check if target chain is supported
    try {
      const targetChainConfig = await contract.getChainConfig(targetChainId);
      console.log("- Target chain supported:", targetChainConfig.isSupported);
      
      if (!targetChainConfig.isSupported) {
        console.log("⚠️ Target chain not supported, adding it...");
        
        const addChainTx = await contract.addSupportedChain(
          targetChainId,
          ethers.parseEther("0.002"), // 0.002 ETH registration price
          ethers.parseEther("0.0002"), // 0.0002 ETH transfer fee
          "https://1rpc.io/sepolia",
          "https://sepolia.etherscan.io"
        );
        await addChainTx.wait();
        console.log("✅ Target chain added successfully");
      }
    } catch (error) {
      console.log("❌ Failed to check target chain:", error.message);
      return;
    }
    
    // Test 8: Calculate transfer cost
    console.log("\n💰 Test 8: Calculate transfer cost");
    const sourceChainConfig = await contract.getChainConfig(network.chainId);
    const universalTxFee = await contract.UNIVERSAL_TX_FEE();
    const totalCost = sourceChainConfig.transferFee + universalTxFee;
    
    console.log("- Transfer fee:", ethers.formatEther(sourceChainConfig.transferFee), "PC");
    console.log("- Universal TX fee:", ethers.formatEther(universalTxFee), "PC");
    console.log("- Total cost:", ethers.formatEther(totalCost), "PC");
    
    // Test 9: Execute actual cross-chain transfer
    console.log("\n🚀 Test 9: Executing cross-chain transfer");
    console.log("- Target chain:", targetChainId, "(Ethereum Sepolia)");
    console.log("- Target address:", targetAddress);
    console.log("- Cost:", ethers.formatEther(totalCost), "PC");
    
    console.log("⚠️ Executing actual cross-chain transfer...");
    const transferTx = await contract.crossChainTransfer(
      testDomain,
      targetAddress,
      targetChainId,
      { value: totalCost }
    );
    
    console.log("- Transfer transaction:", transferTx.hash);
    await transferTx.wait();
    console.log("✅ Cross-chain transfer initiated successfully");
    
    // Check if domain was burned on source chain
    try {
      const newOwner = await contract.ownerOf(testDomain);
      console.log("- Domain owner after transfer:", newOwner);
      console.log("- Domain burned on source:", newOwner === ethers.ZeroAddress);
    } catch (error) {
      console.log("- Domain appears to be burned (ownerOf reverted)");
    }
    
    console.log("\n🎉 Cross-chain transfer completed!");
    console.log("🔗 Domain should now be available on Ethereum Sepolia");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    
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
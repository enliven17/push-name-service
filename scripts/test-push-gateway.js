const { ethers } = require("hardhat");

async function main() {
  console.log("🌉 Testing Push Chain Gateway for Cross-Chain Messaging...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Test Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  console.log("- Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "PC");
  
  try {
    // Check if we're on Push Chain
    if (Number(network.chainId) !== 42101) {
      console.log("❌ This test must be run on Push Chain Donut Testnet (Chain ID: 42101)");
      return;
    }
    
    // Gateway address for Ethereum Sepolia from .env
    const gatewayAddress = process.env.NEXT_PUBLIC_ETHEREUM_SEPOLIA_GATEWAY || "0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A";
    console.log("🌉 Gateway Address:", gatewayAddress);
    
    // Deploy test contract
    console.log("\n📦 Deploying PushGatewayTest...");
    const PushGatewayTest = await ethers.getContractFactory("PushGatewayTest");
    const gatewayTest = await PushGatewayTest.deploy(gatewayAddress);
    await gatewayTest.waitForDeployment();
    
    const testAddress = await gatewayTest.getAddress();
    console.log("✅ PushGatewayTest deployed to:", testAddress);
    
    // Test 1: Check gateway fee
    const targetChainId = 11155111; // Ethereum Sepolia
    const gasLimit = 100000;
    
    console.log("\n💰 Test 1: Check message fee");
    console.log("- Target chain:", targetChainId, "(Ethereum Sepolia)");
    console.log("- Gas limit:", gasLimit);
    
    try {
      const fee = await gatewayTest.gateway.getMessageFee(targetChainId, gasLimit);
      console.log("- Message fee:", ethers.formatEther(fee), "PC");
      
      // Test 2: Send test message
      console.log("\n📤 Test 2: Send cross-chain message");
      const sendTx = await gatewayTest.sendTestMessage(targetChainId, {
        value: fee
      });
      
      console.log("- Transaction hash:", sendTx.hash);
      const receipt = await sendTx.wait();
      console.log("✅ Message sent successfully");
      
      // Parse events
      const events = receipt.logs.filter(log => {
        try {
          return gatewayTest.interface.parseLog(log);
        } catch {
          return false;
        }
      });
      
      for (const event of events) {
        const parsed = gatewayTest.interface.parseLog(event);
        if (parsed.name === "MessageSent") {
          console.log("- Message ID:", parsed.args.messageId);
          console.log("- Target Chain:", parsed.args.targetChainId.toString());
        }
      }
      
    } catch (error) {
      console.log("❌ Gateway test failed:", error.message);
      
      // Try to check if gateway contract exists
      console.log("\n🔍 Checking gateway contract...");
      const code = await ethers.provider.getCode(gatewayAddress);
      if (code === "0x") {
        console.log("❌ Gateway contract not found at address:", gatewayAddress);
        console.log("💡 The gateway might be at a different address or not deployed yet");
      } else {
        console.log("✅ Gateway contract exists");
        console.log("- Code length:", code.length);
      }
    }
    
    console.log("\n🎉 Gateway test completed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.reason) {
      console.error("- Reason:", error.reason);
    }
  }
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

module.exports = { main };
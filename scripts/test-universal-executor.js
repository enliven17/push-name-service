const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Testing Push Chain Universal Executor Factory...");
  
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
    
    // Universal Executor Factory address from Push Chain docs
    const factoryAddress = "0x00000000000000000000000000000000000000eA";
    console.log("🏭 Universal Executor Factory:", factoryAddress);
    
    // Test 1: Check if factory contract exists
    console.log("\n🔍 Test 1: Check factory contract");
    const factoryCode = await ethers.provider.getCode(factoryAddress);
    if (factoryCode === "0x") {
      console.log("❌ Universal Executor Factory not found at address:", factoryAddress);
      return;
    }
    console.log("✅ Factory contract exists");
    console.log("- Code length:", factoryCode.length);
    
    // Test 2: Try to interact with factory using basic interface
    console.log("\n🔧 Test 2: Create Universal Executor Account");
    
    // Basic interface for Universal Executor Factory
    const factoryABI = [
      "function getUniversalExecutor(address user) external view returns (address)",
      "function createUniversalExecutor(address user) external returns (address)",
      "function isUniversalExecutor(address executor) external view returns (bool)"
    ];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
    
    try {
      // Check if user already has a Universal Executor
      console.log("- Checking existing Universal Executor for:", deployer.address);
      const existingExecutor = await factory.getUniversalExecutor(deployer.address);
      console.log("- Existing executor:", existingExecutor);
      
      if (existingExecutor === ethers.ZeroAddress) {
        console.log("- Creating new Universal Executor...");
        const createTx = await factory.createUniversalExecutor(deployer.address);
        console.log("- Transaction hash:", createTx.hash);
        await createTx.wait();
        console.log("✅ Universal Executor created");
        
        // Get the new executor address
        const newExecutor = await factory.getUniversalExecutor(deployer.address);
        console.log("- New executor address:", newExecutor);
      } else {
        console.log("✅ Universal Executor already exists");
      }
      
      // Test 3: Verify executor
      const finalExecutor = await factory.getUniversalExecutor(deployer.address);
      const isExecutor = await factory.isUniversalExecutor(finalExecutor);
      console.log("- Final executor address:", finalExecutor);
      console.log("- Is valid executor:", isExecutor);
      
    } catch (error) {
      console.log("❌ Factory interaction failed:", error.message);
      
      // Try to call factory with different method signatures
      console.log("\n🔍 Test 3: Try alternative factory methods");
      
      try {
        // Try calling with no parameters to see what methods exist
        const factoryInterface = new ethers.Interface([
          "function owner() external view returns (address)",
          "function version() external view returns (string)",
          "function name() external view returns (string)"
        ]);
        
        const factoryAlt = new ethers.Contract(factoryAddress, factoryInterface, deployer);
        
        try {
          const owner = await factoryAlt.owner();
          console.log("- Factory owner:", owner);
        } catch (e) {
          console.log("- No owner() method");
        }
        
        try {
          const version = await factoryAlt.version();
          console.log("- Factory version:", version);
        } catch (e) {
          console.log("- No version() method");
        }
        
      } catch (altError) {
        console.log("- Alternative methods also failed");
      }
    }
    
    console.log("\n🎉 Universal Executor test completed!");
    
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

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Test execution failed:", error);
      process.exit(1);
    });
}

module.exports = { main };
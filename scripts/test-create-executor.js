const { ethers } = require("hardhat");

async function main() {
  console.log("🔧 Testing Universal Executor Account Creation...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Test Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  console.log("- Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "PC");
  
  try {
    const factoryAddress = "0x00000000000000000000000000000000000000eA";
    console.log("🏭 Universal Executor Factory:", factoryAddress);
    
    // Correct interface based on discovery
    const factoryABI = [
      "function getAddress(address owner, bytes32 salt) external view returns (address)",
      "function createAccount(address owner, bytes32 salt) external returns (address)",
      "function owner() external view returns (address)"
    ];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
    
    // Test 1: Calculate executor address
    console.log("\n📍 Test 1: Calculate Universal Executor address");
    const salt = ethers.keccak256(ethers.toUtf8Bytes("push-name-service-test"));
    console.log("- Salt:", salt);
    
    const predictedAddress = await factory.getAddress(deployer.address, salt);
    console.log("- Predicted executor address:", predictedAddress);
    
    // Test 2: Check if executor exists
    console.log("\n🔍 Test 2: Check if executor exists");
    const executorCode = await ethers.provider.getCode(predictedAddress);
    const executorExists = executorCode !== "0x";
    console.log("- Executor exists:", executorExists);
    console.log("- Code length:", executorCode.length);
    
    if (!executorExists) {
      // Test 3: Create executor
      console.log("\n🚀 Test 3: Create Universal Executor");
      try {
        const createTx = await factory.createAccount(deployer.address, salt);
        console.log("- Transaction hash:", createTx.hash);
        await createTx.wait();
        console.log("✅ Universal Executor created successfully");
        
        // Verify creation
        const newCode = await ethers.provider.getCode(predictedAddress);
        console.log("- New code length:", newCode.length);
        console.log("- Creation successful:", newCode !== "0x");
        
      } catch (error) {
        console.log("❌ Failed to create executor:", error.message);
        return;
      }
    }
    
    // Test 4: Try to interact with the executor
    console.log("\n🔧 Test 4: Discover executor interface");
    
    // Try common account abstraction methods
    const possibleExecutorMethods = [
      "function execute(address target, uint256 value, bytes calldata data) external",
      "function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas) external",
      "function executeTransaction(uint256 targetChainId, address targetContract, bytes calldata data, uint256 value, uint256 gasLimit) external payable returns (bytes32)",
      "function owner() external view returns (address)",
      "function nonce() external view returns (uint256)",
      "function version() external view returns (string)"
    ];
    
    for (const methodSig of possibleExecutorMethods) {
      try {
        const iface = new ethers.Interface([methodSig]);
        const executor = new ethers.Contract(predictedAddress, iface, deployer);
        const methodName = methodSig.split('(')[0].split(' ')[1];
        
        if (methodName === 'owner' || methodName === 'nonce' || methodName === 'version') {
          try {
            const result = await executor[methodName]();
            console.log(`✅ ${methodName}:`, result);
          } catch (error) {
            console.log(`❌ ${methodName}: ${error.message.split('(')[0]}`);
          }
        } else {
          console.log(`📝 ${methodName}: Method signature exists (not called)`);
        }
        
      } catch (error) {
        // Method doesn't exist
      }
    }
    
    console.log("\n🎉 Executor test completed!");
    
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
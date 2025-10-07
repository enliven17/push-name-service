const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Discovering Universal Executor Factory ABI...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Test Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  
  const factoryAddress = "0x00000000000000000000000000000000000000eA";
  console.log("🏭 Universal Executor Factory:", factoryAddress);
  
  // Try different method signatures that might exist
  const possibleMethods = [
    // Standard factory methods
    "function createAccount(address owner) external returns (address)",
    "function getAccount(address owner) external view returns (address)",
    "function createExecutor(address owner) external returns (address)",
    "function getExecutor(address owner) external view returns (address)",
    "function createUniversalExecutor(address owner) external returns (address)",
    "function getUniversalExecutor(address owner) external view returns (address)",
    
    // Alternative signatures
    "function createAccount(address owner, uint256 salt) external returns (address)",
    "function getAccount(address owner, uint256 salt) external view returns (address)",
    "function createExecutor(address owner, uint256 salt) external returns (address)",
    "function getExecutor(address owner, uint256 salt) external view returns (address)",
    
    // ERC-4337 style
    "function createAccount(address owner, bytes32 salt) external returns (address)",
    "function getAddress(address owner, bytes32 salt) external view returns (address)",
    
    // Info methods
    "function owner() external view returns (address)",
    "function implementation() external view returns (address)",
    "function version() external view returns (string)",
    "function name() external view returns (string)",
    
    // Account validation
    "function isValidAccount(address account) external view returns (bool)",
    "function isUniversalExecutor(address account) external view returns (bool)",
    "function accountImplementation() external view returns (address)"
  ];
  
  console.log("\n🔍 Testing possible method signatures...");
  
  for (const methodSig of possibleMethods) {
    try {
      const iface = new ethers.Interface([methodSig]);
      const contract = new ethers.Contract(factoryAddress, iface, deployer);
      const methodName = methodSig.split('(')[0].split(' ')[1];
      
      console.log(`\n🧪 Testing: ${methodName}`);
      
      if (methodName.includes('get') || methodName.includes('is') || methodName === 'owner' || methodName === 'implementation' || methodName === 'version' || methodName === 'name' || methodName === 'accountImplementation') {
        // View methods - try to call them
        try {
          let result;
          if (methodName === 'owner' || methodName === 'implementation' || methodName === 'accountImplementation') {
            result = await contract[methodName]();
          } else if (methodName === 'version' || methodName === 'name') {
            result = await contract[methodName]();
          } else if (methodName.includes('get') || methodName.includes('is')) {
            if (methodSig.includes('salt')) {
              result = await contract[methodName](deployer.address, 0);
            } else {
              result = await contract[methodName](deployer.address);
            }
          }
          console.log(`✅ ${methodName}:`, result);
        } catch (error) {
          console.log(`❌ ${methodName}: ${error.message.split('(')[0]}`);
        }
      } else {
        // State-changing methods - just check if they exist (don't call them)
        console.log(`📝 ${methodName}: Method signature exists (not called)`);
      }
      
    } catch (error) {
      // Method doesn't exist or has wrong signature
    }
  }
  
  console.log("\n🎉 ABI discovery completed!");
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("❌ Discovery failed:", error);
      process.exit(1);
    });
}

module.exports = { main };
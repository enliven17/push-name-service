const { ethers } = require("hardhat");

async function main() {
  console.log("🌐 Testing Real Push Chain Universal Transaction...");
  
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("📋 Test Details:");
  console.log("- Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("- Deployer:", deployer.address);
  console.log("- Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "PC");
  
  try {
    const factoryAddress = "0x00000000000000000000000000000000000000eA";
    const precompileAddress = "0x00000000000000000000000000000000000000ca";
    
    console.log("🏭 Universal Executor Factory:", factoryAddress);
    console.log("🔐 Universal Verification Precompile:", precompileAddress);
    
    // Test 1: Try to create an account
    console.log("\n🚀 Test 1: Create Universal Executor Account");
    
    const factoryABI = [
      "function createAccount(address owner, bytes32 salt) external returns (address)",
      "function getAddress(address owner, bytes32 salt) external view returns (address)"
    ];
    
    const factory = new ethers.Contract(factoryAddress, factoryABI, deployer);
    const salt = ethers.keccak256(ethers.toUtf8Bytes("push-universal-test"));
    
    try {
      console.log("- Creating account with salt:", salt);
      const createTx = await factory.createAccount(deployer.address, salt, {
        gasLimit: 500000
      });
      console.log("- Transaction hash:", createTx.hash);
      const receipt = await createTx.wait();
      console.log("✅ Account creation transaction successful");
      console.log("- Gas used:", receipt.gasUsed.toString());
      
      // Check if any events were emitted
      console.log("- Events emitted:", receipt.logs.length);
      for (let i = 0; i < receipt.logs.length; i++) {
        console.log(`  Event ${i}:`, receipt.logs[i].topics[0]);
      }
      
    } catch (error) {
      console.log("❌ Account creation failed:", error.message);
      
      // Try with different parameters
      console.log("\n🔄 Test 2: Try with zero salt");
      try {
        const zeroSalt = ethers.ZeroHash;
        const createTx2 = await factory.createAccount(deployer.address, zeroSalt, {
          gasLimit: 500000
        });
        console.log("- Transaction hash:", createTx2.hash);
        await createTx2.wait();
        console.log("✅ Account creation with zero salt successful");
      } catch (error2) {
        console.log("❌ Zero salt also failed:", error2.message);
      }
    }
    
    // Test 3: Try to interact with precompile
    console.log("\n🔐 Test 3: Test Universal Verification Precompile");
    
    const precompileCode = await ethers.provider.getCode(precompileAddress);
    console.log("- Precompile exists:", precompileCode !== "0x");
    console.log("- Code length:", precompileCode.length);
    
    if (precompileCode !== "0x") {
      // Try common precompile methods
      const precompileABI = [
        "function verify(bytes32 hash, bytes calldata signature, address signer) external view returns (bool)",
        "function verifySignature(bytes32 messageHash, bytes calldata signature) external view returns (address)",
        "function ecrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) external view returns (address)"
      ];
      
      const precompile = new ethers.Contract(precompileAddress, precompileABI, deployer);
      
      // Create a test message and signature
      const message = "Hello Push Chain!";
      const messageHash = ethers.keccak256(ethers.toUtf8Bytes(message));
      const signature = await deployer.signMessage(message);
      
      console.log("- Test message:", message);
      console.log("- Message hash:", messageHash);
      console.log("- Signature:", signature);
      
      try {
        const recovered = await precompile.verifySignature(messageHash, signature);
        console.log("✅ Signature verification successful");
        console.log("- Recovered address:", recovered);
        console.log("- Matches signer:", recovered.toLowerCase() === deployer.address.toLowerCase());
      } catch (error) {
        console.log("❌ Signature verification failed:", error.message);
      }
    }
    
    // Test 4: Try direct Universal Transaction
    console.log("\n🌉 Test 4: Attempt Universal Transaction");
    
    // Try to send a transaction to the factory that might trigger cross-chain behavior
    const universalTxABI = [
      "function executeUniversalTransaction(uint256 targetChainId, address targetContract, bytes calldata data, uint256 value) external payable returns (bytes32)",
      "function sendCrossChainMessage(uint256 targetChainId, address targetContract, bytes calldata data) external payable returns (bytes32)",
      "function universalCall(uint256 chainId, address target, bytes calldata data) external payable returns (bytes32)"
    ];
    
    const universalExecutor = new ethers.Contract(factoryAddress, universalTxABI, deployer);
    
    const targetChainId = 11155111; // Ethereum Sepolia
    const targetContract = deployer.address; // Test target
    const testData = ethers.toUtf8Bytes("test cross-chain message");
    
    for (const method of ["executeUniversalTransaction", "sendCrossChainMessage", "universalCall"]) {
      try {
        console.log(`- Trying ${method}...`);
        let tx;
        if (method === "executeUniversalTransaction") {
          tx = await universalExecutor.executeUniversalTransaction(
            targetChainId,
            targetContract,
            testData,
            0,
            { value: ethers.parseEther("0.001"), gasLimit: 500000 }
          );
        } else if (method === "sendCrossChainMessage") {
          tx = await universalExecutor.sendCrossChainMessage(
            targetChainId,
            targetContract,
            testData,
            { value: ethers.parseEther("0.001"), gasLimit: 500000 }
          );
        } else {
          tx = await universalExecutor.universalCall(
            targetChainId,
            targetContract,
            testData,
            { value: ethers.parseEther("0.001"), gasLimit: 500000 }
          );
        }
        
        console.log(`✅ ${method} successful!`);
        console.log("- Transaction hash:", tx.hash);
        const receipt = await tx.wait();
        console.log("- Gas used:", receipt.gasUsed.toString());
        return; // Success, exit
        
      } catch (error) {
        console.log(`❌ ${method} failed:`, error.message.split('(')[0]);
      }
    }
    
    console.log("\n🎉 Universal Transaction test completed!");
    
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
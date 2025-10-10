const { ethers } = require('ethers');
require('dotenv').config();

async function testMetaTransaction() {
  console.log('🧪 Testing Meta-Transaction...');
  
  try {
    // Connect to Sepolia
    const provider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
    const relayerWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    const userWallet = ethers.Wallet.createRandom().connect(provider);
    
    console.log('👤 Relayer address:', relayerWallet.address);
    console.log('👤 User address:', userWallet.address);
    
    // Contract details
    const contractAddress = '0xf74d5BB4be74715e692ac32b35d631d6b9a8fC49';
    const abi = [
      'function executeMetaRegistration(address user, string calldata domainName, uint256 nonce, bytes calldata signature) external payable',
      'function getNonce(address user) external view returns (uint256)',
      'function getRegistrationPrice() external view returns (uint256)',
      'function getRegistrationMessageHash(address user, string calldata domainName, uint256 nonce) public pure returns (bytes32)'
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, relayerWallet);
    
    // Test parameters
    const domainName = 'testdomain';
    const userAddress = userWallet.address;
    
    // Get user's nonce
    const nonce = await contract.getNonce(userAddress);
    console.log('📋 User nonce:', nonce.toString());
    
    // Get registration price
    const registrationPrice = await contract.getRegistrationPrice();
    console.log('💰 Registration price:', ethers.formatEther(registrationPrice), 'ETH');
    
    // Generate message hash from contract
    const messageHash = await contract.getRegistrationMessageHash(userAddress, domainName, nonce);
    console.log('📝 Contract message hash:', messageHash);
    
    // Generate message manually (should match frontend)
    const manualMessage = `Register domain: ${domainName}.push\nUser: ${userAddress.toLowerCase()}\nNonce: ${nonce}`;
    console.log('📝 Manual message:', JSON.stringify(manualMessage));
    
    const manualMessageHash = ethers.keccak256(ethers.toUtf8Bytes(manualMessage));
    console.log('📝 Manual message hash:', manualMessageHash);
    
    console.log('🔍 Message hashes match:', messageHash === manualMessageHash);
    
    // Sign the message with user wallet
    console.log('🔐 Signing message with user wallet...');
    const signature = await userWallet.signMessage(manualMessage);
    console.log('✅ Signature:', signature);
    
    // Verify signature locally
    const recoveredAddress = ethers.verifyMessage(manualMessage, signature);
    console.log('🔍 Recovered address:', recoveredAddress);
    console.log('🔍 Expected address:', userAddress);
    console.log('🔍 Signature valid:', recoveredAddress.toLowerCase() === userAddress.toLowerCase());
    
    // Try to execute meta-transaction
    console.log('📤 Executing meta-transaction...');
    
    try {
      // Estimate gas first
      const gasEstimate = await contract.executeMetaRegistration.estimateGas(
        userAddress,
        domainName,
        nonce,
        signature,
        { value: registrationPrice }
      );
      console.log('⛽ Gas estimate:', gasEstimate.toString());
      
      // Execute transaction
      const tx = await contract.executeMetaRegistration(
        userAddress,
        domainName,
        nonce,
        signature,
        {
          value: registrationPrice,
          gasLimit: gasEstimate * 120n / 100n // 20% buffer
        }
      );
      
      console.log('📤 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.hash);
      
    } catch (txError) {
      console.error('❌ Transaction failed:', txError);
      
      // Try to get revert reason
      if (txError.data) {
        try {
          const reason = ethers.toUtf8String('0x' + txError.data.slice(138));
          console.error('📋 Revert reason:', reason);
        } catch (e) {
          console.error('📋 Raw error data:', txError.data);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testMetaTransaction();
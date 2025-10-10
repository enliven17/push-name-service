const { ethers } = require('hardhat');
require('dotenv').config();

async function main() {
  console.log('🚀 Deploying EthBridge Meta-Transaction Contract...');
  
  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log('👤 Deploying with account:', deployer.address);
  
  // Check balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log('💰 Account balance:', ethers.formatEther(balance), 'ETH');
  
  if (balance < ethers.parseEther('0.01')) {
    throw new Error('Insufficient balance for deployment');
  }
  
  // Contract parameters
  const treasuryAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_TREASURY || deployer.address;
  const universalSignerAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_UNIVERSAL_SIGNER || deployer.address;
  
  console.log('📋 Contract parameters:');
  console.log('- Treasury:', treasuryAddress);
  console.log('- Universal Signer:', universalSignerAddress);
  
  // Deploy contract
  console.log('📦 Deploying EthBridgeMetaTx...');
  const EthBridgeMetaTx = await ethers.getContractFactory('EthBridgeMetaTx');
  
  const ethBridgeMetaTx = await EthBridgeMetaTx.deploy(
    treasuryAddress,
    universalSignerAddress
  );
  
  await ethBridgeMetaTx.waitForDeployment();
  const contractAddress = await ethBridgeMetaTx.getAddress();
  
  console.log('✅ EthBridgeMetaTx deployed to:', contractAddress);
  
  // Verify deployment
  console.log('🔍 Verifying deployment...');
  const registrationPrice = await ethBridgeMetaTx.getRegistrationPrice();
  const treasury = await ethBridgeMetaTx.treasury();
  const universalSigner = await ethBridgeMetaTx.universalSigner();
  
  console.log('📊 Contract verification:');
  console.log('- Registration Price:', ethers.formatEther(registrationPrice), 'ETH');
  console.log('- Treasury:', treasury);
  console.log('- Universal Signer:', universalSigner);
  
  // Test nonce functionality
  console.log('🧪 Testing nonce functionality...');
  const testNonce = await ethBridgeMetaTx.getNonce(deployer.address);
  console.log('- Initial nonce for deployer:', testNonce.toString());
  
  console.log('🎉 Deployment completed successfully!');
  console.log('');
  console.log('📝 Update your .env file:');
  console.log(`NEXT_PUBLIC_ETH_BRIDGE_ADDRESS=${contractAddress}`);
  console.log('');
  console.log('🔗 Contract Explorer:');
  console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  });
const { ethers } = require('ethers');
require('dotenv').config();

async function updatePushChainPrice() {
  console.log('🔧 Updating Push Chain registration price...');
  
  try {
    // Connect to Push Chain
    const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
    const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    
    console.log('👤 Deployer address:', signer.address);
    
    // Contract details
    const contractAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
    console.log('📋 Contract address:', contractAddress);
    
    const abi = [
      'function addSupportedChain(uint256 chainId, uint256 registrationPrice, uint256 transferFee, string calldata rpcUrl, string calldata explorerUrl) external',
      'function getChainConfig(uint256 chainId) external view returns (tuple(bool isSupported, uint256 registrationPrice, uint256 transferFee, string rpcUrl, string explorerUrl))',
      'function owner() external view returns (address)'
    ];
    
    const contract = new ethers.Contract(contractAddress, abi, signer);
    
    // Check current owner
    const owner = await contract.owner();
    console.log('📋 Contract owner:', owner);
    console.log('📋 Signer address:', signer.address);
    console.log('📋 Is owner?', owner.toLowerCase() === signer.address.toLowerCase());
    
    // Check current config
    console.log('🔍 Current Push Chain config:');
    const currentConfig = await contract.getChainConfig(42101);
    console.log('- Is supported:', currentConfig.isSupported);
    console.log('- Registration price:', ethers.formatEther(currentConfig.registrationPrice), 'PC');
    console.log('- Transfer fee:', ethers.formatEther(currentConfig.transferFee), 'PC');
    console.log('- RPC URL:', currentConfig.rpcUrl);
    console.log('- Explorer URL:', currentConfig.explorerUrl);
    
    // Update Push Chain config with 1 PC registration price
    console.log('🔄 Updating Push Chain config...');
    const newRegistrationPrice = ethers.parseEther('1.0'); // 1 PC
    const newTransferFee = ethers.parseEther('0.0001'); // 0.0001 PC
    
    const tx = await contract.addSupportedChain(
      42101, // Push Chain Donut chainId
      newRegistrationPrice,
      newTransferFee,
      'https://evm.rpc-testnet-donut-node1.push.org/',
      'https://donut.push.network'
    );
    
    console.log('📤 Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');
    
    const receipt = await tx.wait();
    console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
    
    // Verify the update
    console.log('🔍 Updated Push Chain config:');
    const updatedConfig = await contract.getChainConfig(42101);
    console.log('- Is supported:', updatedConfig.isSupported);
    console.log('- Registration price:', ethers.formatEther(updatedConfig.registrationPrice), 'PC');
    console.log('- Transfer fee:', ethers.formatEther(updatedConfig.transferFee), 'PC');
    console.log('- RPC URL:', updatedConfig.rpcUrl);
    console.log('- Explorer URL:', updatedConfig.explorerUrl);
    
    console.log('🎉 Push Chain price updated successfully!');
    
  } catch (error) {
    console.error('❌ Failed to update Push Chain price:', error);
    process.exit(1);
  }
}

updatePushChainPrice();
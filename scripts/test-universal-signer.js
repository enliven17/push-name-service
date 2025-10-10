const { ethers } = require('ethers');

async function testUniversalSigner() {
  console.log('🧪 Testing Universal Signer functionality...');
  
  try {
    // Import Push Chain SDK
    const { PushChain } = await import('@pushchain/core');
    console.log('✅ Push Chain SDK imported successfully');
    
    // Create Ethereum Sepolia signer
    const sepoliaProvider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, sepoliaProvider);
    
    console.log('👤 Sepolia wallet address:', wallet.address);
    
    // Convert to Universal Signer
    console.log('🔄 Converting to Universal Signer...');
    const universalSigner = await PushChain.utils.signer.toUniversal(wallet);
    console.log('✅ Universal Signer created:', typeof universalSigner);
    
    // Initialize Push Chain client
    console.log('🚀 Initializing Push Chain client...');
    const pushChainClient = await PushChain.initialize(universalSigner, {
      env: 'staging'
    });
    console.log('✅ Push Chain client initialized');
    
    // Test basic functionality
    console.log('🔑 Universal Signer account:', universalSigner.account);
    const universalAddress = universalSigner.account.address;
    console.log('🔑 Universal Signer address:', universalAddress);
    
    // Get Push Chain balance
    const pushProvider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
    const balance = await pushProvider.getBalance(universalAddress);
    console.log('💰 Push Chain balance:', ethers.formatEther(balance), 'PC');
    
    console.log('🎉 Universal Signer test completed successfully!');
    
  } catch (error) {
    console.error('❌ Universal Signer test failed:', error);
  }
}

testUniversalSigner();
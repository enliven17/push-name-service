const { ethers } = require('ethers');

async function testPushChainCore() {
  try {
    console.log('🧪 Testing Push Chain Core functionality...');
    
    // Import Push Chain SDK
    const { PushChain } = await import('@pushchain/core');
    console.log('✅ Push Chain Core imported successfully');
    
    // Create a test wallet with Sepolia provider
    const sepoliaProvider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
    const wallet = ethers.Wallet.createRandom().connect(sepoliaProvider);
    console.log('📝 Test wallet address:', wallet.address);
    console.log('🌐 Connected to Sepolia testnet');
    
    // Try to create Universal Signer
    console.log('🔑 Creating Universal Signer...');
    const universalSigner = await PushChain.utils.signer.toUniversal(wallet);
    console.log('✅ Universal Signer created successfully');
    console.log('📋 Universal Signer type:', typeof universalSigner);
    console.log('📋 Universal Signer methods:', Object.getOwnPropertyNames(universalSigner));
    
    // Try different ways to get address
    let address = null;
    if (universalSigner.account) {
      console.log('📋 Universal Signer account:', universalSigner.account);
      address = universalSigner.account.address || universalSigner.account;
    }
    console.log('📋 Universal Signer address:', address);
    
    // Try to initialize Push Chain client
    console.log('🚀 Initializing Push Chain client...');
    const pushChainClient = await PushChain.initialize(universalSigner, {
      env: 'staging' // Use staging for testnet
    });
    console.log('✅ Push Chain client initialized successfully');
    
    // Get some basic info
    console.log('📋 Push Chain client type:', typeof pushChainClient);
    console.log('📋 Push Chain client methods:', Object.getOwnPropertyNames(pushChainClient));
    
    // Try different ways to get chain info
    if (pushChainClient.chainId) {
      console.log('🔗 Chain ID:', pushChainClient.chainId);
    }
    
    if (pushChainClient.provider) {
      console.log('🌐 Provider available');
      try {
        const network = await pushChainClient.provider.getNetwork();
        console.log('🌐 Network:', network);
      } catch (e) {
        console.log('⚠️ Could not get network info:', e.message);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Push Chain Core test failed:', error.message);
    console.error('📋 Full error:', error);
    return false;
  }
}

// Run the test
testPushChainCore()
  .then(success => {
    if (success) {
      console.log('🎉 Push Chain Core test completed successfully!');
    } else {
      console.log('💥 Push Chain Core test failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
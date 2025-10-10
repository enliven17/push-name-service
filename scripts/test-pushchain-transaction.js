const { ethers } = require('ethers');

async function testPushChainTransaction() {
  try {
    console.log('🧪 Testing Push Chain Transaction functionality...');
    
    // Import Push Chain SDK
    const { PushChain } = await import('@pushchain/core');
    console.log('✅ Push Chain Core imported successfully');
    
    // Create a test wallet with Sepolia provider
    const sepoliaProvider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
    const wallet = ethers.Wallet.createRandom().connect(sepoliaProvider);
    console.log('📝 Test wallet address:', wallet.address);
    
    // Create Universal Signer
    console.log('🔑 Creating Universal Signer...');
    const universalSigner = await PushChain.utils.signer.toUniversal(wallet);
    console.log('✅ Universal Signer created successfully');
    console.log('📋 Account:', universalSigner.account);
    
    // Initialize Push Chain client
    console.log('🚀 Initializing Push Chain client...');
    const pushChainClient = await PushChain.initialize(universalSigner, {
      env: 'staging'
    });
    console.log('✅ Push Chain client initialized successfully');
    
    // Explore transaction capabilities
    console.log('📋 Exploring transaction capabilities...');
    
    if (pushChainClient.universal) {
      console.log('🌐 Universal module available');
      console.log('📋 Universal methods:', Object.getOwnPropertyNames(pushChainClient.universal));
    }
    
    if (pushChainClient.payable) {
      console.log('💰 Payable module available');
      console.log('📋 Payable methods:', Object.getOwnPropertyNames(pushChainClient.payable));
    }
    
    if (pushChainClient.moveable) {
      console.log('🔄 Moveable module available');
      console.log('📋 Moveable methods:', Object.getOwnPropertyNames(pushChainClient.moveable));
    }
    
    // Try to get balance
    if (pushChainClient.funds) {
      console.log('💰 Funds module available');
      console.log('📋 Funds methods:', Object.getOwnPropertyNames(pushChainClient.funds));
      
      try {
        const balance = await pushChainClient.funds.balance();
        console.log('💰 Current balance:', balance);
      } catch (e) {
        console.log('⚠️ Could not get balance:', e.message);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Push Chain Transaction test failed:', error.message);
    console.error('📋 Full error:', error);
    return false;
  }
}

// Run the test
testPushChainTransaction()
  .then(success => {
    if (success) {
      console.log('🎉 Push Chain Transaction test completed successfully!');
    } else {
      console.log('💥 Push Chain Transaction test failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
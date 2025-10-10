const { PushAPI, CONSTANTS } = require('@pushprotocol/restapi');
const { ethers } = require('ethers');

async function testPushProtocol() {
  try {
    console.log('🧪 Testing Push Protocol functionality...');
    
    // Create a test wallet
    const wallet = ethers.Wallet.createRandom();
    console.log('📝 Test wallet address:', wallet.address);
    
    // Initialize Push API (this doesn't require Push Chain SDK)
    const userAlice = await PushAPI.initialize({
      signer: wallet,
      env: CONSTANTS.ENV.STAGING
    });
    
    console.log('✅ Push Protocol initialized successfully');
    console.log('📧 User DID:', userAlice.did);
    
    // Test basic functionality
    const profile = await userAlice.profile.info();
    console.log('👤 Profile info:', profile);
    
    return true;
    
  } catch (error) {
    console.error('❌ Push Protocol test failed:', error.message);
    return false;
  }
}

// Run the test
testPushProtocol()
  .then(success => {
    if (success) {
      console.log('🎉 Push Protocol test completed successfully!');
    } else {
      console.log('💥 Push Protocol test failed!');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Unexpected error:', error);
    process.exit(1);
  });
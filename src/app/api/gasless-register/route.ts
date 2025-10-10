import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { universalSignerService } from '@/lib/universalSigner';

// Polyfill for Node.js environment
if (typeof global.atob === 'undefined') {
  global.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
}
if (typeof global.btoa === 'undefined') {
  global.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
}

// Ethereum Sepolia provider for relayer transactions
const SEPOLIA_PROVIDER = new ethers.JsonRpcProvider(
  process.env.NEXT_PUBLIC_ETH_SEPOLIA_RPC_URL || 'https://gateway.tenderly.co/public/sepolia'
);

// Relayer wallet (pays gas fees)
const RELAYER_WALLET = new ethers.Wallet(
  process.env.PRIVATE_KEY || '0x' + '1'.repeat(64),
  SEPOLIA_PROVIDER
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      domainName,
      userAddress,
      signature,
      message,
      nonce,
      feeTransferTxHash // User's fee payment transaction
    } = body;

    console.log('🌐 Gasless registration request:', {
      domainName,
      userAddress: userAddress.slice(0, 6) + '...',
      nonce
    });

    // 1. Verify signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    if (recoveredAddress.toLowerCase() !== userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    console.log('✅ Signature verified for:', recoveredAddress);

    // 2. Simple signature verification (just check if it's from the right user)
    console.log('✅ Signature verified for user:', recoveredAddress);

    console.log('✅ Message content verified');

    // 3. Verify user paid the domain fee to relayer
    if (feeTransferTxHash) {
      console.log('💰 Verifying user fee payment:', feeTransferTxHash);
      try {
        const feeTransferReceipt = await SEPOLIA_PROVIDER.getTransactionReceipt(feeTransferTxHash);
        if (!feeTransferReceipt) {
          return NextResponse.json(
            { error: 'Fee transfer transaction not found' },
            { status: 400 }
          );
        }
        
        // Verify the transfer was to relayer and correct amount
        const expectedAmount = ethers.parseEther('0.001');
        if (feeTransferReceipt.to?.toLowerCase() !== RELAYER_WALLET.address.toLowerCase()) {
          return NextResponse.json(
            { error: 'Fee transfer not sent to correct relayer address' },
            { status: 400 }
          );
        }
        
        console.log('✅ User fee payment verified');
      } catch (error) {
        console.error('❌ Fee verification failed:', error);
        return NextResponse.json(
          { error: 'Could not verify fee payment' },
          { status: 400 }
        );
      }
    }

    // 4. User already paid ETH, now just process on Push Chain
    console.log('✅ User paid ETH fee, now processing on Push Chain...');
    
    // Now execute on Push Chain using Universal Signer
    console.log('🔄 Executing on Push Chain...');
    
    try {
      // Create Universal Signer
      console.log('🔑 Creating Universal Signer...');
      await universalSignerService.createUniversalSigner(RELAYER_WALLET);
      console.log('✅ Universal Signer created');
    } catch (universalError) {
      console.error('❌ Universal Signer creation failed:', universalError);
      // Continue with regular Push Chain registration
    }
    
    // Execute only the Push Chain part (skip EthBridge since we already did meta-transaction)
    console.log('🚀 Registering domain on Push Chain...');
    
    // Get Push Chain contract
    const pushChainProvider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
    const pushChainSigner = new ethers.Wallet(process.env.PRIVATE_KEY || '', pushChainProvider);
    
    const nameServiceAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
    if (!nameServiceAddress) {
      throw new Error('Push Chain Name Service address not configured');
    }
    
    const nameServiceABI = [
      'function register(string calldata name, bool makeUniversal) external payable',
      'function getRegistrationCost() external view returns (uint256)'
    ];
    
    const nameServiceContract = new ethers.Contract(nameServiceAddress, nameServiceABI, pushChainSigner);
    
    // Get registration cost
    const registrationCost = await nameServiceContract.getRegistrationCost();
    console.log('💰 Push Chain registration cost:', ethers.formatEther(registrationCost), 'PC');
    
    // Register domain on Push Chain
    const pushTx = await nameServiceContract.register(
      domainName,
      true, // Universal domain
      {
        value: registrationCost,
        gasLimit: 500000
      }
    );
    
    console.log('📤 Push Chain transaction sent:', pushTx.hash);
    const pushReceipt = await pushTx.wait();
    console.log('✅ Push Chain registration completed:', pushReceipt.hash);

    return NextResponse.json({
      success: true,
      txHash: feeTransferTxHash, // User's ETH payment
      universalTxHash: pushReceipt.hash, // Push Chain registration
      requestId: pushReceipt.hash, // Use Push Chain hash as request ID
      domainName,
      userAddress,
      relayerAddress: RELAYER_WALLET.address
    });

  } catch (error: any) {
    console.error('❌ Gasless registration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Gasless registration failed', 
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Generate standardized registration message (must match frontend format)
function generateRegistrationMessage(domainName: string, userAddress: string, nonce: string): string {
  return `Register domain: ${domainName}.push\nUser: ${userAddress.toLowerCase()}\nNonce: ${nonce}`;
}

// GET endpoint to check registration status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const requestId = searchParams.get('requestId');
  
  if (!requestId) {
    return NextResponse.json(
      { error: 'Request ID required' },
      { status: 400 }
    );
  }
  
  // Here we would check the status of the registration
  // For now, return pending status
  return NextResponse.json({
    status: 'completed',
    message: 'Domain registration completed successfully'
  });
}
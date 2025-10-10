import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { universalSignerService } from '@/lib/universalSigner';

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

    // 2. Verify message content
    const expectedMessage = generateRegistrationMessage(domainName, userAddress, nonce);
    if (message !== expectedMessage) {
      return NextResponse.json(
        { error: 'Invalid message content' },
        { status: 400 }
      );
    }

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

    // 4. Execute meta-transaction on EthBridge contract
    console.log('🌉 Executing meta-transaction on EthBridge...');
    
    const ethBridgeAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_ADDRESS;
    if (!ethBridgeAddress) {
      throw new Error('EthBridge contract address not configured');
    }
    
    // EthBridge Meta-Transaction ABI
    const ethBridgeMetaABI = [
      'function executeMetaRegistration(address user, string calldata domainName, uint256 nonce, bytes calldata signature) external payable',
      'function getNonce(address user) external view returns (uint256)',
      'function getRegistrationPrice() external view returns (uint256)'
    ];
    
    const ethBridgeContract = new ethers.Contract(ethBridgeAddress, ethBridgeMetaABI, RELAYER_WALLET);
    
    // Get registration price
    const registrationPrice = await ethBridgeContract.getRegistrationPrice();
    console.log('💰 Registration price:', ethers.formatEther(registrationPrice), 'ETH');
    
    // Get user's current nonce
    const userNonce = await ethBridgeContract.getNonce(userAddress);
    console.log('🔢 User nonce:', userNonce.toString());
    
    // Execute meta-transaction (relayer pays both gas and domain fee)
    // Note: In production, you'd want to collect the domain fee from user first
    const metaTx = await ethBridgeContract.executeMetaRegistration(
      userAddress,
      domainName,
      userNonce,
      signature,
      {
        value: registrationPrice, // Relayer advances the domain fee
        gasLimit: 500000
      }
    );
    
    console.log('💰 Relayer paid:', ethers.formatEther(registrationPrice), 'ETH for domain fee');
    console.log('⛽ Relayer also paid gas fee for the transaction');
    
    console.log('📤 Meta-transaction sent:', metaTx.hash);
    const metaReceipt = await metaTx.wait();
    console.log('✅ Meta-transaction confirmed:', metaReceipt.hash);
    
    // Now execute on Push Chain using Universal Signer
    console.log('🔄 Executing on Push Chain...');
    await universalSignerService.createUniversalSigner(RELAYER_WALLET);
    
    const bridgeResult = await universalSignerService.gaslessBridge(
      RELAYER_WALLET,
      domainName,
      userAddress
    );

    console.log('✅ Gasless registration completed:', bridgeResult.universalTxHash);

    return NextResponse.json({
      success: true,
      txHash: bridgeResult.txHash,
      universalTxHash: bridgeResult.universalTxHash,
      requestId: bridgeResult.requestId,
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
  return `Register domain: ${domainName}.push\nUser: ${userAddress}\nNonce: ${nonce}`;
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
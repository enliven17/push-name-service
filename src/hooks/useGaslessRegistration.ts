import { useState } from 'react';
import { ethers } from 'ethers';

export interface GaslessRegistrationParams {
  domainName: string;
  userAddress: string;
}

export const useGaslessRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);

  // Generate registration message for signing (matches contract format)
  const generateRegistrationMessage = (
    domainName: string, 
    userAddress: string, 
    nonce: string
  ): string => {
    return `Register domain: ${domainName}.push\nUser: ${userAddress}\nNonce: ${nonce}`;
  };

  // Generate signature for gasless registration
  const generateRegistrationSignature = async (
    signer: ethers.Signer,
    domainName: string,
    userAddress: string
  ) => {
    // Get user's current nonce from contract
    const ethBridgeAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_ADDRESS;
    if (!ethBridgeAddress) {
      throw new Error('EthBridge contract address not configured');
    }
    
    const provider = signer.provider;
    if (!provider) {
      throw new Error('Signer must have a provider');
    }
    
    const ethBridgeABI = ['function getNonce(address user) external view returns (uint256)'];
    const ethBridgeContract = new ethers.Contract(ethBridgeAddress, ethBridgeABI, provider);
    
    const nonce = await ethBridgeContract.getNonce(userAddress);
    const message = generateRegistrationMessage(domainName, userAddress, nonce.toString());

    console.log('📝 Signing registration message:', message);
    console.log('🔢 Using nonce:', nonce.toString());
    
    const signature = await signer.signMessage(message);
    
    return { message, signature, nonce: nonce.toString() };
  };

  // Execute gasless domain registration
  const registerDomainGasless = async (
    signer: ethers.Signer,
    params: GaslessRegistrationParams
  ) => {
    try {
      setIsLoading(true);

      const { domainName, userAddress } = params;

      console.log('💰 User will pay domain fee (0.001 ETH) but no gas fee!');
      
      // First, user sends domain fee to relayer
      console.log('💸 Sending domain fee to relayer...');
      const domainFee = ethers.parseEther('0.001');
      
      // Send ETH to relayer address (this is the only transaction user pays gas for)
      const relayerAddress = '0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123'; // Your relayer address
      const feeTransfer = await signer.sendTransaction({
        to: relayerAddress,
        value: domainFee,
        gasLimit: 21000 // Simple ETH transfer
      });
      
      console.log('📤 Domain fee sent to relayer:', feeTransfer.hash);
      await feeTransfer.wait();
      console.log('✅ Domain fee confirmed');
      
      // Now generate signature for gasless registration
      console.log('🔐 Generating gasless registration signature...');
      const { message, signature, nonce } = await generateRegistrationSignature(
        signer,
        domainName,
        userAddress
      );

      console.log('✅ Signature generated, sending to gasless API...');

      // Call gasless registration API
      const response = await fetch('/api/gasless-register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domainName,
          userAddress,
          signature,
          message,
          nonce,
          feeTransferTxHash: feeTransfer.hash
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ API Error Response:', result);
        throw new Error(result.details || result.error || 'Gasless registration failed');
      }

      console.log('🎉 Gasless registration successful:', result);
      return result;

    } catch (error: any) {
      console.error('❌ Gasless registration error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check registration status
  const checkRegistrationStatus = async (requestId: string) => {
    try {
      const response = await fetch(`/api/gasless-register?requestId=${requestId}`);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to check status');
      }
      
      return result;
    } catch (error) {
      console.error('Failed to check registration status:', error);
      throw error;
    }
  };

  return {
    isLoading,
    registerDomainGasless,
    checkRegistrationStatus,
    generateRegistrationSignature
  };
};
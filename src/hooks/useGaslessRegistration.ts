import { useState } from 'react';
import { ethers } from 'ethers';

export interface GaslessRegistrationParams {
  domainName: string;
  userAddress: string;
}

export const useGaslessRegistration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'payment' | 'signature' | 'processing' | 'completed'>('payment');

  // Generate registration message for signing (matches contract format)
  const generateRegistrationMessage = (
    domainName: string, 
    userAddress: string, 
    nonce: string
  ): string => {
    return `Register domain: ${domainName}.push\nUser: ${userAddress.toLowerCase()}\nNonce: ${nonce}`;
  };

  // Generate signature for gasless registration
  const generateRegistrationSignature = async (
    signer: ethers.Signer,
    domainName: string,
    userAddress: string
  ) => {
    // Simple message for authorization
    const nonce = Date.now().toString();
    const message = generateRegistrationMessage(domainName, userAddress, nonce);

    console.log('📝 Signing registration message:', message);
    
    const signature = await signer.signMessage(message);
    
    return { message, signature, nonce };
  };

  // Execute gasless domain registration
  const registerDomainGasless = async (
    signer: ethers.Signer,
    params: GaslessRegistrationParams,
    onSuccess?: (data: { domainName: string; ethSepoliaTxHash: string; pushChainTxHash: string }) => void
  ) => {
    try {
      setIsLoading(true);

      const { domainName, userAddress } = params;

      console.log('💰 User will pay domain fee (0.001 ETH) but no gas fee!');
      
      // Step 1: User sends domain fee to relayer
      setCurrentStep('payment');
      console.log('💸 Step 1: Sending domain fee to relayer...');
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
      
      // Step 2: Generate signature for gasless registration
      setCurrentStep('signature');
      console.log('🔐 Step 2: Generating gasless registration signature...');
      const { message, signature, nonce } = await generateRegistrationSignature(
        signer,
        domainName,
        userAddress
      );

      console.log('✅ Signature generated, sending to gasless API...');
      
      // Step 3: Processing
      setCurrentStep('processing');

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
      
      // Step 4: Completed
      setCurrentStep('completed');
      
      // Call success callback if provided
      if (onSuccess && result.pushChainTxHash) {
        onSuccess({
          domainName: `${domainName}.push`,
          ethSepoliaTxHash: feeTransfer.hash,
          pushChainTxHash: result.pushChainTxHash
        });
      }
      
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
    currentStep,
    registerDomainGasless,
    checkRegistrationStatus,
    generateRegistrationSignature
  };
};
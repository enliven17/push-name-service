"use client";

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { FaPaperPlane, FaGlobe, FaArrowRight, FaInfoCircle } from 'react-icons/fa';
import { useAccount, useChainId } from 'wagmi';
import { domainService, Domain } from '@/lib/supabase';
import PushNameServiceContract from '@/lib/pushNameServiceContract';
import { supportedChains, getChainConfig, pushChainDonut } from '@/config/chains';

interface DomainTransferProps {
  domain: Domain;
  onTransferComplete: () => void;
  onClose: () => void;
}

const TransferModal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const TransferContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border-radius: 20px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  position: relative;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const TransferTitle = styled.h3`
  color: white;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0 0 8px 0;
  text-align: center;
`;

const TransferSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
  margin: 0 0 24px 0;
  text-align: center;
`;

const DomainInfo = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: center;
`;

const DomainName = styled.div`
  color: white;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 8px;
`;

const DomainOwner = styled.div`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
`;

const TransferForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
`;

const AddressInput = styled.input`
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 12px 16px;
  color: white;
  font-size: 1rem;
  outline: none;
  transition: all 0.3s ease;
  
  &:focus {
    border-color: #3b82f6;
    background: rgba(255, 255, 255, 0.15);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
`;



const TransferButton = styled.button`
  width: 100%;
  padding: 16px 0;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #22c55e 0%, #065f46 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(34, 197, 94, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(255, 255, 255, 0.2);
  }
`;



const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #ef4444;
  font-size: 0.9rem;
  text-align: center;
`;

const SuccessMessage = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #22c55e;
  font-size: 0.9rem;
  text-align: center;
`;

const TransferTypeSelector = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
`;

const TransferTypeOption = styled.button<{ active: boolean }>`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid ${props => props.active ? '#00d2ff' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 12px;
  background: ${props => props.active ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.active ? '#00d2ff' : 'rgba(255, 255, 255, 0.7)'};
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  
  &:hover {
    border-color: ${props => props.active ? '#00d2ff' : 'rgba(255, 255, 255, 0.4)'};
    background: ${props => props.active ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)'};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const ChainSelector = styled.div`
  margin-bottom: 16px;
`;

const ChainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-top: 8px;
`;

const ChainOption = styled.button<{ $active: boolean; disabled?: boolean }>`
  padding: 12px;
  border: 2px solid ${props => props.$active ? '#00d2ff' : 'rgba(255, 255, 255, 0.2)'};
  border-radius: 8px;
  background: ${props => props.$active ? 'rgba(0, 210, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'};
  color: ${props => props.$active ? '#00d2ff' : 'white'};
  font-size: 0.85rem;
  font-weight: 500;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.3s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    border-color: ${props => props.$active ? '#00d2ff' : 'rgba(255, 255, 255, 0.4)'};
  }
`;

const CrossChainInfo = styled.div`
  background: rgba(0, 210, 255, 0.1);
  border: 1px solid rgba(0, 210, 255, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const TransferInfo = styled.div`
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
`;

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 0.9rem;
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const InfoLabel = styled.span`
  color: rgba(255, 255, 255, 0.7);
`;

const InfoValue = styled.span`
  color: #00d2ff;
  font-weight: 600;
`;

const DomainTypeInfo = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #ffc107;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const DomainTransfer: React.FC<DomainTransferProps> = ({
  domain,
  onTransferComplete,
  onClose
}) => {
  const [toAddress, setToAddress] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [isLoadingDomainInfo, setIsLoadingDomainInfo] = useState(false);

  const { address } = useAccount();
  const currentChainId = pushChainDonut.id; // Always Push Chain for domains

  const validateAddress = (addr: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(addr);
  };

  // All Push domains support cross-chain transfers

  // Initialize domain info - All Push domains are universal
  useEffect(() => {
    // All Push domains are universal by default - use database info
    setDomainInfo({
      isUniversal: true, // All Push domains are universal
      owner: domain.owner_address || address || 'Unknown',
      expiresAt: domain.expiration_date ? new Date(domain.expiration_date).getTime() / 1000 : 0
    });
    setIsLoadingDomainInfo(false);
    console.log('📊 Domain info set: All Push domains are universal');
  }, []); // Empty dependency array - run once on mount



  const handleTransfer = async () => {
    if (!validateAddress(toAddress)) {
      setErrorMessage('Invalid wallet address');
      return;
    }

    if (toAddress.toLowerCase() === address?.toLowerCase()) {
      setErrorMessage('Cannot transfer to your own address');
      return;
    }

    setIsTransferring(true);
    setErrorMessage('');

    try {
      if (!window.ethereum) {
        throw new Error('No wallet connected. Please connect your wallet to transfer domains.');
      }

      const { ethers } = await import('ethers');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signerAddress = await signer.getAddress();
      
      // Check current network
      const network = await provider.getNetwork();
      const currentChainId = Number(network.chainId);
      
      const domainName = domain.name.replace('.push', '');
      
      if (currentChainId === 42101) {
        // On Push Chain - direct transfer
        console.log('📤 Direct transfer on Push Chain...');
        
        const contractAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
        if (!contractAddress) {
          throw new Error('Push Chain contract address not configured');
        }
        
        const contract = new PushNameServiceContract(
          contractAddress,
          signer,
          pushChainDonut.id,
          { env: 'staging', account: signerAddress }
        );
        
        const tx = await contract.transfer(domainName, toAddress);
        const receipt = await tx.wait();
        
        if (!receipt) {
          throw new Error('Transaction receipt not available');
        }
        
        console.log('✅ Direct transfer completed:', receipt.hash);
        
        // Update database
        await domainService.directDomainTransfer(domain.id, address!, toAddress, receipt.hash);
        
        setSuccessMessage(`🎉 Domain transfer completed!\n\nTransaction: ${receipt.hash}`);
        
      } else if (currentChainId === 11155111) {
        // On Ethereum Sepolia - use EthBridge
        console.log('📤 Transfer via EthBridge on Ethereum Sepolia...');
        
        const ethBridgeAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_ADDRESS;
        if (!ethBridgeAddress) {
          throw new Error('EthBridge address not configured');
        }
        
        const ethBridgeABI = [
          'function requestDomainTransfer(string calldata domainName, address toAddress, uint256 targetChainId) external payable',
          'function transferFeeETH() public view returns (uint256)'
        ];
        
        const ethBridge = new ethers.Contract(ethBridgeAddress, ethBridgeABI, signer);
        
        // Get transfer fee
        const transferFee = await ethBridge.transferFeeETH();
        console.log('💰 Transfer fee:', ethers.formatEther(transferFee), 'ETH');
        
        // Request transfer via EthBridge
        const tx = await ethBridge.requestDomainTransfer(
          domainName,
          toAddress,
          42101, // Push Chain target
          { value: transferFee }
        );
        
        console.log('📤 EthBridge transfer request sent:', tx.hash);
        
        const receipt = await tx.wait();
        console.log('✅ EthBridge transfer request confirmed:', receipt.hash);
        
        setSuccessMessage(`🎉 Transfer request submitted!\n\nYour domain will be transferred on Push Chain within 2-5 minutes.\n\nTransaction: ${receipt.hash}`);
        
      } else {
        throw new Error('Please switch to Push Chain Donut (42101) or Ethereum Sepolia (11155111) to transfer domains');
      }

      // Update marketplace listing ownership if domain is listed
      try {
        const { marketplaceService } = await import('@/lib/marketplace');
        const listings = await marketplaceService.getListingsByDomain(domain.id);
        const activeListing = listings.find(listing => listing.status === 'active');
        
        if (activeListing) {
          console.log('📝 Updating marketplace listing ownership...');
          await marketplaceService.updateListingOwnership(activeListing.id, toAddress);
          console.log('✅ Marketplace listing ownership updated');
        }
      } catch (error) {
        console.error('⚠️ Failed to update marketplace listing:', error);
      }
      
      // Close modal after success
      setTimeout(() => {
        onTransferComplete();
        onClose();
      }, 4000);

    } catch (error: any) {
      console.error('❌ Domain transfer failed:', error);
      
      let errorMessage = 'Transfer failed. Please try again.';
      
      if (error.code === 'ACTION_REJECTED') {
        errorMessage = 'Transaction was rejected by user.';
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        errorMessage = 'Insufficient funds for transfer and gas fees.';
      } else if (error.reason) {
        errorMessage = `Transfer failed: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrorMessage(errorMessage);
    } finally {
      setIsTransferring(false);
    }
  };



  const formatAddress = (addr: string) => {
    if (!addr || typeof addr !== 'string') return 'Unknown';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };

  return (
    <TransferModal onClick={onClose}>
      <TransferContent onClick={(e: React.MouseEvent) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>×</CloseButton>
        
        <TransferTitle>📤 Domain Transfer</TransferTitle>
        <TransferSubtitle>
          Transfer your .push domain to another wallet using Universal Signer
        </TransferSubtitle>

        <DomainInfo>
          <DomainName>{domain.name}</DomainName>
          <DomainOwner>Owner: {formatAddress(domain.owner_address || address || 'Unknown')}</DomainOwner>
        </DomainInfo>

        {errorMessage && (
          <ErrorMessage>{errorMessage}</ErrorMessage>
        )}

        {successMessage && (
          <SuccessMessage>{successMessage}</SuccessMessage>
        )}

        <TransferForm>
          {isLoadingDomainInfo ? (
            <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '20px' }}>
              Loading domain information...
            </div>
          ) : (
            <>
              {/* All Push domains are universal - no warning needed */}
              
              {domainInfo && (
                <TransferInfo>
                  <InfoRow>
                    <InfoLabel>🌟 Universal Domain</InfoLabel>
                    <InfoValue>Cross-chain ready</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>🏠 Current Chain</InfoLabel>
                    <InfoValue>Push Chain Donut</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>⚡ Transfer Method</InfoLabel>
                    <InfoValue>Universal Transaction</InfoValue>
                  </InfoRow>
                </TransferInfo>
              )}

              {/* Transfer Info - Network Dependent */}
              {domainInfo && (
                <TransferInfo>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '12px', color: '#22c55e' }}>
                    📤 Transfer Details
                  </div>
                  <InfoRow>
                    <InfoLabel>🏠 Current Network:</InfoLabel>
                    <InfoValue>Auto-detected</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>⚡ Method:</InfoLabel>
                    <InfoValue>Universal Bridge</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>💰 Fee:</InfoLabel>
                    <InfoValue>0.0002 ETH (Sepolia) / 0.0001 PC (Push Chain)</InfoValue>
                  </InfoRow>
                  <InfoRow>
                    <InfoLabel>⏱️ Time:</InfoLabel>
                    <InfoValue>~30 seconds (Push) / 2-5 min (Sepolia)</InfoValue>
                  </InfoRow>
                </TransferInfo>
              )}

              {/* Recipient Address - All Push domains are universal */}
              {domainInfo && (
                <>
                  <InputGroup>
                    <Label>📍 Recipient Wallet Address</Label>
                    <div style={{ fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                      Enter the wallet address that will receive the domain on Push Chain:
                    </div>
                    <AddressInput
                      type="text"
                      placeholder="0x1234567890123456789012345678901234567890"
                      value={toAddress}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setToAddress(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                    />
                  </InputGroup>

                  <TransferButton
                    onClick={handleTransfer}
                    disabled={
                      isTransferring || 
                      !toAddress.trim() || 
                      !validateAddress(toAddress)
                    }
                  >
                    <FaPaperPlane />
                    {isTransferring 
                      ? '📤 Processing Transfer...'
                      : '📤 Transfer Domain'
                    }
                  </TransferButton>
                </>
              )}

              {/* All Push domains are universal - no disabled state needed */}
            </>
          )}
        </TransferForm>


      </TransferContent>
    </TransferModal>
  );
};
"use client";

import styled from 'styled-components';
import { useState, useEffect } from 'react';
import { FaGlobe, FaInfoCircle } from 'react-icons/fa';
import { Domain, domainService } from '@/lib/supabase';
import { getMarketplaceContract } from '@/lib/marketplaceContract';
import { getOmnichainContract } from '@/lib/contract';
import { supportedChains, getChainConfig, getContractAddresses } from '@/config/chains';
import { useChainId } from 'wagmi';
import { ethers } from 'ethers';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  backdrop-filter: blur(4px);
`;

const Card = styled.div`
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 16px;
  padding: 24px;
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0 0 16px 0;
  font-size: 1.25rem;
  font-weight: 600;
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.12);
  color: #fff;
  font-size: 1rem;
  box-sizing: border-box;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
  }
  
  &:focus {
    outline: none;
    border-color: #00d2ff;
    box-shadow: 0 0 0 2px rgba(0, 210, 255, 0.2);
  }
`;

const Row = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const Button = styled.button`
  flex: 1;
  padding: 14px 20px;
  border: 0;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(135deg, #22c55e 0%, #065f46 100%);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
  }
  
  &:disabled { 
    opacity: 0.6; 
    cursor: not-allowed;
    transform: none;
  }
`;

// Cross-chain components removed - all Push domains are automatically cross-chain

const DomainTypeInfo = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin: 16px 0;
  color: #ffc107;
  font-size: 0.9rem;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.5;
`;

interface Props {
  domain: Domain;
  sellerAddress: string;
  onClose: () => void;
  onListed: () => void;
}

export default function CreateListingModal({ domain, sellerAddress, onClose, onListed }: Props) {
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const allowCrossChain = true; // All Push domains support cross-chain trading
  const [domainInfo, setDomainInfo] = useState<any>(null);
  const [isLoadingDomainInfo, setIsLoadingDomainInfo] = useState(false);
  
  const currentChainId = useChainId() || 421614;

  // All Push domains support cross-chain trading
  useEffect(() => {
    setIsLoadingDomainInfo(true);
    
    // All Push domains are universal by default
    setDomainInfo({
      isOmnichain: true, // All Push domains support universal trading
      owner: domain.owner_address,
      expiresAt: domain.expiration_date ? new Date(domain.expiration_date).getTime() / 1000 : 0
    });
    
    setIsLoadingDomainInfo(false);
  }, []); // Empty dependency array - run once on mount

  const submit = async () => {
    setError('');
    if (!price || isNaN(Number(price)) || Number(price) <= 0) {
      setError('Enter a valid price in PC');
      return;
    }
    if (!window.ethereum) {
      setError('Wallet not found');
      return;
    }
    try {
      setLoading(true);
      const name = domain.name.replace('.push', '').replace('.ctc', '');
      console.log('🔍 Listing domain:', domain.name, '→', name);
      const priceWei = ethers.parseEther(price);
      
      // Check if user is on Push Chain
      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();
      console.log('🌐 Current network:', network.chainId);
      
      if (Number(network.chainId) !== 42101) {
        setError('Please switch to Push Chain Donut Testnet (Chain ID: 42101) to list domains');
        return;
      }
      
      // Verify domain ownership before listing
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      console.log('👤 User address:', userAddress);
      
      // Check if user owns the domain
      const contractAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
      if (!contractAddress) {
        setError('Push Chain Name Service contract not configured');
        return;
      }
      
      const nsContract = new ethers.Contract(
        contractAddress,
        [
          'function ownerOf(string calldata name) external view returns (address)',
          'function getDomainInfo(string calldata name) external view returns (address owner, uint64 expiration, uint256 sourceChainId, bool isUniversal, bool isExpired, string memory ipfsHash)'
        ],
        provider
      );
      
      console.log('📋 Checking domain ownership for:', name);
      const domainOwner = await nsContract.ownerOf(name);
      console.log('👤 Domain owner:', domainOwner);
      console.log('🔍 Zero address:', ethers.ZeroAddress);
      
      const domainInfo = await nsContract.getDomainInfo(name);
      console.log('📋 Domain info:', domainInfo);
      const isExpired = domainInfo.isExpired; // Contract already calculates this
      
      if (domainOwner === ethers.ZeroAddress) {
        setError('Domain is not registered');
        return;
      }
      
      if (domainOwner.toLowerCase() !== userAddress.toLowerCase()) {
        setError('You do not own this domain');
        return;
      }
      
      if (isExpired) {
        setError('Domain has expired');
        return;
      }
      
      console.log('📋 Listing domain for price:', ethers.formatEther(priceWei), 'PC');
      console.log('📤 Using Universal Signer for listing...');
      
      // Use universal signer for listing
      const { universalSigner } = await import('@/lib/universalSigner');
      
      const result = await universalSigner.listDomain(name, priceWei.toString());
      
      console.log('✅ Domain listed successfully:', result.txHash);
      
      const txHash = result.txHash;

      await marketplaceCreate(domain.id, sellerAddress, price, txHash, allowCrossChain);
      onListed();
      onClose();
    } catch (e: any) {
      console.error('Listing error:', e);
      setError(e.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  const marketplaceCreate = async (domainId: string, seller: string, priceEth: string, tx?: string, crossChain?: boolean) => {
    await domainService; // keep import used
    console.log('📝 Creating marketplace listing in Supabase...');
    console.log('Domain ID:', domainId);
    console.log('Seller:', seller);
    console.log('Price:', priceEth);
    console.log('Transaction:', tx);
    
    // Use marketplaceService from lib
    const { marketplaceService } = await import('@/lib/marketplace');
    
    try {
      // Create listing without listing_type for now
      const { supabase } = await import('@/lib/supabase');
      const result = await supabase
        .from('push_marketplace_listings')
        .insert({
          domain_id: domainId,
          seller_address: seller,
          price: priceEth,
          currency: 'PC',
          chain_id: 42101, // Push Chain
          status: 'active',
          listing_transaction_hash: tx
        })
        .select()
        .single();
      console.log('✅ Listing created successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to create listing in Supabase:', error);
      throw error;
    }
  };

  return (
    <Backdrop onClick={onClose}>
      <Card onClick={(e) => e.stopPropagation()}>
        <Title>List {domain.name}</Title>
        <div style={{ color: 'rgba(255,255,255,0.7)', marginBottom: 12, fontSize: '0.95rem' }}>
          Enter price in PC (Push Chain)
        </div>
        <Input 
          placeholder="e.g. 0.1 PC" 
          value={price} 
          onChange={(e) => setPrice(e.target.value)} 
        />
        
        <div style={{ 
          background: 'rgba(34, 197, 94, 0.1)', 
          border: '1px solid rgba(34, 197, 94, 0.3)', 
          borderRadius: '8px', 
          padding: '12px', 
          margin: '16px 0',
          fontSize: '0.9rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Listing Fee:</span>
            <span style={{ color: '#22c55e', fontWeight: '600' }}>
              {(() => {
                const chainConfig = getChainConfig(currentChainId);
                return chainConfig ? `${chainConfig.listingFee} ${chainConfig.currency}` : '0.0001 ETH';
              })()}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Network:</span>
            <span style={{ color: '#22c55e', fontWeight: '600' }}>
              {(() => {
                const chainConfig = getChainConfig(currentChainId);
                return chainConfig?.name || 'Current Network';
              })()}
            </span>
          </div>
        </div>
        
        {isLoadingDomainInfo ? (
          <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.7)', padding: '20px' }}>
            Loading domain information...
          </div>
        ) : (
          <>
            {/* All Push domains automatically support cross-chain trading */}
          </>
        )}

        {error && (
          <div style={{ 
            color: '#ef4444', 
            marginTop: 16, 
            padding: '12px 16px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            fontSize: '0.9rem'
          }}>
            {error}
          </div>
        )}
        <Row>
          <Button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)'
            }}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading || isLoadingDomainInfo}>
            {loading ? 'Listing...' : 'Create Universal Listing'}
          </Button>
        </Row>
      </Card>
    </Backdrop>
  );
}



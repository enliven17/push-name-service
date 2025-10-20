"use client";

import React from 'react';
import styled from 'styled-components';
import { FaCheck, FaExternalLinkAlt, FaTimes } from 'react-icons/fa';

interface RegistrationSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  domainName: string;
  ethSepoliaTxHash?: string;
  pushChainTxHash?: string;
  registrationMethod: 'direct' | 'gasless';
}

const ModalOverlay = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(10px);
  display: ${props => props.isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 32px;
  max-width: 500px;
  width: 90%;
  position: relative;
  text-align: center;
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

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, #22c55e 0%, #065f46 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px auto;
  font-size: 2rem;
  color: white;
`;

const Title = styled.h2`
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.p`
  color: rgba(255, 255, 255, 0.8);
  font-size: 1rem;
  margin: 0 0 32px 0;
`;

const DomainName = styled.div`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  font-size: 1.2rem;
  font-weight: 600;
  color: #00d2ff;
`;

const ExplorerSection = styled.div`
  margin-bottom: 24px;
`;

const ExplorerTitle = styled.h3`
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 16px 0;
  text-align: left;
`;

const ExplorerLinks = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ExplorerLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  color: white;
  text-decoration: none;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
`;

const ExplorerInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
`;

const ExplorerName = styled.div`
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 2px;
`;

const ExplorerTxHash = styled.div`
  font-size: 0.8rem;
  color: rgba(255, 255, 255, 0.7);
  font-family: monospace;
`;

const ExplorerIcon = styled.div`
  margin-left: 12px;
  opacity: 0.7;
`;

const InfoBox = styled.div`
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 24px;
  text-align: left;
`;

const InfoText = styled.p`
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.9rem;
  margin: 0;
  line-height: 1.4;
`;

const CloseModalButton = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  border: none;
  border-radius: 12px;
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
  }
`;

export const RegistrationSuccessModal: React.FC<RegistrationSuccessModalProps> = ({
  isOpen,
  onClose,
  domainName,
  ethSepoliaTxHash,
  pushChainTxHash,
  registrationMethod
}) => {
  const formatTxHash = (hash: string) => {
    if (hash.length <= 16) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-8)}`;
  };

  const getEthSepoliaExplorerUrl = (txHash: string) => {
    return `https://sepolia.etherscan.io/tx/${txHash}`;
  };

  const getPushChainExplorerUrl = (txHash: string) => {
    return `https://donut.push.network/tx/${txHash}`;
  };

  return (
    <ModalOverlay isOpen={isOpen} onClick={onClose}>
      <ModalContent onClick={(e) => e.stopPropagation()}>
        <CloseButton onClick={onClose}>
          <FaTimes />
        </CloseButton>
        
        <SuccessIcon>
          <FaCheck />
        </SuccessIcon>
        
        <Title>🎉 Registration Successful!</Title>
        <Subtitle>Your domain has been successfully registered</Subtitle>
        
        <DomainName>{domainName}</DomainName>
        
        {registrationMethod === 'gasless' && (
          <InfoBox>
            <InfoText>
              <strong>Gasless Registration:</strong> You paid the fee on Ethereum Sepolia, 
              and we registered your domain on Push Chain using Universal Signer technology.
            </InfoText>
          </InfoBox>
        )}
        
        <ExplorerSection>
          <ExplorerTitle>🔍 View on Block Explorers</ExplorerTitle>
          <ExplorerLinks>
            {ethSepoliaTxHash && (
              <ExplorerLink
                href={getEthSepoliaExplorerUrl(ethSepoliaTxHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExplorerInfo>
                  <ExplorerName>🔷 Ethereum Sepolia</ExplorerName>
                  <ExplorerTxHash>{formatTxHash(ethSepoliaTxHash)}</ExplorerTxHash>
                </ExplorerInfo>
                <ExplorerIcon>
                  <FaExternalLinkAlt />
                </ExplorerIcon>
              </ExplorerLink>
            )}
            
            {pushChainTxHash && (
              <ExplorerLink
                href={getPushChainExplorerUrl(pushChainTxHash)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExplorerInfo>
                  <ExplorerName>🍩 Push Chain Donut</ExplorerName>
                  <ExplorerTxHash>{formatTxHash(pushChainTxHash)}</ExplorerTxHash>
                </ExplorerInfo>
                <ExplorerIcon>
                  <FaExternalLinkAlt />
                </ExplorerIcon>
              </ExplorerLink>
            )}
          </ExplorerLinks>
        </ExplorerSection>
        
        <CloseModalButton onClick={onClose}>
          Continue to Dashboard
        </CloseModalButton>
      </ModalContent>
    </ModalOverlay>
  );
};
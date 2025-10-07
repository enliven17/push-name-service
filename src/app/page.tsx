"use client";

import styled from 'styled-components';
import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaUser, FaWallet, FaSignOutAlt, FaGlobe, FaCheck, FaTimes, FaPaperPlane, FaInbox, FaTag, FaChevronUp, FaChevronDown, FaExclamationTriangle } from 'react-icons/fa';
import { createNoise3D } from "simplex-noise";
import { useWallet } from '@/contexts/WalletContext';
import { domainService, Domain as SupabaseDomain } from '@/lib/supabase';
import PushNameServiceContract from '@/lib/pushNameServiceContract';
import { useChainId } from 'wagmi';
import { DomainTransfer } from '@/components/DomainTransfer';
import CreateListingModal from '@/components/CreateListingModal';
import { MarketplaceListings } from '@/components/MarketplaceListings';
import { marketplaceService } from '@/lib/marketplace';
import { useNotification } from '@/components/Notification';
import { ConfirmationModal } from '@/components/ConfirmationModal';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useDisconnect as useWagmiDisconnect } from 'wagmi';
import { supportedChains, getChainConfig } from '@/config/chains';
import NetworkSwitcher from '@/components/NetworkSwitcher';
import NetworkInfo from '@/components/NetworkInfo';

// Scramble animation hook
const useScrambleText = (text: string, duration: number = 2000) => {
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

  const scrambleChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  const startAnimation = () => {
    setIsAnimating(true);
    const startTime = Date.now();
    const textLength = text.length;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      let result = '';
      for (let i = 0; i < textLength; i++) {
        if (text[i] === ' ') {
          result += ' ';
          continue;
        }

        // Each character reveals progressively from left to right
        const charProgress = Math.max(0, Math.min(1, (progress * 1.5) - (i / textLength) * 0.5));
        
        if (charProgress >= 0.8) {
          result += text[i];
        } else if (charProgress > 0.2) {
          // Mix of correct character and random characters
          const shouldShowCorrect = Math.random() < (charProgress - 0.2) / 0.6;
          if (shouldShowCorrect) {
            result += text[i];
          } else {
            // Use similar character types for better visual effect
            const isUpperCase = text[i] >= 'A' && text[i] <= 'Z';
            const isLowerCase = text[i] >= 'a' && text[i] <= 'z';
            const isNumber = text[i] >= '0' && text[i] <= '9';
            
            let charSet = scrambleChars;
            if (isUpperCase) charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            else if (isLowerCase) charSet = 'abcdefghijklmnopqrstuvwxyz';
            else if (isNumber) charSet = '0123456789';
            
            result += charSet[Math.floor(Math.random() * charSet.length)];
          }
        } else {
          result += scrambleChars[Math.floor(Math.random() * scrambleChars.length)];
        }
      }

      setDisplayText(result);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayText(text);
        setIsAnimating(false);
      }
    };

    animate();
  };

  return { displayText, startAnimation, isAnimating };
};

// Scramble Text Component
const ScrambleText: React.FC<{ text: string; delay?: number; duration?: number }> = ({ 
  text, 
  delay = 500, 
  duration = 2000 
}) => {
  const { displayText, startAnimation } = useScrambleText(text, duration);
  const [hasStarted, setHasStarted] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    // Fade in first
    const fadeTimer = setTimeout(() => {
      setOpacity(1);
    }, delay - 200);

    // Then start scramble
    const scrambleTimer = setTimeout(() => {
      if (!hasStarted) {
        startAnimation();
        setHasStarted(true);
      }
    }, delay);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(scrambleTimer);
    };
  }, [delay, startAnimation, hasStarted]);

  return (
    <span style={{ 
      opacity, 
      transition: 'opacity 0.5s ease-in-out',
      display: 'inline-block',
      whiteSpace: 'pre-wrap'
    }}>
      {displayText || text}
    </span>
  );
};

// Domain types
interface DomainSearchResult {
  name: string;
  available: boolean;
  price: string;
}

const PageContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  background: linear-gradient(135deg, #1a0b1a 0%, #2d1b2d 50%, #1a0b1a 100%);
  padding: 20px;
  padding-bottom: 80px;
`;

const Canvas = styled.canvas`
  position: fixed;
  top: 0;
  left: -100px;
  width: calc(100vw + 200px);
  height: 100vh;
  z-index: 0;
`;

const GlassCard = styled.div<{ $isVisible?: boolean }>`
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-radius: 32px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 48px 40px;
  max-width: 520px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 10;
  transition: all 0.6s ease;
  opacity: ${props => props.$isVisible ? 1 : 0};
  transform: ${props => props.$isVisible ? 'translateY(0)' : 'translateY(30px)'};
  
  &:hover {
    transform: ${props => props.$isVisible ? 'translateY(-2px)' : 'translateY(30px)'};
    box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.35);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
`;

const Header = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  margin-bottom: 40px;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 8px 0;
  letter-spacing: -0.5px;
  min-height: 1.2em;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 40px 0;
  text-align: center;
  min-height: 1.5em;
`;

const SearchContainer = styled.div`
  width: 100%;
  margin-bottom: 32px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 16px 20px;
  transition: all 0.3s ease;
  width: 100%;
  max-width: 100%;
  
  &:focus-within {
    border-color: #ec4899;
    background: rgba(255, 255, 255, 0.15);
  }
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
  min-width: 0;
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.5);
    font-size: 1rem;
  }
  
  @media (max-width: 480px) {
    font-size: 1rem;
    
    &::placeholder {
      font-size: 0.9rem;
    }
  }
`;

const DomainExtension = styled.span`
  color: rgba(255, 255, 255, 0.7);
  font-size: 1.1rem;
  font-weight: 500;
  margin-left: 4px;
  flex-shrink: 0;
  
  @media (max-width: 480px) {
    font-size: 1rem;
  }
`;

const SearchButton = styled.button`
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  border: none;
  border-radius: 12px;
  padding: 12px 10px;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-left: 8px;
  display: flex;
  align-items: center;
  gap: 3px;
  white-space: nowrap;
  min-width: 65px;
  max-width: 65px;
  flex-shrink: 0;
  justify-content: center;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  @media (max-width: 480px) {
    min-width: 55px;
    max-width: 55px;
    padding: 12px 8px;
    font-size: 0.75rem;
    margin-left: 6px;
  }
`;

const DomainResult = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.12);
  }
`;

const DomainHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const DomainName = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  color: white;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const AvailabilityBadge = styled.div<{ $available: boolean }>`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  background: ${props => props.$available ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.$available ? '#ec4899' : '#ef4444'};
  border: 1px solid ${props => props.$available ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
`;

const DomainInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PriceInfo = styled.div`
  text-align: right;
`;

const Price = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  color: white;
`;

const PriceLabel = styled.div`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
`;

const UniversalOption = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 16px;
  background: rgba(0, 210, 255, 0.1);
  border: 1px solid rgba(0, 210, 255, 0.2);
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(0, 210, 255, 0.15);
    border-color: rgba(0, 210, 255, 0.3);
  }
`;

const UniversalCheckbox = styled.input`
  width: 20px;
  height: 20px;
  accent-color: #ec4899;
  cursor: pointer;
`;

const UniversalLabel = styled.label`
  color: white;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  flex: 1;
  
  .highlight {
    color: #ec4899;
    font-weight: 600;
  }
  
  .description {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.85rem;
    margin-top: 4px;
    display: block;
  }
`;

const RegisterButton = styled.button`
  width: 100%;
  padding: 16px 0;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    background: rgba(255, 255, 255, 0.2);
  }
`;

// Legacy WalletButton removed

// Legacy Wallet modal components removed

const NetworkWarning = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-top: 16px;
  color: #ffc107;
  font-size: 0.9rem;
  text-align: center;
`;

const DevnetBanner = styled.div`
  background: rgba(255, 193, 7, 0.1);
  border: 1px solid rgba(255, 193, 7, 0.3);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
  color: #ffc107;
  font-size: 0.9rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const NetworkButton = styled.button`
  background: linear-gradient(135deg, #ffc107 0%, #ff8c00 100%);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  color: white;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(255, 193, 7, 0.3);
  }
`;

const DisconnectButton = styled.button`
  width: 100%;
  height: 56px;
  padding: 0 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 20px;
  background: transparent;
  color: rgba(255, 255, 255, 0.8);
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.5);
    color: white;
  }
`;

const BottomNavigation = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(236, 72, 153, 0.08);
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(236, 72, 153, 0.25);
  border-radius: 25px;
  padding: 12px 24px;
  display: flex;
  justify-content: space-around;
  align-items: center;
  z-index: 100;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  min-width: 200px;
  max-width: 300px;
`;

const NavItem = styled.div<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 8px 12px;
  border-radius: 16px;
  background: ${props => props.$active ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'transparent'};
  min-width: 60px;
  
  &:hover {
    background: ${props => props.$active ? 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)' : 'rgba(236, 72, 153, 0.12)'};
    transform: translateY(-2px);
  }
`;

const NavText = styled.span<{ $active?: boolean }>`
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  transition: all 0.3s ease;
  text-align: center;
`;

const SearchView = styled.div`
  width: 100%;
  animation: fadeIn 0.2s ease-in-out;
`;

const ProfileView = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.2s ease-in-out;
`;

const ProfileTitle = styled.h3`
  font-size: 1.2rem;
  font-weight: 600;
  color: white;
  margin: 0 0 8px 0;
`;

const ProfileSubtitle = styled.p`
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 32px 0;
`;

const DomainsContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

const DomainsHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-shrink: 0;
`;

const DomainCounter = styled.span`
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.9rem;
`;

const NavigationControls = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const NavButton = styled.button<{ disabled?: boolean }>`
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

const DomainViewport = styled.div<{ itemCount: number }>`
  height: ${props => Math.min(props.itemCount, 2) * 180}px; /* Dynamic height based on item count */
  overflow: hidden;
  position: relative;
`;

const DomainList = styled.div<{ currentIndex: number }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  transform: translateY(${props => -props.currentIndex * 180}px);
  transition: transform 0.3s ease;
`;

const TransferList = styled.div<{ currentIndex: number }>`
  display: flex;
  flex-direction: column;
  gap: 16px;
  transform: translateY(${props => -props.currentIndex * 180}px);
  transition: transform 0.3s ease;
`;

const LoadingScreen = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 9999;
`;

const LoadingSpinner = styled.div`
  width: 50px;
  height: 50px;
  border: 3px solid rgba(34, 197, 94, 0.3);
  border-top: 3px solid #ec4899;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const LoadingText = styled.div`
  color: white;
  font-size: 1.1rem;
  font-weight: 500;
`;

const DomainCard = styled.div`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 20px;
  height: 164px; /* Fixed height for consistent spacing */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: all 0.3s ease;
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.12);
  }
`;

const DomainCardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`;

const DomainCardName = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0;
`;

const DomainStatus = styled.span<{ status: 'active' | 'expired' }>`
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
  background: ${props => props.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
  color: ${props => props.status === 'active' ? '#ec4899' : '#ef4444'};
  border: 1px solid ${props => props.status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
`;

const ListingStatus = styled.span`
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(236, 72, 153, 0.2);
  color: #ec4899;
  border: 1px solid rgba(236, 72, 153, 0.3);
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DomainStatusContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

const DomainCardInfo = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 12px;
`;

const DomainActions = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  background: rgba(236, 72, 153, 0.2);
  border: 1px solid rgba(236, 72, 153, 0.3);
  border-radius: 8px;
  padding: 6px 12px;
  color: #ec4899;
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 4px;
  
  &:hover {
    background: rgba(59, 130, 246, 0.3);
    border-color: rgba(59, 130, 246, 0.5);
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
`;

const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const EmptyStateText = styled.p`
  font-size: 1rem;
  margin: 0;
`;

const UniversalBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: linear-gradient(135deg, #ec4899 0%, #be185d 100%);
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
  border: 1px solid rgba(0, 210, 255, 0.3);
  box-shadow: 0 2px 8px rgba(0, 210, 255, 0.2);
  animation: universalGlow 2s ease-in-out infinite alternate;
  
  @keyframes universalGlow {
    from {
      box-shadow: 0 2px 8px rgba(0, 210, 255, 0.2);
    }
    to {
      box-shadow: 0 4px 16px rgba(0, 210, 255, 0.4);
    }
  }
`;

const DomainCardHeaderWithBadge = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  gap: 8px;
`;

const DomainNameWithBadge = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
`;

const BadgeContainer = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
`;

const NetworkBadge = styled.div<{ color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  background: ${props => `linear-gradient(135deg, ${props.color}20 0%, ${props.color}10 100%)`};
  border: 1px solid ${props => `${props.color}40`};
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  color: ${props => props.color};
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
  animation: fadeIn 0.3s ease-in-out;
`;

const NetworkWarningBanner = styled.div`
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  color: #ef4444;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: center;
  animation: fadeIn 0.3s ease-in-out;
`;

// Add keyframes for animations
const GlobalStyle = styled.div`
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;

export default function Home() {
  // Legacy wallet modal removed; RainbowKit ConnectButton is used
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<DomainSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [userDomains, setUserDomains] = useState<SupabaseDomain[]>([]);
  const [userListings, setUserListings] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('search');
  const [currentDomainIndex, setCurrentDomainIndex] = useState(0);
  const [currentTransferIndex, setCurrentTransferIndex] = useState(0);
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isCardVisible, setIsCardVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [transferDomain, setTransferDomain] = useState<SupabaseDomain | null>(null);
  const [listDomain, setListDomain] = useState<SupabaseDomain | null>(null);
  const [transferHistory, setTransferHistory] = useState<any[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  const [devnetIssue, setDevnetIssue] = useState(false);
  const [makeUniversal, setMakeUniversal] = useState(false);
  const [domainInfoCache, setDomainInfoCache] = useState<{[key: string]: any}>({});

  const { showSuccess, showError, showWarning, NotificationContainer } = useNotification();

  const { isConnected, address, connect, disconnect, isLoading } = useWallet();
  const wagmiAccount = useAccount();
  const chainId = useChainId();
  const { disconnect: wagmiDisconnect } = useWagmiDisconnect();
  const walletConnected = isConnected || wagmiAccount.isConnected;
  const currentAddress = address || wagmiAccount.address;
  const currentChainId = chainId || 421614;
  const canvasRef = useRef<HTMLCanvasElement>(null);


  
  // Check if user is on a supported network
  const isWrongNetwork = walletConnected && !supportedChains.find(chain => chain.id === currentChainId);

  // Load user domains when wallet connects
  useEffect(() => {
    if (walletConnected && currentAddress) {
      loadUserDomains();
      loadTransferHistory();
      loadUserListings();
    }
  }, [walletConnected, currentAddress]);

  // Show devnet congestion warning if registration takes too long
  useEffect(() => {
    let timer: any;
    if (isRegistering) {
      timer = setTimeout(() => {
        setDevnetIssue(true);
        setIsRegistering(false); // exit waiting state after warning
        showWarning('Network Delay', 'The network may be congested. Your transaction might take longer than usual.');
      }, 30000); // 30s
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isRegistering, showWarning]);

  // Domain search function
  const searchDomain = async (): Promise<void> => {
    const trimmedQuery = searchQuery.trim();
    
    if (!trimmedQuery) return;
    
    // Clear previous error
    setErrorMessage('');
    
    // Check minimum length
    if (trimmedQuery.length < 3) {
      setErrorMessage('Domain name must be at least 3 characters long');
      return;
    }
    
    // Check for valid characters (alphanumeric and hyphens)
    const validPattern = /^[a-zA-Z0-9-]+$/;
    if (!validPattern.test(trimmedQuery)) {
      setErrorMessage('Domain name can only contain letters, numbers, and hyphens');
      return;
    }
    
    // Check if starts or ends with hyphen
    if (trimmedQuery.startsWith('-') || trimmedQuery.endsWith('-')) {
      setErrorMessage('Domain name cannot start or end with a hyphen');
      return;
    }

    setIsSearching(true);
    try {
      // Check availability from database only (disable on-chain checks)
      let databaseAvailable = true;
      try {
        databaseAvailable = await domainService.checkAvailability(trimmedQuery.toLowerCase());
        console.log('📊 Database check result:', databaseAvailable);
      } catch (error) {
        console.warn('⚠️ Database check failed:', error);
      }
      
      // Domain availability is determined solely by database
      const isAvailable = databaseAvailable;
      
      // Get dynamic price from contract if available
      let price = '0.001 PC';
      try {
        if (window.ethereum && walletConnected) {
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const signerAddress = await signer.getAddress();
          
          const contractAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
          if (contractAddress && signerAddress) {
            const contract = new PushNameServiceContract(
              contractAddress,
              signer,
              currentChainId,
              { env: 'staging', account: signerAddress }
            );
            
            const registrationCost = await contract.getRegistrationCost();
            const chainConfig = getChainConfig(currentChainId);
            price = `${ethers.formatEther(registrationCost)} ${chainConfig?.currency || 'PC'}`;
            console.log('💰 Real contract price:', price);
          }
        } else {
          // Fallback to config price
          const chainConfig = getChainConfig(currentChainId);
          price = chainConfig ? `${chainConfig.registrationPrice} ${chainConfig.currency}` : '0.001 PC';
        }
      } catch (error) {
        console.warn('⚠️ Failed to get contract price, using fallback:', error);
        const chainConfig = getChainConfig(currentChainId);
        price = chainConfig ? `${chainConfig.registrationPrice} ${chainConfig.currency}` : '0.001 PC';
      }
      
      setSearchResult({
        name: trimmedQuery.toLowerCase(),
        available: isAvailable,
        price: price
      });
    } catch (error) {
      console.error('Domain search failed:', error);
      setErrorMessage('Domain search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  // Register domain function (with universal support)
  const registerDomain = async () => {
    if (!searchResult || !walletConnected || !currentAddress) {
      showError('Registration Failed', 'Please connect your wallet first.');
      return;
    }

    const universalText = makeUniversal ? ' as a universal domain' : '';
    const universalNote = makeUniversal ? ' This domain will be transferable across multiple blockchains via Push Protocol.' : '';

    // Show confirmation modal
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Domain Registration',
      message: `You are about to register "${searchResult.name}.push"${universalText} for ${searchResult.price} (1 year).${universalNote} This transaction cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        
        setIsRegistering(true);
        try {
          let transactionHash = '';
          
          // Register on-chain (REQUIRED - no fallback)
          if (!window.ethereum) {
            throw new Error('No wallet connected. Please connect your wallet to register domains.');
          }
          
          console.log('🔗 Starting blockchain registration...');
          console.log('🌐 Make universal:', makeUniversal);
          console.log('💰 This will cost', searchResult.price, '+ gas fees');
          
          // Initialize Push Protocol contract
          const { ethers } = await import('ethers');
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          
          // Get current address from signer
          const signerAddress = await signer.getAddress();
          console.log('👤 Signer address:', signerAddress);
          
          // Get contract address from environment
          const contractAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
          if (!contractAddress) {
            throw new Error('Contract address not configured');
          }
          
          console.log('📍 Contract address:', contractAddress);
          
          // Initialize contract
          const contract = new PushNameServiceContract(
            contractAddress,
            signer,
            currentChainId,
            { env: 'staging', account: signerAddress }
          );
          
          await contract.initialize();
          
          // Get registration cost from contract
          const registrationCost = await contract.getRegistrationCost();
          console.log('💰 Registration cost:', ethers.formatEther(registrationCost), 'PC');
          
          // Send registration transaction
          const tx = await contract.register(searchResult.name, makeUniversal, registrationCost);
          transactionHash = tx.hash;
          
          console.log('📤 Transaction sent:', transactionHash);
          
          // Wait for confirmation
          const receipt = await tx.wait();
          console.log('✅ Transaction confirmed:', receipt.hash);

          // Register in database after successful blockchain transaction
          try {
            const newDomain = await domainService.registerDomain(
              searchResult.name,
              signerAddress,
              ethers.formatEther(registrationCost),
              transactionHash
            );
            console.log('💾 Domain saved to database:', newDomain);
          } catch (dbError) {
            console.warn('⚠️ Database save failed, but blockchain registration succeeded:', dbError);
          }

          // Refresh user domains from database
          await loadUserDomains();
          setSearchResult(null);
          setSearchQuery('');
          setMakeUniversal(false); // Reset universal option
          
          // Success notification
          const successMessage = makeUniversal 
            ? `${searchResult.name}.push has been registered as a universal domain! You can now transfer it across multiple blockchains using Push Protocol.\n\nTransaction: ${transactionHash}`
            : `${searchResult.name}.push has been registered successfully!\n\nTransaction: ${transactionHash}`;
            
          showSuccess(
            'Domain Registered Successfully!',
            successMessage
          );
        } catch (error: any) {
          console.error('❌ Domain registration failed:', error);
          
          let errorMessage = 'Failed to register domain. Please try again.';
          
          if (error.code === 'ACTION_REJECTED') {
            errorMessage = 'Transaction was rejected by user.';
          } else if (error.code === 'INSUFFICIENT_FUNDS') {
            errorMessage = 'Insufficient funds for registration and gas fees.';
          } else if (error.message?.includes('user rejected')) {
            errorMessage = 'Transaction was rejected by user.';
          } else if (error.reason) {
            errorMessage = `Registration failed: ${error.reason}`;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          showError('Registration Failed', errorMessage);
        } finally {
          setIsRegistering(false);
        }
      }
    });
  };

  // Load domain info from blockchain
  const loadDomainInfo = async (domainName: string) => {
    if (!window.ethereum || domainInfoCache[domainName]) return domainInfoCache[domainName];

    try {
      // Push Protocol contract will be used here
      // const contract = new PushNameServiceContract(contractAddress, signer, currentChainId, pushConfig);
      const cleanName = domainName.replace('.push', '');
      
      // const info = await contract.getDomainInfo(cleanName);
      // For now, return default info
      const info = {
        owner: currentAddress || '0x0000000000000000000000000000000000000000',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        sourceChainId: currentChainId,
        isUniversal: false,
        isExpired: false
      };
      
      // Cache the result
      setDomainInfoCache(prev => ({
        ...prev,
        [domainName]: info
      }));
      
      return info;
    } catch (error: any) {
      // For domains that don't exist on-chain, create a default info
      const defaultInfo = {
        owner: currentAddress || '0x0000000000000000000000000000000000000000',
        expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
        sourceChainId: currentChainId,
        isUniversal: false,
        isExpired: false
      };
      
      // Cache the default result
      setDomainInfoCache(prev => ({
        ...prev,
        [domainName]: defaultInfo
      }));
      
      return defaultInfo;
    }
  };

  // Load user domains
  const loadUserDomains = async () => {
    if (!currentAddress) return;

    try {
      const domains = await domainService.getDomainsByOwner(currentAddress);
      
      // Add .push extension for display
      const displayDomains = domains.map(domain => ({
        ...domain,
        name: domain.name + '.push'
      }));
      
      setUserDomains(displayDomains);

      // Load domain info for each domain in background
      displayDomains.forEach(domain => {
        loadDomainInfo(domain.name); // domain.name already includes .push
      });

      // For domains without blockchain info, set default network info based on registration date
      displayDomains.forEach(domain => {
        if (!domainInfoCache[domain.name]) {
          // Domains registered before a certain date are likely on Arbitrum Sepolia
          const registrationDate = new Date(domain.registration_date);
          const cutoffDate = new Date('2024-01-01'); // Adjust this date as needed
          
          const defaultChainId = registrationDate < cutoffDate ? 421614 : currentChainId; // Arbitrum Sepolia for old domains
          
          setDomainInfoCache(prev => ({
            ...prev,
            [domain.name]: {
              owner: domain.owner_address,
              expiresAt: new Date(domain.expiration_date).getTime(),
              sourceChainId: defaultChainId,
              isUniversal: false,
              isExpired: new Date(domain.expiration_date) < new Date()
            }
          }));
        }
      });
    } catch (error) {
      console.error('Failed to load user domains:', error);
    }
  };

  // Load transfer history
  const loadTransferHistory = async () => {
    if (!currentAddress) return;

    try {
      const transfers = await domainService.getTransferHistory(currentAddress);
      setTransferHistory(transfers);
    } catch (error) {
      console.error('Failed to load transfer history:', error);
    }
  };

  // Load user marketplace listings
  const loadUserListings = async () => {
    if (!currentAddress) return;

    try {
      const listings = await marketplaceService.getListingsBySeller(currentAddress);
      setUserListings(listings);
    } catch (error) {
      console.error('Failed to load user listings:', error);
      // Set empty array to prevent undefined errors
      setUserListings([]);
    }
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Check if domain is currently listed in marketplace
  const isDomainListed = (domainName: string) => {
    if (!userListings || userListings.length === 0) {
      return false;
    }
    
    const isListed = userListings.some(listing => {
      if (!listing || !listing.domain) return false;
      
      const listingDomainName = listing.domain.name;
      if (!listingDomainName) return false;
      
      // Remove .push extension from domainName for comparison
      const cleanDomainName = domainName.replace('.push', '');
      const cleanListingName = listingDomainName.replace('.push', '');
      
      return (cleanListingName === cleanDomainName || listingDomainName === domainName) && 
             listing.status === 'active';
    });
    
    return isListed;
  };

  // Navigation functions
  const goToPreviousDomain = () => {
    setCurrentDomainIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextDomain = () => {
    const maxIndex = Math.max(0, userDomains.length - 2); // Show max 2 domains at once
    setCurrentDomainIndex(prev => Math.min(maxIndex, prev + 1));
  };

  // Transfer navigation functions
  const goToPreviousTransfer = () => {
    setCurrentTransferIndex(prev => Math.max(0, prev - 1));
  };

  const goToNextTransfer = () => {
    const maxIndex = Math.max(0, transferHistory.length - 2);
    setCurrentTransferIndex(prev => Math.min(maxIndex, prev + 1));
  };

  // Reset indices when data changes
  useEffect(() => {
    setCurrentDomainIndex(0);
  }, [userDomains.length]);

  useEffect(() => {
    setCurrentTransferIndex(0);
  }, [transferHistory.length]);

  // Page loading effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
      // Start card animation shortly after loading completes
      setTimeout(() => {
        setIsCardVisible(true);
      }, 100);
    }, 1500); // 1.5 second loading screen

    return () => clearTimeout(timer);
  }, []);

  const handleTransferComplete = () => {
    loadUserDomains();
    loadTransferHistory();
    loadUserListings();
    // Small delay to ensure database updates are complete
    setTimeout(() => {
      loadUserListings();
    }, 1000);
  };

  // Marketplace removed

  // Canvas animation effect
  useEffect(() => {
    if (isPageLoading) return; // Don't start animation during loading
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const noise = createNoise3D();
    let w = window.innerWidth;
    let h = window.innerHeight;
    let nt = 0;

    const extraWidth = 200;
    canvas.width = w + extraWidth;
    canvas.height = h;

    const waveColors = ["#ec4899", "#be185d", "#f97316", "#db2777", "#c2185b"];

    const render = () => {
      ctx.fillStyle = "black";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, w + extraWidth, h);

      nt += 0.001;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.lineWidth = 50;
        ctx.strokeStyle = waveColors[i % waveColors.length];
        for (let x = -extraWidth / 2; x < w + extraWidth / 2; x += 5) {
          const y = noise(x / 800, 0.3 * i, nt) * 100;
          ctx.lineTo(x + extraWidth / 2, y + h * 0.5);
        }
        ctx.stroke();
        ctx.closePath();
      }
      requestAnimationFrame(render);
    };

    const handleResize = () => {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = w + extraWidth;
      canvas.height = h;
    };

    window.addEventListener('resize', handleResize);
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isPageLoading]);

  if (isPageLoading) {
    return (
      <>
        <GlobalStyle />
        <LoadingScreen>
          <LoadingSpinner />
          <LoadingText>Loading Push Name Service...</LoadingText>
        </LoadingScreen>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <PageContainer>
        <Canvas ref={canvasRef} />

        <GlassCard $isVisible={isCardVisible}>
          {devnetIssue && (
            <DevnetBanner>
              <span>
                Warning: Network may be responding slowly. Transactions can take longer than usual.
              </span>
              <button
                onClick={() => setDevnetIssue(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  color: '#ffc107',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  cursor: 'pointer'
                }}
              >
                Kapat
              </button>
            </DevnetBanner>
          )}
          <Header>
            <div>
              <Title>
                Push Name Service
              </Title>
              <Subtitle>
                <ScrambleText 
                  text={(() => {
                    const chainConfig = getChainConfig(currentChainId);
                    return `Get your own domain on ${chainConfig?.name || 'Push Chain Donut'} with .push`;
                  })()} 
                  delay={800}
                  duration={2500}
                />
              </Subtitle>
            </div>
          </Header>

          {activeTab === 'search' && (
            <SearchView>
              {isWrongNetwork && (
                <NetworkWarningBanner>
                  <FaExclamationTriangle />
                  <div>
                    <strong>Wrong Network!</strong><br />
                    Please switch to a supported network using the network switcher below.
                  </div>
                </NetworkWarningBanner>
              )}
              <SearchContainer>
                <SearchBox>
                  <SearchInput
                    type="text"
                    placeholder="Enter domain (min 3 chars)"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && searchDomain()}
                  />
                  <DomainExtension>.push</DomainExtension>
                  <SearchButton
                    onClick={searchDomain}
                    disabled={isSearching || !searchQuery.trim() || searchQuery.trim().length < 3}
                  >
                    <FaSearch />
                    {isSearching ? '...' : 'Search'}
                  </SearchButton>
                </SearchBox>
              </SearchContainer>

              {!searchResult && !walletConnected && (
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                  <ConnectButton showBalance={false} accountStatus="address" />
                </div>
              )}



              {errorMessage && (
                <ErrorMessage>{errorMessage}</ErrorMessage>
              )}

              {searchResult && (
                <DomainResult>
                  <DomainHeader>
                    <DomainNameWithBadge>
                      <DomainName>
                        {searchResult.name}.push
                      </DomainName>
                      <BadgeContainer>
                        {makeUniversal ? (
                          <UniversalBadge>
                            <FaGlobe size={10} />
                            Will be Universal
                          </UniversalBadge>
                        ) : (
                          (() => {
                            const chainConfig = getChainConfig(currentChainId);
                            return chainConfig ? (
                              <NetworkBadge color={chainConfig.color}>
                                <div style={{ 
                                  width: '8px', 
                                  height: '8px', 
                                  borderRadius: '50%', 
                                  backgroundColor: chainConfig.color 
                                }} />
                                {chainConfig.shortName} Only
                              </NetworkBadge>
                            ) : null;
                          })()
                        )}
                      </BadgeContainer>
                    </DomainNameWithBadge>
                    <AvailabilityBadge $available={searchResult.available}>
                      {searchResult.available ? <FaCheck /> : <FaTimes />}
                      {searchResult.available ? 'Available' : 'Taken'}
                    </AvailabilityBadge>
                  </DomainHeader>


                  {searchResult.available && (
                    <>
                      <DomainInfo>
                        <div>
                          <PriceLabel>Registration Fee</PriceLabel>
                        </div>
                        <PriceInfo>
                          <Price>{searchResult.price}</Price>
                          <PriceLabel>for 1 year</PriceLabel>
                        </PriceInfo>
                      </DomainInfo>

                      <NetworkInfo />

                      <UniversalOption>
                        <UniversalCheckbox
                          type="checkbox"
                          id="universal-option"
                          checked={makeUniversal}
                          onChange={(e) => setMakeUniversal(e.target.checked)}
                        />
                        <UniversalLabel htmlFor="universal-option">
                          <span className="highlight">Make Universal Domain</span>
                          <span className="description">
                            Enable cross-chain transfers via Push Protocol. Transfer your domain between Ethereum, Polygon, BSC, Arbitrum, and more!
                          </span>
                        </UniversalLabel>
                      </UniversalOption>

                      <RegisterButton
                        onClick={() => {
                          if (!walletConnected) {
                            // Trigger wallet connection
                            (document.querySelector('[data-testid="rk-connect-button"]') as HTMLButtonElement)?.click();
                          } else {
                            registerDomain();
                          }
                        }}
                        disabled={isRegistering}
                      >
                        {isRegistering ? 'Registering...' : (!walletConnected ? 'Connect to Register' : `Register ${makeUniversal ? 'Universal ' : ''}Domain`)}
                      </RegisterButton>
                    </>
                  )}
                </DomainResult>
              )}

              {!walletConnected && null}

              {walletConnected && (
                <div style={{ display: 'flex', gap: 12, alignItems: 'stretch', marginTop: 16 }}>
                  {wagmiAccount.isConnected && <NetworkSwitcher style={{ flex: '0 0 auto' }} />}
                  <DisconnectButton 
                    onClick={async () => { 
                      try { 
                        await wagmiDisconnect?.(); 
                      } catch (e) {
                        console.error('Wagmi disconnect error:', e);
                      }
                      try { 
                        disconnect(); 
                      } catch (e) {
                        console.error('Custom disconnect error:', e);
                      }
                    }}
                    style={{ flex: 1 }}
                  >
                    <FaSignOutAlt />
                    Disconnect ({formatAddress(currentAddress || '')})
                  </DisconnectButton>
                </div>
              )}
            </SearchView>
          )}

          {activeTab === 'profile' && (
            <ProfileView>
              <ProfileTitle>My Profile</ProfileTitle>
              <ProfileSubtitle>Your owned domains</ProfileSubtitle>

              {walletConnected ? (
                userDomains.length > 0 ? (
                  <DomainsContainer>
                    <DomainsHeader>
                      <DomainCounter>
                        {userDomains.length} total domain{userDomains.length > 1 ? 's' : ''}
                      </DomainCounter>
                      {userDomains.length > 2 && (
                        <NavigationControls>
                          <NavButton 
                            onClick={goToPreviousDomain}
                            disabled={currentDomainIndex === 0}
                          >
                            <FaChevronUp size={14} />
                          </NavButton>
                          <NavButton 
                            onClick={goToNextDomain}
                            disabled={currentDomainIndex >= Math.max(0, userDomains.length - 2)}
                          >
                            <FaChevronDown size={14} />
                          </NavButton>
                        </NavigationControls>
                      )}
                    </DomainsHeader>

                    <DomainViewport itemCount={userDomains.length}>
                      <DomainList currentIndex={currentDomainIndex}>
                        {userDomains.map((domain, index) => {
                          const isListed = isDomainListed(domain.name);
                          const isExpired = new Date(domain.expiration_date) <= new Date();
                          
                          return (
                            <DomainCard key={index}>
                              <DomainCardHeaderWithBadge>
                                <DomainNameWithBadge>
                                  <DomainCardName>{domain.name}</DomainCardName>
                                  <BadgeContainer>
                                    {(() => {
                                      const domainInfo = domainInfoCache[domain.name];
                                      console.log('🏷️ Badge for', domain.name, ':', domainInfo);
                                      
                                      if (domainInfo?.isUniversal) {
                                        return (
                                          <UniversalBadge>
                                            <FaGlobe size={10} />
                                            Universal
                                          </UniversalBadge>
                                        );
                                      } else if (domainInfo?.sourceChainId) {
                                        const chainConfig = getChainConfig(domainInfo.sourceChainId);
                                        return chainConfig ? (
                                          <NetworkBadge color={chainConfig.color}>
                                            <div style={{ 
                                              width: '8px', 
                                              height: '8px', 
                                              borderRadius: '50%', 
                                              backgroundColor: chainConfig.color 
                                            }} />
                                            {chainConfig.shortName}
                                          </NetworkBadge>
                                        ) : null;
                                      }
                                      // If no domain info yet, show current network badge as default
                                      const chainConfig = getChainConfig(currentChainId);
                                      return chainConfig ? (
                                        <NetworkBadge color={chainConfig.color}>
                                          <div style={{ 
                                            width: '8px', 
                                            height: '8px', 
                                            borderRadius: '50%', 
                                            backgroundColor: chainConfig.color 
                                          }} />
                                          {chainConfig.shortName}
                                        </NetworkBadge>
                                      ) : null;
                                    })()}
                                  </BadgeContainer>
                                </DomainNameWithBadge>
                                <DomainStatusContainer>
                                  <DomainStatus status={isExpired ? 'expired' : 'active'}>
                                    {isExpired ? 'Expired' : 'Active'}
                                  </DomainStatus>
                                  {isListed && (
                                    <ListingStatus>
                                      <FaTag size={10} />
                                      Listed
                                    </ListingStatus>
                                  )}
                                </DomainStatusContainer>
                              </DomainCardHeaderWithBadge>
                              <DomainCardInfo>
                                <span>Registered: {formatDate(domain.registration_date)}</span>
                                <span>Expires: {formatDate(domain.expiration_date)}</span>
                              </DomainCardInfo>
                              <DomainActions>
                                <ActionButton 
                                  onClick={() => setTransferDomain(domain)}
                                  disabled={isExpired}
                                >
                                  <FaPaperPlane />
                                  Transfer
                                </ActionButton>
                                <ActionButton 
                                  onClick={() => setListDomain(domain)}
                                  disabled={isListed || isExpired}
                                  style={{
                                    opacity: isListed || isExpired ? 0.6 : 1,
                                    cursor: isListed || isExpired ? 'not-allowed' : 'pointer'
                                  }}
                                >
                                  <FaTag />
                                  {isListed ? 'Listed' : 'List'}
                                </ActionButton>
                              </DomainActions>
                            </DomainCard>
                          );
                        })}
                      </DomainList>
                    </DomainViewport>
                  </DomainsContainer>
                ) : (
                  <EmptyState>
                    <EmptyStateIcon>
                      <FaGlobe />
                    </EmptyStateIcon>
                    <EmptyStateText>You don&apos;t have any domains yet</EmptyStateText>
                  </EmptyState>
                )
              ) : (
                <EmptyState>
                  <EmptyStateIcon>
                    <FaWallet />
                  </EmptyStateIcon>
                  <EmptyStateText>Connect your wallet</EmptyStateText>
                </EmptyState>
              )}
            </ProfileView>
          )}

          {activeTab === 'transfers' && (
            <ProfileView>
              <ProfileTitle>Transfer History</ProfileTitle>
              <ProfileSubtitle>All domain transfers you've sent and received</ProfileSubtitle>

              {walletConnected ? (
                transferHistory.length > 0 ? (
                  <DomainsContainer>
                    <DomainsHeader>
                      <DomainCounter>
                        {transferHistory.length} total transfer{transferHistory.length > 1 ? 's' : ''}
                      </DomainCounter>
                      {transferHistory.length > 2 && (
                        <NavigationControls>
                          <NavButton 
                            onClick={goToPreviousTransfer}
                            disabled={currentTransferIndex === 0}
                          >
                            <FaChevronUp size={14} />
                          </NavButton>
                          <NavButton 
                            onClick={goToNextTransfer}
                            disabled={currentTransferIndex >= Math.max(0, transferHistory.length - 2)}
                          >
                            <FaChevronDown size={14} />
                          </NavButton>
                        </NavigationControls>
                      )}
                    </DomainsHeader>

                    <DomainViewport itemCount={transferHistory.length}>
                      <TransferList currentIndex={currentTransferIndex}>
                        {transferHistory.map((transfer, index) => {
                          const isSent = transfer.from_address.toLowerCase() === currentAddress?.toLowerCase();
                          
                          return (
                            <DomainCard key={index}>
                              <DomainCardHeader>
                              <DomainCardName>{transfer.domains?.name}.push</DomainCardName>
                                <DomainStatus status={transfer.status === 'completed' ? 'active' : 'expired'}>
                                  {isSent ? '📤 Sent' : '📥 Received'}
                                </DomainStatus>
                              </DomainCardHeader>
                              <DomainCardInfo>
                                <span>
                                  {isSent ? 'To: ' : 'From: '}
                                  {formatAddress(isSent ? transfer.to_address : transfer.from_address)}
                                </span>
                                <span>Date: {formatDate(transfer.created_at)}</span>
                              </DomainCardInfo>
                              <DomainCardInfo>
                                <span>
                                  Status: 
                                  <span style={{ 
                                    color: transfer.status === 'completed' ? '#ec4899' : 
                                           transfer.status === 'pending' ? '#f59e0b' : '#ef4444',
                                    fontWeight: '600',
                                    marginLeft: '4px'
                                  }}>
                                    {transfer.status === 'completed' ? '✅ Completed' : 
                                     transfer.status === 'pending' ? '⏳ Processing' : '❌ Failed'}
                                  </span>
                                </span>
                                {transfer.transaction_hash && (
                                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <a 
                                      href={`https://sepolia.arbiscan.io/tx/${transfer.transaction_hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#ec4899', textDecoration: 'none', fontSize: '0.85rem' }}
                                    >
                                      ARB Explorer
                                    </a>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
                                    <a 
                                      href={`https://etherscan.io/tx/${transfer.transaction_hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#ec4899', textDecoration: 'none', fontSize: '0.85rem' }}
                                    >
                                      ZETA Explorer
                                    </a>
                                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>
                                    <a 
                                      href={`https://sepolia.etherscan.io/tx/${transfer.transaction_hash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: '#627eea', textDecoration: 'none', fontSize: '0.85rem' }}
                                    >
                                      ETH Explorer
                                    </a>
                                  </div>
                                )}
                              </DomainCardInfo>
                            </DomainCard>
                          );
                        })}
                      </TransferList>
                    </DomainViewport>
                  </DomainsContainer>
                ) : (
                  <EmptyState>
                    <EmptyStateIcon>
                      <FaInbox />
                    </EmptyStateIcon>
                    <EmptyStateText>No transfer history yet</EmptyStateText>
                  </EmptyState>
                )
              ) : (
                <EmptyState>
                  <EmptyStateIcon>
                    <FaWallet />
                  </EmptyStateIcon>
                  <EmptyStateText>Connect your wallet to view transfer history</EmptyStateText>
                </EmptyState>
              )}
            </ProfileView>
          )}

          {activeTab === 'market' && (
            <SearchView>
              <div style={{ width: '100%', marginTop: 16 }}>
                <MarketplaceListings />
              </div>
            </SearchView>
          )}
        </GlassCard>

        <BottomNavigation>
          <NavItem
            $active={activeTab === 'search'}
            onClick={() => setActiveTab('search')}
          >
            <FaSearch size={16} />
            <NavText $active={activeTab === 'search'}>Search</NavText>
          </NavItem>
          <NavItem
            $active={activeTab === 'profile'}
            onClick={() => setActiveTab('profile')}
          >
            <FaUser size={16} />
            <NavText $active={activeTab === 'profile'}>Profile</NavText>
          </NavItem>
          <NavItem
            $active={activeTab === 'market'}
            onClick={() => setActiveTab('market')}
          >
            <FaTag size={16} />
            <NavText $active={activeTab === 'market'}>Market</NavText>
          </NavItem>
          <NavItem
            $active={activeTab === 'transfers'}
            onClick={() => setActiveTab('transfers')}
          >
            <FaInbox size={16} />
            <NavText $active={activeTab === 'transfers'}>
              History
            </NavText>
          </NavItem>
        </BottomNavigation>
        
        {transferDomain && (
          <DomainTransfer
            domain={transferDomain}
            onTransferComplete={handleTransferComplete}
            onClose={() => setTransferDomain(null)}
          />
        )}
        {listDomain && currentAddress && (
          <CreateListingModal
            domain={listDomain}
            sellerAddress={currentAddress}
            onClose={() => setListDomain(null)}
            onListed={() => {
              loadUserListings();
              loadUserDomains();
            }}
          />
        )}

        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText="Register Domain"
          cancelText="Cancel"
          type="info"
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        />

        <NotificationContainer />
      </PageContainer>
    </>
  );
}
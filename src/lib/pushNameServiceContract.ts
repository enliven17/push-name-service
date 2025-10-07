import { ethers } from 'ethers';
import { PushNameService, CrossChainTransferRequest, DomainRecord } from './pushProtocol';

// Contract ABI for Push Universal Name Service
const PUSH_NAME_SERVICE_ABI = [
  // Events
  "event DomainRegistered(uint256 indexed domainId, string indexed name, address indexed owner, uint256 expiresAt, uint256 chainId, bool isUniversal, uint256 price)",
  "event DomainRenewed(string indexed name, address indexed owner, uint256 newExpiresAt, uint256 renewalCount)",
  "event DomainTransferred(string indexed name, address indexed from, address indexed to, uint256 sourceChainId, uint256 targetChainId)",
  "event CrossChainTransferInitiated(string indexed name, address indexed from, address indexed to, uint256 sourceChainId, uint256 targetChainId, bytes32 messageId)",
  "event CrossChainTransferCompleted(string indexed name, address indexed to, uint256 sourceChainId, uint256 targetChainId, bytes32 messageId)",
  "event RecordUpdated(string indexed name, string indexed recordType, string oldValue, string newValue)",
  "event MetadataUpdated(string indexed name, address indexed owner)",
  "event DomainListed(string indexed name, address indexed seller, uint256 price)",
  "event DomainSold(string indexed name, address indexed seller, address indexed buyer, uint256 price)",
  "event DomainDelisted(string indexed name, address indexed seller)",
  
  // Read functions
  "function isAvailable(string calldata name) external view returns (bool)",
  "function ownerOf(string calldata name) external view returns (address)",
  "function getDomainInfo(string calldata name) external view returns (tuple(uint256 id, address owner, uint64 expiresAt, uint64 registeredAt, uint256 sourceChainId, uint256 currentChainId, bool isUniversal, string ipfsHash, uint256 renewalCount, bool isLocked))",
  "function getRecord(string calldata name, string calldata recordType) external view returns (string memory)",
  "function getSupportedChains() external view returns (uint256[] memory)",
  "function getChainConfig(uint256 chainId) external view returns (tuple(bool isSupported, uint256 registrationPrice, uint256 transferFee, string rpcUrl, string explorerUrl))",
  "function getTotalDomains() external view returns (uint256)",
  "function getTotalUniversalDomains() external view returns (uint256)",
  "function getUserDomains(address user) external view returns (string[] memory)",
  "function getMarketplaceListing(string calldata name) external view returns (tuple(address seller, uint256 price, uint64 listedAt, bool isActive, bool acceptsOffers, uint256 minOfferPrice))",
  
  // Write functions
  "function register(string calldata name, bool makeUniversal) external payable",
  "function renew(string calldata name) external payable",
  "function setRecord(string calldata name, string calldata recordType, string calldata value) external",
  "function setDomainMetadata(string calldata name, string calldata description, string calldata avatar, string calldata website, string calldata email, string calldata twitter, string calldata discord) external",
  "function transfer(string calldata name, address to) external",
  "function crossChainTransfer(string calldata name, address to, uint256 targetChainId) external payable",
  "function listDomain(string calldata name, uint256 price) external",
  "function buyDomain(string calldata name) external payable",
  "function delistDomain(string calldata name) external"
];

export interface ChainConfig {
  isSupported: boolean;
  registrationPrice: bigint;
  transferFee: bigint;
  rpcUrl: string;
  explorerUrl: string;
}

export interface ContractDomainInfo {
  id: bigint;
  owner: string;
  expiresAt: bigint;
  registeredAt: bigint;
  sourceChainId: bigint;
  currentChainId: bigint;
  isUniversal: boolean;
  ipfsHash: string;
  renewalCount: bigint;
  isLocked: boolean;
}

export class PushNameServiceContract {
  private contract: ethers.Contract;
  private signer: ethers.Signer;
  private pushService: PushNameService;
  private chainId: number;

  constructor(
    contractAddress: string,
    signer: ethers.Signer,
    chainId: number,
    pushServiceConfig: any
  ) {
    if (!contractAddress) {
      throw new Error('Contract address is required');
    }
    if (!signer) {
      throw new Error('Signer is required');
    }
    if (!pushServiceConfig?.account) {
      throw new Error('Push service account is required');
    }
    
    this.contract = new ethers.Contract(contractAddress, PUSH_NAME_SERVICE_ABI, signer);
    this.signer = signer;
    this.chainId = chainId;
    this.pushService = new PushNameService(pushServiceConfig);
  }

  async initialize() {
    try {
      await this.pushService.initialize();
      console.log('✅ Push service initialized successfully');
    } catch (error) {
      console.warn('⚠️ Push service initialization failed, continuing without Push features:', error);
      // Continue without Push features - contract functionality will still work
    }
  }

  // Check if a domain name is available
  async isAvailable(name: string): Promise<boolean> {
    try {
      return await this.contract.isAvailable(name);
    } catch (error) {
      console.error('Error checking domain availability:', error);
      throw error;
    }
  }

  // Get domain owner
  async ownerOf(name: string): Promise<string> {
    try {
      return await this.contract.ownerOf(name);
    } catch (error) {
      console.error('Error getting domain owner:', error);
      throw error;
    }
  }

  // Get domain expiration timestamp
  async expiresAt(name: string): Promise<number> {
    try {
      const expiration = await this.contract.expiresAt(name);
      return Number(expiration);
    } catch (error) {
      console.error('Error getting domain expiration:', error);
      throw error;
    }
  }

  // Get complete domain information
  async getDomainInfo(name: string): Promise<ContractDomainInfo> {
    try {
      const info = await this.contract.getDomainInfo(name);
      return {
        id: info.id,
        owner: info.owner,
        expiresAt: info.expiresAt,
        registeredAt: info.registeredAt,
        sourceChainId: info.sourceChainId,
        currentChainId: info.currentChainId,
        isUniversal: info.isUniversal,
        ipfsHash: info.ipfsHash,
        renewalCount: info.renewalCount,
        isLocked: info.isLocked
      };
    } catch (error) {
      console.error('Error getting domain info:', error);
      throw error;
    }
  }

  // Get domain record (A, CNAME, etc.)
  async getRecord(name: string, recordType: string): Promise<string> {
    try {
      return await this.contract.getRecord(name, recordType);
    } catch (error) {
      console.error('Error getting domain record:', error);
      throw error;
    }
  }

  // Register a new domain
  async register(name: string, makeUniversal: boolean, value: bigint): Promise<ethers.TransactionResponse> {
    try {
      console.log('📝 Calling contract register:', { name, makeUniversal, value: ethers.formatEther(value) });
      
      // Estimate gas first
      const gasEstimate = await this.contract.register.estimateGas(name, makeUniversal, { value });
      console.log('⛽ Estimated gas:', gasEstimate.toString());
      
      // Send transaction with estimated gas + 20% buffer
      const tx = await this.contract.register(name, makeUniversal, { 
        value,
        gasLimit: gasEstimate * 120n / 100n // 20% buffer
      });
      
      console.log('📤 Registration transaction sent:', tx.hash);
      
      // Listen for registration event and send Push notification
      this.contract.once('DomainRegistered', async (domainId, registeredName, owner, expiresAt, chainId, isUniversal, price) => {
        if (registeredName.toLowerCase() === name.toLowerCase()) {
          console.log('🎉 Domain registration event received:', { domainId, registeredName, owner });
          
          try {
            const domainRecord: DomainRecord = {
              name: registeredName,
              owner,
              expiresAt: Number(expiresAt),
              sourceChainId: Number(chainId),
              isUniversal
            };
            
            await this.pushService.sendDomainRegistrationNotification(domainRecord);
          } catch (notificationError) {
            console.warn('Push notification failed:', notificationError);
          }
        }
      });

      return tx;
    } catch (error: any) {
      console.error('❌ Error registering domain:', error);
      
      // Enhance error messages
      if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
        throw new Error('Transaction would fail. Please check domain availability and your balance.');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        throw new Error('Insufficient funds for registration and gas fees.');
      } else if (error.reason) {
        throw new Error(`Registration failed: ${error.reason}`);
      }
      
      throw error;
    }
  }

  // Renew a domain
  async renew(name: string, value: bigint): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.renew(name, { value });
    } catch (error) {
      console.error('Error renewing domain:', error);
      throw error;
    }
  }

  // Set domain record
  async setRecord(name: string, recordType: string, value: string): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.setRecord(name, recordType, value);
    } catch (error) {
      console.error('Error setting domain record:', error);
      throw error;
    }
  }

  // Set IPFS hash for domain
  async setIPFSHash(name: string, ipfsHash: string): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.setIPFSHash(name, ipfsHash);
    } catch (error) {
      console.error('Error setting IPFS hash:', error);
      throw error;
    }
  }

  // Transfer domain to another address
  async transfer(name: string, to: string): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.transfer(name, to);
    } catch (error) {
      console.error('Error transferring domain:', error);
      throw error;
    }
  }

  // Cross-chain transfer using Push Protocol
  async crossChainTransfer(
    name: string, 
    to: string, 
    targetChainId: number, 
    value: bigint
  ): Promise<ethers.TransactionResponse> {
    try {
      const fromAddress = await this.signer.getAddress();
      
      const tx = await this.contract.crossChainTransfer(name, to, targetChainId, { value });
      
      // Listen for cross-chain transfer event and send Push notification
      this.contract.once('CrossChainTransferInitiated', async (domainName, from, toAddr, sourceChainId, targetChainId, messageId) => {
        if (domainName.toLowerCase() === name.toLowerCase()) {
          const transferRequest: CrossChainTransferRequest = {
            domainName,
            fromAddress: from,
            toAddress: toAddr,
            sourceChainId: Number(sourceChainId),
            targetChainId: Number(targetChainId),
            messageId,
            timestamp: Date.now()
          };
          
          await this.pushService.sendCrossChainTransferNotification(transferRequest);
        }
      });

      return tx;
    } catch (error) {
      console.error('Error performing cross-chain transfer:', error);
      throw error;
    }
  }

  // Batch register multiple domains
  async batchRegister(names: string[], makeUniversal: boolean, totalValue: bigint): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.batchRegister(names, makeUniversal, { value: totalValue });
    } catch (error) {
      console.error('Error batch registering domains:', error);
      throw error;
    }
  }

  // Get supported chains
  async getSupportedChains(): Promise<number[]> {
    try {
      const chains = await this.contract.getSupportedChains();
      return chains.map((chain: bigint) => Number(chain));
    } catch (error) {
      console.error('Error getting supported chains:', error);
      throw error;
    }
  }

  // Get chain configuration
  async getChainConfig(chainId: number): Promise<ChainConfig> {
    try {
      const config = await this.contract.getChainConfig(chainId);
      return {
        isSupported: config.isSupported,
        registrationPrice: config.registrationPrice,
        transferFee: config.transferFee,
        rpcUrl: config.rpcUrl,
        explorerUrl: config.explorerUrl
      };
    } catch (error) {
      console.error('Error getting chain config:', error);
      throw error;
    }
  }

  // Utility function to calculate registration cost
  async getRegistrationCost(chainId?: number): Promise<bigint> {
    try {
      const targetChainId = chainId || this.chainId;
      console.log('🔍 Getting registration cost for chain:', targetChainId);
      
      const config = await this.getChainConfig(targetChainId);
      console.log('💰 Chain config:', {
        isSupported: config.isSupported,
        registrationPrice: ethers.formatEther(config.registrationPrice),
        transferFee: ethers.formatEther(config.transferFee)
      });
      
      return config.registrationPrice;
    } catch (error) {
      console.error('❌ Error getting registration cost:', error);
      
      // Fallback to default price if contract call fails
      console.warn('Using fallback registration price: 0.001 ETH');
      return ethers.parseEther('0.001');
    }
  }

  // Utility function to calculate transfer fee
  async getTransferFee(chainId?: number): Promise<bigint> {
    try {
      const targetChainId = chainId || this.chainId;
      const config = await this.getChainConfig(targetChainId);
      return config.transferFee;
    } catch (error) {
      console.error('Error getting transfer fee:', error);
      throw error;
    }
  }

  // List domain for sale
  async listDomain(name: string, price: bigint): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.listDomain(name, price);
    } catch (error) {
      console.error('Error listing domain:', error);
      throw error;
    }
  }

  // Buy domain from marketplace
  async buyDomain(name: string, value: bigint): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.buyDomain(name, { value });
    } catch (error) {
      console.error('Error buying domain:', error);
      throw error;
    }
  }

  // Delist domain from marketplace
  async delistDomain(name: string): Promise<ethers.TransactionResponse> {
    try {
      return await this.contract.delistDomain(name);
    } catch (error) {
      console.error('Error delisting domain:', error);
      throw error;
    }
  }

  // Get marketplace listing
  async getMarketplaceListing(name: string) {
    try {
      return await this.contract.getMarketplaceListing(name);
    } catch (error) {
      console.error('Error getting marketplace listing:', error);
      throw error;
    }
  }

  // Check if domain is expiring soon and send notification
  async checkAndNotifyExpiration(name: string, warningDays: number = 30) {
    try {
      const domainInfo = await this.getDomainInfo(name);
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = Number(domainInfo.expiresAt);
      const daysUntilExpiry = Math.floor((expirationTime - currentTime) / (24 * 60 * 60));

      if (daysUntilExpiry <= warningDays && daysUntilExpiry > 0) {
        const domainRecord: DomainRecord = {
          name,
          owner: domainInfo.owner,
          expiresAt: expirationTime,
          sourceChainId: Number(domainInfo.sourceChainId),
          isUniversal: domainInfo.isUniversal,
          ipfsHash: domainInfo.ipfsHash
        };

        await this.pushService.sendDomainExpirationWarning(domainRecord, daysUntilExpiry);
      }

      return daysUntilExpiry;
    } catch (error) {
      console.error('Error checking domain expiration:', error);
      throw error;
    }
  }

  // Get user's domains
  async getUserDomains(userAddress: string): Promise<string[]> {
    try {
      // Use the contract's built-in getUserDomains function
      return await this.contract.getUserDomains(userAddress);
    } catch (error) {
      console.error('Error getting user domains:', error);
      
      // Fallback to event filtering
      try {
        const filter = this.contract.filters.DomainRegistered(null, null, userAddress);
        const events = await this.contract.queryFilter(filter);
        
        return events.map(event => {
          if ('args' in event) {
            return event.args?.name;
          }
          return null;
        }).filter(Boolean);
      } catch (fallbackError) {
        console.error('Fallback getUserDomains also failed:', fallbackError);
        return [];
      }
    }
  }

  // Subscribe to contract events
  subscribeToEvents() {
    // Listen for domain registrations
    this.contract.on('DomainRegistered', (domainId, name, owner, expiresAt, chainId, isUniversal, price) => {
      console.log('Domain registered:', { domainId, name, owner, expiresAt, chainId, isUniversal, price });
    });

    // Listen for domain transfers
    this.contract.on('DomainTransferred', (name, from, to, sourceChainId, targetChainId) => {
      console.log('Domain transferred:', { name, from, to, sourceChainId, targetChainId });
    });

    // Listen for cross-chain transfers
    this.contract.on('CrossChainTransferInitiated', (name, from, to, sourceChainId, targetChainId, messageId) => {
      console.log('Cross-chain transfer initiated:', { name, from, to, sourceChainId, targetChainId, messageId });
    });

    this.contract.on('CrossChainTransferCompleted', (name, to, sourceChainId, targetChainId, messageId) => {
      console.log('Cross-chain transfer completed:', { name, to, sourceChainId, targetChainId, messageId });
    });

    // Listen for record updates
    this.contract.on('RecordUpdated', (name, recordType, oldValue, newValue) => {
      console.log('Record updated:', { name, recordType, oldValue, newValue });
    });

    // Listen for marketplace events
    this.contract.on('DomainListed', (name, seller, price) => {
      console.log('Domain listed:', { name, seller, price });
    });

    this.contract.on('DomainSold', (name, seller, buyer, price) => {
      console.log('Domain sold:', { name, seller, buyer, price });
    });
  }

  // Unsubscribe from events
  unsubscribeFromEvents() {
    this.contract.removeAllListeners();
  }
}

export default PushNameServiceContract;
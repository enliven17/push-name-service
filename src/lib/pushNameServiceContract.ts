import { ethers } from 'ethers';
import { PushNameService, CrossChainTransferRequest, DomainRecord } from './pushProtocol';

// Contract ABI for Push Universal Name Service
const PUSH_NAME_SERVICE_ABI = [
  // Events
  "event Registered(string indexed name, address indexed owner, uint256 expiresAt, uint256 chainId, bool isUniversal)",
  "event Renewed(string indexed name, uint256 newExpiresAt)",
  "event Transferred(string indexed name, address indexed from, address indexed to, uint256 sourceChainId, uint256 targetChainId)",
  "event CrossChainTransfer(string indexed name, address indexed from, address indexed to, uint256 sourceChainId, uint256 targetChainId, bytes32 messageId)",
  "event RecordUpdated(string indexed name, string indexed recordType, string value)",
  
  // Read functions
  "function isAvailable(string calldata name) external view returns (bool)",
  "function ownerOf(string calldata name) external view returns (address)",
  "function expiresAt(string calldata name) external view returns (uint64)",
  "function getDomainInfo(string calldata name) external view returns (address owner, uint64 expiration, uint256 sourceChainId, bool isUniversal, bool isExpired, string memory ipfsHash)",
  "function getRecord(string calldata name, string calldata recordType) external view returns (string memory)",
  "function getSupportedChains() external view returns (uint256[] memory)",
  "function getChainConfig(uint256 chainId) external view returns (tuple(bool isSupported, uint256 registrationPrice, uint256 transferFee, string rpcUrl, string explorerUrl))",
  
  // Write functions
  "function register(string calldata name, bool makeUniversal) external payable",
  "function renew(string calldata name) external payable",
  "function setRecord(string calldata name, string calldata recordType, string calldata value) external",
  "function setIPFSHash(string calldata name, string calldata ipfsHash) external",
  "function transfer(string calldata name, address to) external",
  "function crossChainTransfer(string calldata name, address to, uint256 targetChainId) external payable",
  "function batchRegister(string[] calldata names, bool makeUniversal) external payable"
];

export interface ChainConfig {
  isSupported: boolean;
  registrationPrice: bigint;
  transferFee: bigint;
  rpcUrl: string;
  explorerUrl: string;
}

export interface ContractDomainInfo {
  owner: string;
  expiration: bigint;
  sourceChainId: bigint;
  isUniversal: boolean;
  isExpired: boolean;
  ipfsHash: string;
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
    this.contract = new ethers.Contract(contractAddress, PUSH_NAME_SERVICE_ABI, signer);
    this.signer = signer;
    this.chainId = chainId;
    this.pushService = new PushNameService(pushServiceConfig);
  }

  async initialize() {
    await this.pushService.initialize();
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
        owner: info.owner,
        expiration: info.expiration,
        sourceChainId: info.sourceChainId,
        isUniversal: info.isUniversal,
        isExpired: info.isExpired,
        ipfsHash: info.ipfsHash
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
      const tx = await this.contract.register(name, makeUniversal, { value });
      
      // Listen for registration event and send Push notification
      this.contract.once('Registered', async (registeredName, owner, expiresAt, chainId, isUniversal) => {
        if (registeredName.toLowerCase() === name.toLowerCase()) {
          const domainRecord: DomainRecord = {
            name: registeredName,
            owner,
            expiresAt: Number(expiresAt),
            sourceChainId: Number(chainId),
            isUniversal
          };
          
          await this.pushService.sendDomainRegistrationNotification(domainRecord);
        }
      });

      return tx;
    } catch (error) {
      console.error('Error registering domain:', error);
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
      this.contract.once('CrossChainTransfer', async (domainName, from, toAddr, sourceChainId, targetChainId, messageId) => {
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
      const config = await this.getChainConfig(targetChainId);
      return config.registrationPrice;
    } catch (error) {
      console.error('Error getting registration cost:', error);
      throw error;
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

  // Check if domain is expiring soon and send notification
  async checkAndNotifyExpiration(name: string, warningDays: number = 30) {
    try {
      const domainInfo = await this.getDomainInfo(name);
      const currentTime = Math.floor(Date.now() / 1000);
      const expirationTime = Number(domainInfo.expiration);
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
    // This would require indexing events or using a subgraph
    // For now, we'll return an empty array and implement this with event filtering
    try {
      const filter = this.contract.filters.Registered(null, userAddress);
      const events = await this.contract.queryFilter(filter);
      
      return events.map(event => {
        if ('args' in event) {
          return event.args?.name;
        }
        return null;
      }).filter(Boolean);
    } catch (error) {
      console.error('Error getting user domains:', error);
      return [];
    }
  }

  // Subscribe to contract events
  subscribeToEvents() {
    // Listen for domain registrations
    this.contract.on('Registered', (name, owner, expiresAt, chainId, isUniversal) => {
      console.log('Domain registered:', { name, owner, expiresAt, chainId, isUniversal });
    });

    // Listen for domain transfers
    this.contract.on('Transferred', (name, from, to, sourceChainId, targetChainId) => {
      console.log('Domain transferred:', { name, from, to, sourceChainId, targetChainId });
    });

    // Listen for cross-chain transfers
    this.contract.on('CrossChainTransfer', (name, from, to, sourceChainId, targetChainId, messageId) => {
      console.log('Cross-chain transfer:', { name, from, to, sourceChainId, targetChainId, messageId });
    });

    // Listen for record updates
    this.contract.on('RecordUpdated', (name, recordType, value) => {
      console.log('Record updated:', { name, recordType, value });
    });
  }

  // Unsubscribe from events
  unsubscribeFromEvents() {
    this.contract.removeAllListeners();
  }
}

export default PushNameServiceContract;
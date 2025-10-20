import { ethers } from 'ethers';

// Universal Signer Service for Push Chain
export class UniversalSignerService {
  private universalSigner: any = null;
  private pushChainProvider: any;
  private sepoliaProvider: any;
  
  // Push Chain contract addresses
  private readonly UNIVERSAL_EXECUTOR_FACTORY = '0x00000000000000000000000000000000000000eA';
  private readonly UNIVERSAL_VERIFICATION_PRECOMPILE = '0x00000000000000000000000000000000000000ca';
  private readonly ETHEREUM_SEPOLIA_GATEWAY = '0x05bD7a3D18324c1F7e216f7fBF2b15985aE5281A';
  
  // Chain namespaces
  private readonly PUSH_TESTNET_DONUT = 'eip155:42101';
  private readonly ETHEREUM_SEPOLIA = 'eip155:11155111';
  
  constructor() {
    this.pushChainProvider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
    this.sepoliaProvider = new ethers.JsonRpcProvider('https://gateway.tenderly.co/public/sepolia');
  }

  /**
   * Create Universal Signer from Ethereum Sepolia wallet
   */
  async createUniversalSigner(ethersSigner: any): Promise<any> {
    try {
      // Import PushChain SDK dynamically
      const { PushChain } = await import('@pushchain/core');
      
      console.log('🔑 Creating Universal Signer from Ethereum Sepolia wallet...');
      
      // Convert ethers signer to Universal Signer
      this.universalSigner = await PushChain.utils.signer.toUniversal(ethersSigner);
      
      console.log('✅ Universal Signer created successfully');
      console.log('📋 Universal Signer account:', this.universalSigner.account);
      
      return this.universalSigner;
    } catch (error) {
      console.error('❌ Failed to create Universal Signer:', error);
      throw error;
    }
  }

  /**
   * Initialize Push Chain client with Universal Signer
   */
  async initializePushChainClient(): Promise<any> {
    if (!this.universalSigner) {
      throw new Error('Universal Signer not created. Call createUniversalSigner first.');
    }

    try {
      // Import PushChain SDK dynamically
      const { PushChain } = await import('@pushchain/core');
      
      console.log('🚀 Initializing Push Chain client...');
      
      // Initialize Push Chain client
      const pushChainClient = await PushChain.initialize(this.universalSigner, {
        network: 'TESTNET_DONUT' as any // Use testnet for staging
      });
      
      console.log('✅ Push Chain client initialized');
      return pushChainClient;
    } catch (error) {
      console.error('❌ Failed to initialize Push Chain client:', error);
      throw error;
    }
  }

  /**
   * Perform gasless bridge from Ethereum Sepolia to Push Chain
   * User pays on Sepolia via EthBridge contract, we execute on Push Chain
   */
  async gaslessBridge(
    userSepoliaSigner: any,
    domainName: string,
    userAddress: string,
    operation: 'registration' | 'transfer' | 'marketplace' = 'registration',
    extraParams?: any
  ): Promise<{ txHash: string; universalTxHash: string; requestId: string }> {
    try {
      console.log('🌉 Starting gasless bridge operation...');
      console.log('- Domain:', domainName);
      console.log('- User Address:', userAddress);
      
      // Step 1: User calls EthBridge contract on Ethereum Sepolia
      console.log('📝 Step 1: Calling EthBridge contract on Ethereum Sepolia...');
      
      const ethBridgeAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_ADDRESS;
      if (!ethBridgeAddress) {
        throw new Error('EthBridge contract address not configured');
      }
      
      // EthBridge contract ABI
      const ethBridgeABI = [
        'function requestDomainRegistration(string calldata domainName) external payable',
        'function requestDomainTransfer(string calldata domainName, address toAddress, uint256 targetChainId) external payable',
        'function requestMarketplaceListing(string calldata domainName, uint256 priceETH) external payable',
        'function getRegistrationPrice() external view returns (uint256)',
        'function getTransferFee() external view returns (uint256)',
        'function getListingFee() external view returns (uint256)',
        'function isValidDomainName(string calldata domainName) external pure returns (bool)'
      ];
      
      const ethBridgeContract = new ethers.Contract(
        ethBridgeAddress,
        ethBridgeABI,
        userSepoliaSigner
      );
      
      let bridgeTx: any;
      let price: bigint;
      
      if (operation === 'registration') {
        // Get registration price
        price = await ethBridgeContract.getRegistrationPrice();
        console.log('💰 Registration price:', ethers.formatEther(price), 'ETH');
        
        // Validate domain name
        const isValid = await ethBridgeContract.isValidDomainName(domainName);
        if (!isValid) {
          throw new Error('Invalid domain name format');
        }
        
        // Call requestDomainRegistration on EthBridge
        console.log('📤 Sending registration request to EthBridge...');
        bridgeTx = await ethBridgeContract.requestDomainRegistration(domainName, {
          value: price
        });
        
      } else if (operation === 'transfer') {
        // Get transfer fee
        price = await ethBridgeContract.getTransferFee();
        console.log('💰 Transfer fee:', ethers.formatEther(price), 'ETH');
        
        const { toAddress, targetChainId } = extraParams || {};
        if (!toAddress || !targetChainId) {
          throw new Error('Transfer requires toAddress and targetChainId');
        }
        
        // Call requestDomainTransfer on EthBridge
        console.log('📤 Sending transfer request to EthBridge...');
        bridgeTx = await ethBridgeContract.requestDomainTransfer(
          domainName, 
          toAddress, 
          targetChainId, 
          { value: price }
        );
        
      } else if (operation === 'marketplace') {
        // Get listing fee
        price = await ethBridgeContract.getListingFee();
        console.log('💰 Listing fee:', ethers.formatEther(price), 'ETH');
        
        const { priceETH } = extraParams || {};
        if (!priceETH) {
          throw new Error('Marketplace listing requires priceETH');
        }
        
        // Call requestMarketplaceListing on EthBridge
        console.log('📤 Sending marketplace listing request to EthBridge...');
        bridgeTx = await ethBridgeContract.requestMarketplaceListing(
          domainName, 
          ethers.parseEther(priceETH.toString()), 
          { value: price }
        );
      }
      
      console.log('⏳ Waiting for EthBridge transaction confirmation...');
      const bridgeReceipt = await bridgeTx.wait();
      console.log('✅ EthBridge transaction confirmed:', bridgeReceipt.hash);
      
      // Extract request ID from events
      const eventNames = {
        registration: 'DomainRegistrationRequested',
        transfer: 'DomainTransferRequested', 
        marketplace: 'MarketplaceListingRequested'
      };
      
      const requestEvent = bridgeReceipt.logs.find((log: any) => {
        try {
          const parsed = ethBridgeContract.interface.parseLog(log);
          return parsed?.name === eventNames[operation];
        } catch {
          return false;
        }
      });
      
      let requestId = '';
      if (requestEvent) {
        const parsed = ethBridgeContract.interface.parseLog(requestEvent);
        requestId = parsed?.args?.requestId || '';
      }
      
      console.log('📋 Registration request ID:', requestId);
      
      // Step 2: Execute on Push Chain using Universal Signer
      console.log('🔄 Step 2: Executing on Push Chain with Universal Signer...');
      
      if (!this.universalSigner) {
        await this.createUniversalSigner(userSepoliaSigner);
      }
      
      // Initialize Push Chain client
      const pushChainClient = await this.initializePushChainClient();
      
      // Execute operation on Push Chain
      const universalTx = await this.executeUniversalTransaction(
        pushChainClient,
        operation,
        domainName,
        userAddress,
        bridgeReceipt.hash,
        requestId,
        extraParams
      );
      
      console.log('✅ Gasless bridge completed');
      
      return {
        txHash: bridgeReceipt.hash, // EthBridge transaction hash
        universalTxHash: universalTx.hash, // Push Chain transaction hash
        requestId: requestId
      };
      
    } catch (error) {
      console.error('❌ Gasless bridge failed:', error);
      throw error;
    }
  }

  /**
   * Execute Universal Transaction on Push Chain
   */
  private async executeUniversalTransaction(
    pushChainClient: any,
    operation: string,
    domainName: string,
    userAddress: string,
    ethBridgeTxHash: string,
    requestId: string,
    extraParams?: any
  ): Promise<any> {
    try {
      console.log('⚡ Executing Universal Transaction...');
      
      // Get the name service contract on Push Chain
      const nameServiceAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
      if (!nameServiceAddress) {
        throw new Error('Push Chain Name Service address not configured');
      }
      
      let txData: any;
      let value = '0';
      
      if (operation === 'registration') {
        // Registration operation
        const nameServiceABI = [
          'function register(string memory name, bool universal, uint256 value) external payable',
          'function getRegistrationCost() external view returns (uint256)'
        ];
        
        const contract = new ethers.Contract(
          nameServiceAddress,
          nameServiceABI,
          this.pushChainProvider
        );
        
        const registrationCost = await contract.getRegistrationCost();
        console.log('💰 Registration cost:', ethers.formatEther(registrationCost), 'PC');
        
        txData = contract.interface.encodeFunctionData('register', [
          domainName,
          true, // All domains are universal
          registrationCost
        ]);
        value = registrationCost.toString();
        
      } else if (operation === 'transfer') {
        // Transfer operation
        const { toAddress, targetChainId } = extraParams || {};
        
        const nameServiceABI = [
          'function crossChainTransfer(string memory name, address to, uint256 targetChainId, uint256 value) external payable',
          'function getTransferFee(uint256 targetChainId) external view returns (uint256)'
        ];
        
        const contract = new ethers.Contract(
          nameServiceAddress,
          nameServiceABI,
          this.pushChainProvider
        );
        
        const transferCost = await contract.getTransferFee(targetChainId);
        console.log('💰 Transfer cost:', ethers.formatEther(transferCost), 'PC');
        
        txData = contract.interface.encodeFunctionData('crossChainTransfer', [
          domainName,
          toAddress,
          targetChainId,
          transferCost
        ]);
        value = transferCost.toString();
        
      } else if (operation === 'marketplace') {
        // Marketplace listing operation
        const { priceETH } = extraParams || {};
        
        // Convert ETH price to PC (1 ETH = 1000 PC)
        const pricePC = ethers.parseEther((parseFloat(priceETH) * 1000).toString());
        
        const nameServiceABI = [
          'function createListing(string memory name, uint256 price, bool allowCrossChain) external',
          'function getListingFee() external view returns (uint256)'
        ];
        
        const contract = new ethers.Contract(
          nameServiceAddress,
          nameServiceABI,
          this.pushChainProvider
        );
        
        const listingFee = await contract.getListingFee();
        console.log('💰 Listing fee:', ethers.formatEther(listingFee), 'PC');
        
        txData = contract.interface.encodeFunctionData('createListing', [
          domainName,
          pricePC,
          true // All listings are cross-chain
        ]);
        value = listingFee.toString();
      }
      
      // Send Universal Transaction using Push Chain client
      console.log('📤 Sending Universal Transaction...');
      const tx = await pushChainClient.universal.sendTransaction({
        to: nameServiceAddress,
        data: txData,
        value: value,
        gasLimit: 500000
      });
      
      console.log('📤 Universal Transaction sent:', tx.hash || tx.transactionHash || 'pending');
      
      // Wait for confirmation if possible
      let receipt = tx;
      if (tx.wait) {
        receipt = await tx.wait();
        console.log('✅ Universal Transaction confirmed:', receipt.hash || receipt.transactionHash);
      }
      
      // Step 3: Complete the operation on EthBridge
      const txHash = receipt.hash || receipt.transactionHash || tx.hash || 'unknown';
      await this.completeEthBridgeOperation(operation, requestId, txHash);
      
      return receipt;
      
    } catch (error) {
      console.error('❌ Universal Transaction failed:', error);
      
      // Mark as failed on EthBridge if we have requestId
      if (requestId) {
        try {
          await this.failEthBridgeRegistration(requestId, (error as Error).message || 'Unknown error');
        } catch (completeError) {
          console.error('❌ Failed to mark EthBridge registration as failed:', completeError);
        }
      }
      
      throw error;
    }
  }

  /**
   * Complete operation on EthBridge contract
   */
  private async completeEthBridgeOperation(operation: string, requestId: string, pushChainTxHash: string): Promise<void> {
    try {
      console.log(`✅ Completing EthBridge ${operation}...`);
      
      const ethBridgeAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_ADDRESS;
      if (!ethBridgeAddress) {
        console.warn('⚠️ EthBridge address not configured, skipping completion');
        return;
      }
      
      const sepoliaSigner = new ethers.Wallet(
        process.env.PRIVATE_KEY || '', 
        this.sepoliaProvider
      );
      
      const ethBridgeABI = [
        'function completeDomainRegistration(bytes32 requestId, string calldata pushChainTxHash) external',
        'function completeDomainTransfer(bytes32 requestId, string calldata pushChainTxHash) external',
        'function completeMarketplaceListing(bytes32 requestId, string calldata pushChainTxHash) external'
      ];
      
      const ethBridgeContract = new ethers.Contract(
        ethBridgeAddress,
        ethBridgeABI,
        sepoliaSigner
      );
      
      let completeTx: any;
      
      if (operation === 'registration') {
        completeTx = await ethBridgeContract.completeDomainRegistration(requestId, pushChainTxHash);
      } else if (operation === 'transfer') {
        completeTx = await ethBridgeContract.completeDomainTransfer(requestId, pushChainTxHash);
      } else if (operation === 'marketplace') {
        completeTx = await ethBridgeContract.completeMarketplaceListing(requestId, pushChainTxHash);
      }
      
      await completeTx.wait();
      console.log(`✅ EthBridge ${operation} completed:`, completeTx.hash);
      
    } catch (error) {
      console.error('❌ Failed to complete EthBridge registration:', error);
      // Don't throw here, as the main registration succeeded
    }
  }

  /**
   * Mark registration as failed on EthBridge contract
   */
  private async failEthBridgeRegistration(requestId: string, reason: string): Promise<void> {
    try {
      console.log('❌ Marking EthBridge registration as failed...');
      
      const ethBridgeAddress = process.env.NEXT_PUBLIC_ETH_BRIDGE_ADDRESS;
      if (!ethBridgeAddress) {
        return;
      }
      
      const sepoliaSigner = new ethers.Wallet(
        process.env.PRIVATE_KEY || '', 
        this.sepoliaProvider
      );
      
      const ethBridgeABI = [
        'function failDomainRegistration(bytes32 requestId, string calldata reason) external'
      ];
      
      const ethBridgeContract = new ethers.Contract(
        ethBridgeAddress,
        ethBridgeABI,
        sepoliaSigner
      );
      
      const failTx = await ethBridgeContract.failDomainRegistration(requestId, reason);
      await failTx.wait();
      console.log('✅ EthBridge registration marked as failed:', failTx.hash);
      
    } catch (error) {
      console.error('❌ Failed to mark EthBridge registration as failed:', error);
    }
  }

  /**
   * Check if user has sufficient balance on Ethereum Sepolia
   */
  async checkSepoliaBalance(userAddress: string): Promise<{ balance: string; hasEnough: boolean }> {
    try {
      const balance = await this.sepoliaProvider.getBalance(userAddress);
      const balanceEth = ethers.formatEther(balance);
      const requiredEth = '0.001'; // Minimum required for registration
      
      return {
        balance: balanceEth,
        hasEnough: parseFloat(balanceEth) >= parseFloat(requiredEth)
      };
    } catch (error) {
      console.error('Failed to check Sepolia balance:', error);
      return { balance: '0', hasEnough: false };
    }
  }

  /**
   * Get Universal Signer account balance on Push Chain
   */
  async getUniversalSignerBalance(): Promise<string> {
    try {
      if (!this.universalSigner || !this.universalSigner.account) {
        return '0';
      }
      
      const address = this.universalSigner.account.address;
      const balance = await this.pushChainProvider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get Universal Signer balance:', error);
      return '0';
    }
  }

  /**
   * List domain on marketplace using Universal Signer
   */
  async listDomain(domainName: string, priceWei: string): Promise<{ txHash: string }> {
    try {
      console.log('📋 Listing domain with Universal Signer...');
      console.log('- Domain:', domainName);
      console.log('- Price:', ethers.formatEther(priceWei), 'PC');
      
      // Initialize Push Chain client if needed
      const pushChainClient = await this.initializePushChainClient();
      
      const nameServiceAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
      if (!nameServiceAddress) {
        throw new Error('Push Chain Name Service address not configured');
      }
      
      // Prepare transaction data for listing
      const nameServiceABI = [
        'function listDomain(string memory name, uint256 price) external'
      ];
      
      const contract = new ethers.Contract(
        nameServiceAddress,
        nameServiceABI,
        this.pushChainProvider
      );
      
      const txData = contract.interface.encodeFunctionData('listDomain', [
        domainName,
        priceWei
      ]);
      
      // Send Universal Transaction
      console.log('📤 Sending Universal Transaction for listing...');
      const tx = await pushChainClient.universal.sendTransaction({
        to: nameServiceAddress,
        data: txData,
        value: '0', // No fee for listing
        gasLimit: 300000
      });
      
      const txHash = tx.hash || tx.transactionHash || 'pending';
      console.log('✅ Domain listing transaction sent:', txHash);
      
      // Wait for confirmation if possible
      if (tx.wait) {
        const receipt = await tx.wait();
        console.log('✅ Domain listing confirmed:', receipt.hash || receipt.transactionHash);
        return { txHash: receipt.hash || receipt.transactionHash || txHash };
      }
      
      return { txHash };
      
    } catch (error) {
      console.error('❌ Domain listing failed:', error);
      throw error;
    }
  }

  /**
   * Transfer domain using Universal Signer
   */
  async transferDomain(domainName: string, toAddress: string): Promise<{ txHash: string }> {
    try {
      console.log('📤 Transferring domain with Universal Signer...');
      console.log('- Domain:', domainName);
      console.log('- To:', toAddress);
      
      // Initialize Push Chain client if needed
      const pushChainClient = await this.initializePushChainClient();
      
      const nameServiceAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
      if (!nameServiceAddress) {
        throw new Error('Push Chain Name Service address not configured');
      }
      
      // Prepare transaction data for transfer
      const nameServiceABI = [
        'function transfer(string memory name, address to) external'
      ];
      
      const contract = new ethers.Contract(
        nameServiceAddress,
        nameServiceABI,
        this.pushChainProvider
      );
      
      const txData = contract.interface.encodeFunctionData('transfer', [
        domainName,
        toAddress
      ]);
      
      // Send Universal Transaction
      console.log('📤 Sending Universal Transaction for transfer...');
      const tx = await pushChainClient.universal.sendTransaction({
        to: nameServiceAddress,
        data: txData,
        value: '0', // No fee for transfer
        gasLimit: 300000
      });
      
      const txHash = tx.hash || tx.transactionHash || 'pending';
      console.log('✅ Domain transfer transaction sent:', txHash);
      
      // Wait for confirmation if possible
      if (tx.wait) {
        const receipt = await tx.wait();
        console.log('✅ Domain transfer confirmed:', receipt.hash || receipt.transactionHash);
        return { txHash: receipt.hash || receipt.transactionHash || txHash };
      }
      
      return { txHash };
      
    } catch (error) {
      console.error('❌ Domain transfer failed:', error);
      throw error;
    }
  }

  /**
   * Estimate gas cost for Universal Transaction
   */
  async estimateUniversalTransactionCost(): Promise<{ gasCost: string; registrationCost: string; total: string }> {
    try {
      const nameServiceAddress = process.env.NEXT_PUBLIC_PUSH_CHAIN_NAME_SERVICE_ADDRESS;
      if (!nameServiceAddress) {
        throw new Error('Push Chain Name Service address not configured');
      }
      
      const nameServiceABI = ['function getRegistrationCost() external view returns (uint256)'];
      const contract = new ethers.Contract(nameServiceAddress, nameServiceABI, this.pushChainProvider);
      
      const registrationCost = await contract.getRegistrationCost();
      const gasPrice = await this.pushChainProvider.getFeeData();
      const estimatedGas = BigInt(500000); // Estimated gas limit
      
      const gasCost = (gasPrice.gasPrice || BigInt(0)) * estimatedGas;
      const total = registrationCost + gasCost;
      
      return {
        gasCost: ethers.formatEther(gasCost),
        registrationCost: ethers.formatEther(registrationCost),
        total: ethers.formatEther(total)
      };
    } catch (error) {
      console.error('Failed to estimate Universal Transaction cost:', error);
      return {
        gasCost: '0.001',
        registrationCost: '0.001',
        total: '0.002'
      };
    }
  }
}

// Export singleton instance
export const universalSignerService = new UniversalSignerService();
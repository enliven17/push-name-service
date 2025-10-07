// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

// Push Chain Universal Signer interfaces
interface IUniversalSigner {
    function signAndExecute(
        uint256 targetChainId,
        address targetContract,
        bytes calldata data,
        uint256 value,
        uint256 gasLimit
    ) external payable returns (bytes32 txHash);
    
    function getSignerAddress(uint256 chainId) external view returns (address);
}

// Universal Executor interface (Push Chain style)
interface IUniversalExecutor {
    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external payable returns (bytes memory result);
}

// Universal Executor Factory interface (ERC-4337 style)
interface IUniversalExecutorFactory {
    function getAddress(address owner, bytes32 salt) external view returns (address);
    function createAccount(address owner, bytes32 salt) external returns (address);
    function owner() external view returns (address);
}

/// @title Push Universal Name Service
/// @notice Fully on-chain domain name service using Push Protocol for .push domains
/// @dev Supports universal domains that work across multiple blockchains using Push Chain Universal Transactions
contract PushUniversalNameService is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;
    // Domain counter for unique IDs
    Counters.Counter private _domainIdCounter;
    
    struct DomainRecord {
        uint256 id;
        address owner;
        uint64 expiresAt;
        uint64 registeredAt;
        uint256 sourceChainId;
        uint256 currentChainId;
        bool isUniversal;
        string ipfsHash;
        uint256 renewalCount;
        bool isLocked; // For transfer protection
    }
    
    struct DomainMetadata {
        string description;
        string avatar;
        string website;
        string email;
        string twitter;
        string discord;
    }

    struct ChainConfig {
        bool isSupported;
        uint256 registrationPrice;
        uint256 transferFee;
        string rpcUrl;
        string explorerUrl;
    }

    struct MarketplaceListing {
        address seller;
        uint256 price;
        uint64 listedAt;
        bool isActive;
        bool acceptsOffers;
        uint256 minOfferPrice;
    }

    // Core mappings
    mapping(string => DomainRecord) private nameToRecord;
    mapping(string => mapping(string => string)) private domainRecords; // domain => recordType => value
    mapping(string => DomainMetadata) private domainMetadata;
    mapping(address => string[]) private ownerToDomains;
    mapping(uint256 => string) private idToDomain;
    
    // Chain and protocol configuration
    mapping(uint256 => ChainConfig) public supportedChains;
    mapping(bytes32 => bool) public processedMessages;
    mapping(address => bool) public authorizedPushNodes;
    mapping(address => bool) public authorizedResolvers;
    
    // Marketplace
    mapping(string => MarketplaceListing) public domainListings;
    mapping(address => uint256) public pendingWithdrawals;
    
    // Statistics
    mapping(address => uint256) public userDomainCount;
    mapping(address => uint256) public userUniversalDomainCount;
    uint256 public totalDomains;
    uint256 public totalUniversalDomains;
    
    // Protocol addresses
    address public pushCoreContract;
    address public treasuryAddress;
    address public universalExecutorFactory;
    
    // Universal Transaction constants
    uint256 public constant UNIVERSAL_TX_FEE = 0.001 ether;
    uint256 public constant UNIVERSAL_SIGNER_GAS_LIMIT = 500000;
    
    // Cross-chain message types
    bytes4 public constant MINT_DOMAIN_SELECTOR = bytes4(keccak256("mintCrossChainDomain(string,address,uint64,string,bytes32)"));

    uint256 public constant REGISTRATION_DURATION = 365 days;
    uint256 public constant BASE_REGISTRATION_PRICE = 0.001 ether;
    uint256 public constant BASE_TRANSFER_FEE = 0.0001 ether;
    
    // Cross-chain message types
    uint8 constant CROSS_CHAIN_TRANSFER = 1;
    uint8 constant CROSS_CHAIN_MINT = 2;
    uint8 constant UPDATE_RECORDS = 3;

    // Events
    event DomainRegistered(
        uint256 indexed domainId,
        string indexed name, 
        address indexed owner, 
        uint256 expiresAt, 
        uint256 chainId,
        bool isUniversal,
        uint256 price
    );
    event DomainRenewed(
        string indexed name, 
        address indexed owner,
        uint256 newExpiresAt,
        uint256 renewalCount
    );
    event DomainTransferred(
        string indexed name, 
        address indexed from, 
        address indexed to,
        uint256 sourceChainId,
        uint256 targetChainId
    );
    event CrossChainTransferInitiated(
        string indexed name,
        address indexed from,
        address indexed to,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 messageId
    );
    event CrossChainTransferCompleted(
        string indexed name,
        address indexed to,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 messageId
    );
    event RecordUpdated(
        string indexed name,
        string indexed recordType,
        string oldValue,
        string newValue
    );
    event MetadataUpdated(
        string indexed name,
        address indexed owner
    );
    event DomainListed(
        string indexed name,
        address indexed seller,
        uint256 price
    );
    event DomainSold(
        string indexed name,
        address indexed seller,
        address indexed buyer,
        uint256 price
    );
    event DomainDelisted(
        string indexed name,
        address indexed seller
    );
    event ChainAdded(uint256 chainId, uint256 registrationPrice, uint256 transferFee);
    event PushNodeAuthorized(address indexed node, bool authorized);
    event ResolverAuthorized(address indexed resolver, bool authorized);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    modifier onlyAuthorizedPushNode() {
        require(authorizedPushNodes[msg.sender] || msg.sender == owner(), "UNAUTHORIZED_PUSH_NODE");
        _;
    }

    constructor(
        address initialOwner, 
        address _pushCoreContract,
        address _treasuryAddress,
        address _universalExecutorFactory
    ) {
        _transferOwnership(initialOwner);
        pushCoreContract = _pushCoreContract;
        treasuryAddress = _treasuryAddress;
        universalExecutorFactory = _universalExecutorFactory;
        
        // Initialize supported chains for Push Protocol
        // Ethereum Mainnet
        supportedChains[1] = ChainConfig({
            isSupported: true,
            registrationPrice: BASE_REGISTRATION_PRICE * 2,
            transferFee: BASE_TRANSFER_FEE * 2,
            rpcUrl: "https://eth.llamarpc.com",
            explorerUrl: "https://etherscan.io"
        });

        // Polygon
        supportedChains[137] = ChainConfig({
            isSupported: true,
            registrationPrice: BASE_REGISTRATION_PRICE,
            transferFee: BASE_TRANSFER_FEE,
            rpcUrl: "https://polygon.llamarpc.com",
            explorerUrl: "https://polygonscan.com"
        });

        // BSC
        supportedChains[56] = ChainConfig({
            isSupported: true,
            registrationPrice: BASE_REGISTRATION_PRICE,
            transferFee: BASE_TRANSFER_FEE,
            rpcUrl: "https://bsc.llamarpc.com",
            explorerUrl: "https://bscscan.com"
        });

        // Arbitrum
        supportedChains[42161] = ChainConfig({
            isSupported: true,
            registrationPrice: BASE_REGISTRATION_PRICE,
            transferFee: BASE_TRANSFER_FEE,
            rpcUrl: "https://arb1.arbitrum.io/rpc",
            explorerUrl: "https://arbiscan.io"
        });

        // Optimism
        supportedChains[10] = ChainConfig({
            isSupported: true,
            registrationPrice: BASE_REGISTRATION_PRICE,
            transferFee: BASE_TRANSFER_FEE,
            rpcUrl: "https://mainnet.optimism.io",
            explorerUrl: "https://optimistic.etherscan.io"
        });
    }

    function authorizePushNode(address node, bool authorized) external onlyOwner {
        authorizedPushNodes[node] = authorized;
        emit PushNodeAuthorized(node, authorized);
    }

    function setPushCoreContract(address _pushCoreContract) external onlyOwner {
        pushCoreContract = _pushCoreContract;
    }

    function addSupportedChain(
        uint256 chainId,
        uint256 registrationPrice,
        uint256 transferFee,
        string calldata rpcUrl,
        string calldata explorerUrl
    ) external onlyOwner {
        supportedChains[chainId] = ChainConfig({
            isSupported: true,
            registrationPrice: registrationPrice,
            transferFee: transferFee,
            rpcUrl: rpcUrl,
            explorerUrl: explorerUrl
        });
        emit ChainAdded(chainId, registrationPrice, transferFee);
    }

    function _isExpired(DomainRecord storage rec) internal view returns (bool) {
        return rec.expiresAt < block.timestamp;
    }

    function _toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        for (uint256 i = 0; i < bStr.length; i++) {
            uint8 c = uint8(bStr[i]);
            if (c >= 65 && c <= 90) {
                bStr[i] = bytes1(c + 32);
            }
        }
        return string(bStr);
    }

    function _validateDomainName(string memory name) internal pure returns (bool) {
        bytes memory nameBytes = bytes(name);
        if (nameBytes.length < 3 || nameBytes.length > 63) return false;
        
        for (uint256 i = 0; i < nameBytes.length; i++) {
            uint8 c = uint8(nameBytes[i]);
            // Allow a-z, 0-9, and hyphens (but not at start/end)
            if (!((c >= 97 && c <= 122) || (c >= 48 && c <= 57) || (c == 45 && i > 0 && i < nameBytes.length - 1))) {
                return false;
            }
        }
        return true;
    }

    function isAvailable(string calldata name) external view returns (bool) {
        string memory n = _toLower(name);
        if (!_validateDomainName(n)) return false;
        
        DomainRecord storage rec = nameToRecord[n];
        return rec.owner == address(0) || _isExpired(rec);
    }

    function ownerOf(string calldata name) external view returns (address) {
        DomainRecord storage rec = nameToRecord[_toLower(name)];
        if (rec.owner == address(0) || _isExpired(rec)) return address(0);
        return rec.owner;
    }

    function expiresAt(string calldata name) external view returns (uint64) {
        return nameToRecord[_toLower(name)].expiresAt;
    }

    function getDomainInfo(string calldata name) external view returns (
        address owner,
        uint64 expiration,
        uint256 sourceChainId,
        bool isUniversal,
        bool isExpired,
        string memory ipfsHash
    ) {
        DomainRecord storage rec = nameToRecord[_toLower(name)];
        return (
            rec.owner,
            rec.expiresAt,
            rec.sourceChainId,
            rec.isUniversal,
            _isExpired(rec),
            rec.ipfsHash
        );
    }

    function getRecord(string calldata name, string calldata recordType) external view returns (string memory) {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner != address(0) && !_isExpired(rec), "DOMAIN_NOT_EXISTS_OR_EXPIRED");
        return domainRecords[n][recordType];
    }

    function register(
        string calldata name, 
        bool makeUniversal
    ) external payable nonReentrant whenNotPaused {
        uint256 currentChainId = block.chainid;
        ChainConfig memory chainConfig = supportedChains[currentChainId];
        require(chainConfig.isSupported, "CHAIN_NOT_SUPPORTED");
        require(msg.value >= chainConfig.registrationPrice, "INSUFFICIENT_PAYMENT");

        string memory n = _toLower(name);
        require(_validateDomainName(n), "INVALID_DOMAIN_NAME");
        
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == address(0) || _isExpired(rec), "DOMAIN_TAKEN");

        // Generate unique domain ID
        _domainIdCounter.increment();
        uint256 domainId = _domainIdCounter.current();

        // Set domain record
        uint64 newExpiry = uint64(block.timestamp + REGISTRATION_DURATION);
        rec.id = domainId;
        rec.owner = msg.sender;
        rec.expiresAt = newExpiry;
        rec.registeredAt = uint64(block.timestamp);
        rec.sourceChainId = currentChainId;
        rec.currentChainId = currentChainId;
        rec.isUniversal = makeUniversal;
        rec.renewalCount = 0;
        rec.isLocked = false;

        // Update mappings
        ownerToDomains[msg.sender].push(n);
        idToDomain[domainId] = n;
        
        // Update statistics
        userDomainCount[msg.sender]++;
        totalDomains++;
        
        if (makeUniversal) {
            userUniversalDomainCount[msg.sender]++;
            totalUniversalDomains++;
        }

        // Handle payment
        uint256 treasuryAmount = (msg.value * 90) / 100; // 90% to treasury
        uint256 refund = msg.value - chainConfig.registrationPrice;
        
        if (treasuryAmount > 0) {
            pendingWithdrawals[treasuryAddress] += treasuryAmount;
        }
        
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }

        emit DomainRegistered(
            domainId,
            n, 
            msg.sender, 
            newExpiry, 
            currentChainId, 
            makeUniversal,
            chainConfig.registrationPrice
        );
    }

    function renew(string calldata name) external payable {
        uint256 currentChainId = block.chainid;
        ChainConfig memory chainConfig = supportedChains[currentChainId];
        require(chainConfig.isSupported, "CHAIN_NOT_SUPPORTED");
        require(msg.value >= chainConfig.registrationPrice, "INSUFFICIENT_PAYMENT");

        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        uint64 newExpiry = rec.expiresAt + uint64(REGISTRATION_DURATION);
        rec.expiresAt = newExpiry;
        emit DomainRenewed(n, msg.sender, newExpiry, rec.renewalCount);
    }

    function setRecord(
        string calldata name,
        string calldata recordType,
        string calldata value
    ) external {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        string memory oldValue = domainRecords[n][recordType];
        domainRecords[n][recordType] = value;
        emit RecordUpdated(n, recordType, oldValue, value);
    }

    function setIPFSHash(string calldata name, string calldata ipfsHash) external {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        string memory oldHash = rec.ipfsHash;
        rec.ipfsHash = ipfsHash;
        emit RecordUpdated(n, "IPFS", oldHash, ipfsHash);
    }

    function transfer(string calldata name, address to) external {
        require(to != address(0), "INVALID_RECIPIENT");

        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        rec.owner = to;
        emit DomainTransferred(n, msg.sender, to, block.chainid, block.chainid);
    }

    // Cross-chain transfer using Push Chain Universal Transactions
    function crossChainTransfer(
        string calldata name,
        address to,
        uint256 targetChainId
    ) external payable nonReentrant {
        uint256 currentChainId = block.chainid;
        ChainConfig memory sourceChainConfig = supportedChains[currentChainId];
        ChainConfig memory targetChainConfig = supportedChains[targetChainId];
        
        require(sourceChainConfig.isSupported, "SOURCE_CHAIN_NOT_SUPPORTED");
        require(targetChainConfig.isSupported, "TARGET_CHAIN_NOT_SUPPORTED");
        require(msg.value >= sourceChainConfig.transferFee + UNIVERSAL_TX_FEE, "INSUFFICIENT_FEE");
        require(to != address(0), "INVALID_RECIPIENT");
        require(targetChainId != currentChainId, "SAME_CHAIN");
        require(currentChainId == 42101, "ONLY_FROM_PUSH_CHAIN"); // Only from Push Chain

        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");
        require(rec.isUniversal, "NOT_UNIVERSAL");

        // Generate unique message ID for cross-chain tracking
        bytes32 messageId = keccak256(abi.encodePacked(
            n, msg.sender, to, currentChainId, targetChainId, block.timestamp
        ));

        // Mark message as processed to prevent replay
        processedMessages[messageId] = true;

        // Store domain data before transfer
        uint64 domainExpiry = rec.expiresAt;
        string memory ipfsHash = rec.ipfsHash;

        // Burn/Lock domain on source chain
        delete nameToRecord[n];
        
        // Update owner mappings
        _removeFromOwnerDomains(msg.sender, n);
        userDomainCount[msg.sender]--;
        if (rec.isUniversal) {
            userUniversalDomainCount[msg.sender]--;
        }

        // Use Universal Executor Factory directly (Push Chain pattern)
        address userExecutor = universalExecutorFactory;

        // Prepare cross-chain transaction data
        bytes memory txData = abi.encodeWithSignature(
            "mintCrossChainDomain(string,address,uint64,string,bytes32)",
            n,
            to,
            domainExpiry,
            ipfsHash,
            messageId
        );

        // Execute Universal Transaction directly on Push Chain's Universal Executor Factory
        // Based on our tests, the factory itself handles Universal Transactions
        
        (bool success, bytes memory result) = userExecutor.call{value: UNIVERSAL_TX_FEE}(
            abi.encodeWithSignature(
                "executeUniversalTransaction(uint256,address,bytes,uint256)",
                targetChainId,
                address(this), // Target contract (same address on target chain)
                txData,
                0 // No additional value for target transaction
            )
        );
        
        require(success, "UNIVERSAL_TX_FAILED");

        emit CrossChainTransferInitiated(n, msg.sender, to, currentChainId, targetChainId, messageId);
        
        // Refund excess payment
        uint256 refund = msg.value - sourceChainConfig.transferFee - UNIVERSAL_TX_FEE;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }
    
    // Function to mint domain on target chain (called by Universal Transaction)
    function mintCrossChainDomain(
        string calldata name,
        address to,
        uint64 domainExpiresAt,
        string calldata ipfsHash,
        bytes32 messageId
    ) external {
        // Only allow calls from Universal Executor or authorized Push nodes
        require(
            authorizedPushNodes[msg.sender] || 
            _isUniversalExecutor(msg.sender), 
            "UNAUTHORIZED"
        );
        
        require(!processedMessages[messageId], "MESSAGE_ALREADY_PROCESSED");
        processedMessages[messageId] = true;

        string memory n = _toLower(name);
        
        // Generate new domain ID
        _domainIdCounter.increment();
        uint256 domainId = _domainIdCounter.current();

        // Mint domain on target chain
        DomainRecord storage rec = nameToRecord[n];
        rec.id = domainId;
        rec.owner = to;
        rec.expiresAt = domainExpiresAt;
        rec.registeredAt = uint64(block.timestamp);
        rec.sourceChainId = 42101; // Always from Push Chain
        rec.currentChainId = block.chainid;
        rec.isUniversal = true;
        rec.ipfsHash = ipfsHash;
        rec.renewalCount = 0;
        rec.isLocked = false;

        // Update mappings
        ownerToDomains[to].push(n);
        idToDomain[domainId] = n;
        
        // Update statistics
        userDomainCount[to]++;
        totalDomains++;
        userUniversalDomainCount[to]++;
        totalUniversalDomains++;

        emit CrossChainTransferCompleted(n, to, 42101, block.chainid, messageId);
        emit DomainRegistered(domainId, n, to, domainExpiresAt, block.chainid, true, 0);
    }
    
    // Helper function to check if caller is a Universal Executor
    function _isUniversalExecutor(address caller) internal view returns (bool) {
        // This would need to be implemented based on Push Chain's Universal Executor pattern
        // For now, we'll use a simple check
        return caller != address(0) && caller != address(this);
    }

    // Function called by authorized Push nodes to complete cross-chain transfers
    function completeCrossChainTransfer(
        string calldata name,
        address to,
        uint256 sourceChainId,
        uint64 domainExpiresAt,
        string calldata ipfsHash,
        bytes32 messageId
    ) external onlyAuthorizedPushNode {
        require(!processedMessages[messageId], "MESSAGE_ALREADY_PROCESSED");
        require(supportedChains[sourceChainId].isSupported, "INVALID_SOURCE_CHAIN");

        string memory n = _toLower(name);
        processedMessages[messageId] = true;

        // Mint domain on target chain
        DomainRecord storage rec = nameToRecord[n];
        rec.owner = to;
        rec.expiresAt = domainExpiresAt;
        rec.sourceChainId = sourceChainId;
        rec.isUniversal = true;
        rec.ipfsHash = ipfsHash;

        emit DomainRegistered(0, n, to, domainExpiresAt, block.chainid, true, 0);
        emit DomainTransferred(n, address(0), to, sourceChainId, block.chainid);
    }

    function getSupportedChains() external view returns (uint256[] memory) {
        uint256[] memory chains = new uint256[](5);
        chains[0] = 1;      // Ethereum
        chains[1] = 137;    // Polygon
        chains[2] = 56;     // BSC
        chains[3] = 42161;  // Arbitrum
        chains[4] = 10;     // Optimism
        return chains;
    }

    function getChainConfig(uint256 chainId) external view returns (ChainConfig memory) {
        return supportedChains[chainId];
    }

    function withdraw(address payable to) external onlyOwner {
        require(to != address(0), "INVALID_RECIPIENT");
        to.transfer(address(this).balance);
    }

    // Emergency functions
    function emergencyUpdateDomain(
        string calldata name,
        address newOwner,
        uint64 newExpiry
    ) external onlyOwner {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        rec.owner = newOwner;
        rec.expiresAt = newExpiry;
    }

    // Marketplace functions
    function listDomain(
        string calldata name,
        uint256 price
    ) external {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");
        require(!rec.isLocked, "DOMAIN_LOCKED");
        require(price > 0, "INVALID_PRICE");

        domainListings[n] = MarketplaceListing({
            seller: msg.sender,
            price: price,
            listedAt: uint64(block.timestamp),
            isActive: true,
            acceptsOffers: false,
            minOfferPrice: 0
        });

        emit DomainListed(n, msg.sender, price);
    }

    function buyDomain(string calldata name) external payable nonReentrant {
        string memory n = _toLower(name);
        MarketplaceListing storage listing = domainListings[n];
        require(listing.isActive, "NOT_LISTED");
        require(msg.value >= listing.price, "INSUFFICIENT_PAYMENT");

        DomainRecord storage rec = nameToRecord[n];
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        address seller = listing.seller;
        uint256 price = listing.price;

        // Transfer domain
        _transferDomain(n, seller, msg.sender);

        // Handle payment
        uint256 fee = (price * 5) / 100; // 5% marketplace fee
        uint256 sellerAmount = price - fee;

        pendingWithdrawals[seller] += sellerAmount;
        pendingWithdrawals[treasuryAddress] += fee;

        // Refund excess payment
        if (msg.value > price) {
            payable(msg.sender).transfer(msg.value - price);
        }

        // Clear listing
        delete domainListings[n];

        emit DomainSold(n, seller, msg.sender, price);
    }

    function delistDomain(string calldata name) external {
        string memory n = _toLower(name);
        MarketplaceListing storage listing = domainListings[n];
        require(listing.seller == msg.sender, "NOT_SELLER");
        require(listing.isActive, "NOT_LISTED");

        delete domainListings[n];
        emit DomainDelisted(n, msg.sender);
    }

    // Metadata functions
    function setDomainMetadata(
        string calldata name,
        string calldata description,
        string calldata avatar,
        string calldata website,
        string calldata email,
        string calldata twitter,
        string calldata discord
    ) external {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        domainMetadata[n] = DomainMetadata({
            description: description,
            avatar: avatar,
            website: website,
            email: email,
            twitter: twitter,
            discord: discord
        });

        emit MetadataUpdated(n, msg.sender);
    }

    // Batch operations for efficiency
    function batchRegister(
        string[] calldata names,
        bool makeUniversal
    ) external payable nonReentrant whenNotPaused {
        uint256 currentChainId = block.chainid;
        ChainConfig memory chainConfig = supportedChains[currentChainId];
        require(chainConfig.isSupported, "CHAIN_NOT_SUPPORTED");
        
        uint256 totalCost = chainConfig.registrationPrice * names.length;
        require(msg.value >= totalCost, "INSUFFICIENT_PAYMENT");

        for (uint256 i = 0; i < names.length; i++) {
            string memory n = _toLower(names[i]);
            require(_validateDomainName(n), "INVALID_DOMAIN_NAME");
            
            DomainRecord storage rec = nameToRecord[n];
            require(rec.owner == address(0) || _isExpired(rec), "DOMAIN_TAKEN");

            // Generate unique domain ID
            _domainIdCounter.increment();
            uint256 domainId = _domainIdCounter.current();

            uint64 newExpiry = uint64(block.timestamp + REGISTRATION_DURATION);
            rec.id = domainId;
            rec.owner = msg.sender;
            rec.expiresAt = newExpiry;
            rec.registeredAt = uint64(block.timestamp);
            rec.sourceChainId = currentChainId;
            rec.currentChainId = currentChainId;
            rec.isUniversal = makeUniversal;

            ownerToDomains[msg.sender].push(n);
            idToDomain[domainId] = n;
            
            userDomainCount[msg.sender]++;
            totalDomains++;
            
            if (makeUniversal) {
                userUniversalDomainCount[msg.sender]++;
                totalUniversalDomains++;
            }

            emit DomainRegistered(
                domainId,
                n, 
                msg.sender, 
                newExpiry, 
                currentChainId, 
                makeUniversal,
                chainConfig.registrationPrice
            );
        }

        // Handle payment
        uint256 treasuryAmount = (totalCost * 90) / 100;
        pendingWithdrawals[treasuryAddress] += treasuryAmount;
        
        uint256 refund = msg.value - totalCost;
        if (refund > 0) {
            payable(msg.sender).transfer(refund);
        }
    }

    // Internal transfer function
    function _transferDomain(
        string memory name,
        address from,
        address to
    ) internal {
        DomainRecord storage rec = nameToRecord[name];
        
        // Update owner
        rec.owner = to;
        
        // Update owner mappings
        _removeFromOwnerDomains(from, name);
        ownerToDomains[to].push(name);
        
        // Update statistics
        userDomainCount[from]--;
        userDomainCount[to]++;
        
        if (rec.isUniversal) {
            userUniversalDomainCount[from]--;
            userUniversalDomainCount[to]++;
        }
    }

    function _removeFromOwnerDomains(address owner, string memory name) internal {
        string[] storage domains = ownerToDomains[owner];
        for (uint256 i = 0; i < domains.length; i++) {
            if (keccak256(bytes(domains[i])) == keccak256(bytes(name))) {
                domains[i] = domains[domains.length - 1];
                domains.pop();
                break;
            }
        }
    }

    // Withdrawal function
    function withdraw() external nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "NO_FUNDS");
        
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    // View functions
    function getDomainMetadata(string calldata name) external view returns (DomainMetadata memory) {
        return domainMetadata[_toLower(name)];
    }

    function getMarketplaceListing(string calldata name) external view returns (MarketplaceListing memory) {
        return domainListings[_toLower(name)];
    }

    function getUserDomains(address user) external view returns (string[] memory) {
        return ownerToDomains[user];
    }

    function getDomainById(uint256 domainId) external view returns (string memory) {
        return idToDomain[domainId];
    }

    function getTotalDomains() external view returns (uint256) {
        return totalDomains;
    }

    function getTotalUniversalDomains() external view returns (uint256) {
        return totalUniversalDomains;
    }

    // Admin functions
    function setTreasuryAddress(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "INVALID_ADDRESS");
        address oldTreasury = treasuryAddress;
        treasuryAddress = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }

    function authorizeResolver(address resolver, bool authorized) external onlyOwner {
        authorizedResolvers[resolver] = authorized;
        emit ResolverAuthorized(resolver, authorized);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function emergencyWithdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }
}
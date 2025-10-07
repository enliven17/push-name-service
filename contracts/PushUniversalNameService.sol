// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Push Universal Name Service
/// @notice Cross-chain domain name service using Push Protocol for .push domains
contract PushUniversalNameService is Ownable {
    struct DomainRecord {
        address owner;
        uint64 expiresAt;
        uint256 sourceChainId;
        bool isUniversal;
        string ipfsHash; // For decentralized content storage
        mapping(string => string) records; // DNS-like records (A, CNAME, etc.)
    }

    struct ChainConfig {
        bool isSupported;
        uint256 registrationPrice;
        uint256 transferFee;
        string rpcUrl;
        string explorerUrl;
    }

    // name (lowercase) => record
    mapping(string => DomainRecord) private nameToRecord;
    
    // chainId => chain configuration
    mapping(uint256 => ChainConfig) public supportedChains;
    
    // Cross-chain message tracking
    mapping(bytes32 => bool) public processedMessages;
    
    // Push Protocol integration
    mapping(address => bool) public authorizedPushNodes;
    address public pushCoreContract;

    uint256 public constant REGISTRATION_DURATION = 365 days;
    uint256 public constant BASE_REGISTRATION_PRICE = 0.001 ether;
    uint256 public constant BASE_TRANSFER_FEE = 0.0001 ether;
    
    // Cross-chain message types
    uint8 constant CROSS_CHAIN_TRANSFER = 1;
    uint8 constant CROSS_CHAIN_MINT = 2;
    uint8 constant UPDATE_RECORDS = 3;

    event Registered(
        string indexed name, 
        address indexed owner, 
        uint256 expiresAt, 
        uint256 chainId,
        bool isUniversal
    );
    event Renewed(string indexed name, uint256 newExpiresAt);
    event Transferred(
        string indexed name, 
        address indexed from, 
        address indexed to,
        uint256 sourceChainId,
        uint256 targetChainId
    );
    event CrossChainTransfer(
        string indexed name,
        address indexed from,
        address indexed to,
        uint256 sourceChainId,
        uint256 targetChainId,
        bytes32 messageId
    );
    event RecordUpdated(
        string indexed name,
        string indexed recordType,
        string value
    );
    event ChainAdded(uint256 chainId, uint256 registrationPrice, uint256 transferFee);
    event PushNodeAuthorized(address indexed node, bool authorized);

    modifier onlyAuthorizedPushNode() {
        require(authorizedPushNodes[msg.sender] || msg.sender == owner(), "UNAUTHORIZED_PUSH_NODE");
        _;
    }

    constructor(address initialOwner, address _pushCoreContract) {
        _transferOwnership(initialOwner);
        pushCoreContract = _pushCoreContract;
        
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
        DomainRecord storage rec = nameToRecord[_toLower(name)];
        require(rec.owner != address(0) && !_isExpired(rec), "DOMAIN_NOT_EXISTS_OR_EXPIRED");
        return rec.records[recordType];
    }

    function register(string calldata name, bool makeUniversal) external payable {
        uint256 currentChainId = block.chainid;
        ChainConfig memory chainConfig = supportedChains[currentChainId];
        require(chainConfig.isSupported, "CHAIN_NOT_SUPPORTED");
        require(msg.value >= chainConfig.registrationPrice, "INSUFFICIENT_PAYMENT");

        string memory n = _toLower(name);
        require(_validateDomainName(n), "INVALID_DOMAIN_NAME");
        
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == address(0) || _isExpired(rec), "DOMAIN_TAKEN");

        uint64 newExpiry = uint64(block.timestamp + REGISTRATION_DURATION);
        rec.owner = msg.sender;
        rec.expiresAt = newExpiry;
        rec.sourceChainId = currentChainId;
        rec.isUniversal = makeUniversal;

        emit Registered(n, msg.sender, newExpiry, currentChainId, makeUniversal);
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
        emit Renewed(n, newExpiry);
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

        rec.records[recordType] = value;
        emit RecordUpdated(n, recordType, value);
    }

    function setIPFSHash(string calldata name, string calldata ipfsHash) external {
        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        rec.ipfsHash = ipfsHash;
        emit RecordUpdated(n, "IPFS", ipfsHash);
    }

    function transfer(string calldata name, address to) external {
        require(to != address(0), "INVALID_RECIPIENT");

        string memory n = _toLower(name);
        DomainRecord storage rec = nameToRecord[n];
        require(rec.owner == msg.sender, "NOT_OWNER");
        require(!_isExpired(rec), "DOMAIN_EXPIRED");

        rec.owner = to;
        emit Transferred(n, msg.sender, to, block.chainid, block.chainid);
    }

    // Cross-chain transfer using Push Protocol
    function crossChainTransfer(
        string calldata name,
        address to,
        uint256 targetChainId
    ) external payable {
        uint256 currentChainId = block.chainid;
        ChainConfig memory sourceChainConfig = supportedChains[currentChainId];
        ChainConfig memory targetChainConfig = supportedChains[targetChainId];
        
        require(sourceChainConfig.isSupported, "SOURCE_CHAIN_NOT_SUPPORTED");
        require(targetChainConfig.isSupported, "TARGET_CHAIN_NOT_SUPPORTED");
        require(msg.value >= sourceChainConfig.transferFee, "INSUFFICIENT_FEE");
        require(to != address(0), "INVALID_RECIPIENT");
        require(targetChainId != currentChainId, "SAME_CHAIN");

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

        // Emit cross-chain transfer event (Push Protocol will listen to this)
        emit CrossChainTransfer(n, msg.sender, to, currentChainId, targetChainId, messageId);
        
        // The actual cross-chain message will be handled by Push Protocol infrastructure
        // This event will be picked up by Push nodes and relayed to the target chain
    }

    // Function called by authorized Push nodes to complete cross-chain transfers
    function completeCrossChainTransfer(
        string calldata name,
        address to,
        uint256 sourceChainId,
        uint64 expiresAt,
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
        rec.expiresAt = expiresAt;
        rec.sourceChainId = sourceChainId;
        rec.isUniversal = true;
        rec.ipfsHash = ipfsHash;

        emit Registered(n, to, expiresAt, block.chainid, true);
        emit Transferred(n, address(0), to, sourceChainId, block.chainid);
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

    // Batch operations for efficiency
    function batchRegister(
        string[] calldata names,
        bool makeUniversal
    ) external payable {
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

            uint64 newExpiry = uint64(block.timestamp + REGISTRATION_DURATION);
            rec.owner = msg.sender;
            rec.expiresAt = newExpiry;
            rec.sourceChainId = currentChainId;
            rec.isUniversal = makeUniversal;

            emit Registered(n, msg.sender, newExpiry, currentChainId, makeUniversal);
        }
    }
}
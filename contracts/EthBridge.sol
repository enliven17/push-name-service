// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title EthBridge
 * @dev Bridge contract for gasless domain registration from Ethereum Sepolia to Push Chain
 * Users pay ETH on Sepolia, we execute registration on Push Chain using Universal Signer
 */
contract EthBridge is Ownable, ReentrancyGuard, Pausable {
    
    // Events
    event DomainRegistrationRequested(
        address indexed user,
        string domainName,
        uint256 ethAmount,
        bytes32 indexed requestId,
        uint256 timestamp
    );
    
    event DomainRegistrationCompleted(
        bytes32 indexed requestId,
        address indexed user,
        string domainName,
        string pushChainTxHash,
        uint256 timestamp
    );
    
    event DomainRegistrationFailed(
        bytes32 indexed requestId,
        address indexed user,
        string domainName,
        string reason,
        uint256 timestamp
    );
    
    event PriceUpdated(uint256 oldPrice, uint256 newPrice);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event UniversalSignerUpdated(address oldSigner, address newSigner);
    
    // Transfer Bridge Events
    event DomainTransferRequested(
        address indexed user,
        string domainName,
        address toAddress,
        uint256 targetChainId,
        uint256 ethAmount,
        bytes32 indexed requestId,
        uint256 timestamp
    );
    
    event DomainTransferCompleted(
        bytes32 indexed requestId,
        address indexed user,
        string domainName,
        string pushChainTxHash,
        uint256 timestamp
    );
    
    // Marketplace Bridge Events
    event MarketplaceListingRequested(
        address indexed user,
        string domainName,
        uint256 priceETH,
        uint256 ethAmount,
        bytes32 indexed requestId,
        uint256 timestamp
    );
    
    event MarketplaceListingCompleted(
        bytes32 indexed requestId,
        address indexed user,
        string domainName,
        string pushChainTxHash,
        uint256 timestamp
    );
    
    // Structs
    struct RegistrationRequest {
        address user;
        string domainName;
        uint256 ethAmount;
        uint256 timestamp;
        bool completed;
        bool failed;
        string pushChainTxHash;
        string failureReason;
    }
    
    struct TransferRequest {
        address user;
        string domainName;
        address toAddress;
        uint256 targetChainId;
        uint256 ethAmount;
        uint256 timestamp;
        bool completed;
        bool failed;
        string pushChainTxHash;
        string failureReason;
    }
    
    struct MarketplaceRequest {
        address user;
        string domainName;
        uint256 priceETH;
        uint256 ethAmount;
        uint256 timestamp;
        bool completed;
        bool failed;
        string pushChainTxHash;
        string failureReason;
    }
    
    // State variables
    mapping(bytes32 => RegistrationRequest) public registrationRequests;
    mapping(string => bool) public processedDomains;
    mapping(address => bytes32[]) public userRequests;
    
    // Transfer and marketplace mappings
    mapping(bytes32 => TransferRequest) public transferRequests;
    mapping(bytes32 => MarketplaceRequest) public marketplaceRequests;
    mapping(address => bytes32[]) public userTransferRequests;
    mapping(address => bytes32[]) public userMarketplaceRequests;
    
    uint256 public registrationPriceETH = 0.001 ether; // 0.001 ETH (1 ETH = 1000 PC ratio)
    uint256 public transferFeeETH = 0.0002 ether; // 0.0002 ETH for transfers
    uint256 public listingFeeETH = 0.0002 ether; // 0.0002 ETH for marketplace listings
    address public treasury;
    address public universalSigner;
    uint256 public totalRegistrations;
    uint256 public totalTransfers;
    uint256 public totalListings;
    uint256 public totalETHCollected;
    
    // Constants
    uint256 public constant MAX_DOMAIN_LENGTH = 63;
    uint256 public constant MIN_DOMAIN_LENGTH = 3;
    
    constructor(
        address _treasury,
        address _universalSigner
    ) {
        require(_treasury != address(0), "Invalid treasury address");
        require(_universalSigner != address(0), "Invalid universal signer address");
        
        treasury = _treasury;
        universalSigner = _universalSigner;
    }
    
    /**
     * @dev Request domain registration on Push Chain
     * User pays ETH on Sepolia, we execute on Push Chain
     */
    function requestDomainRegistration(
        string calldata domainName
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= registrationPriceETH, "Insufficient ETH sent");
        require(bytes(domainName).length >= MIN_DOMAIN_LENGTH, "Domain name too short");
        require(bytes(domainName).length <= MAX_DOMAIN_LENGTH, "Domain name too long");
        require(isValidDomainName(domainName), "Invalid domain name format");
        require(!processedDomains[domainName], "Domain already processed");
        
        // Generate unique request ID
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                domainName,
                block.timestamp,
                block.number
            )
        );
        
        // Store registration request
        registrationRequests[requestId] = RegistrationRequest({
            user: msg.sender,
            domainName: domainName,
            ethAmount: msg.value,
            timestamp: block.timestamp,
            completed: false,
            failed: false,
            pushChainTxHash: "",
            failureReason: ""
        });
        
        // Track user requests
        userRequests[msg.sender].push(requestId);
        
        // Mark domain as being processed
        processedDomains[domainName] = true;
        
        // Update statistics
        totalRegistrations++;
        totalETHCollected += msg.value;
        
        // Send ETH to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer to treasury failed");
        
        emit DomainRegistrationRequested(
            msg.sender,
            domainName,
            msg.value,
            requestId,
            block.timestamp
        );
    }
    
    /**
     * @dev Request domain transfer on Push Chain
     * User pays ETH on Sepolia, we execute transfer on Push Chain
     */
    function requestDomainTransfer(
        string calldata domainName,
        address toAddress,
        uint256 targetChainId
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= transferFeeETH, "Insufficient ETH for transfer");
        require(bytes(domainName).length >= MIN_DOMAIN_LENGTH, "Domain name too short");
        require(bytes(domainName).length <= MAX_DOMAIN_LENGTH, "Domain name too long");
        require(toAddress != address(0), "Invalid recipient address");
        require(toAddress != msg.sender, "Cannot transfer to yourself");
        
        // Generate unique request ID
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                domainName,
                toAddress,
                targetChainId,
                block.timestamp,
                block.number
            )
        );
        
        // Store transfer request
        transferRequests[requestId] = TransferRequest({
            user: msg.sender,
            domainName: domainName,
            toAddress: toAddress,
            targetChainId: targetChainId,
            ethAmount: msg.value,
            timestamp: block.timestamp,
            completed: false,
            failed: false,
            pushChainTxHash: "",
            failureReason: ""
        });
        
        // Track user requests
        userTransferRequests[msg.sender].push(requestId);
        
        // Update statistics
        totalTransfers++;
        totalETHCollected += msg.value;
        
        // Send ETH to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer to treasury failed");
        
        emit DomainTransferRequested(
            msg.sender,
            domainName,
            toAddress,
            targetChainId,
            msg.value,
            requestId,
            block.timestamp
        );
    }
    
    /**
     * @dev Request marketplace listing on Push Chain
     * User pays ETH on Sepolia, we execute listing on Push Chain
     */
    function requestMarketplaceListing(
        string calldata domainName,
        uint256 priceETH
    ) external payable nonReentrant whenNotPaused {
        require(msg.value >= listingFeeETH, "Insufficient ETH for listing");
        require(bytes(domainName).length >= MIN_DOMAIN_LENGTH, "Domain name too short");
        require(bytes(domainName).length <= MAX_DOMAIN_LENGTH, "Domain name too long");
        require(priceETH > 0, "Price must be greater than 0");
        
        // Generate unique request ID
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                domainName,
                priceETH,
                block.timestamp,
                block.number
            )
        );
        
        // Store marketplace request
        marketplaceRequests[requestId] = MarketplaceRequest({
            user: msg.sender,
            domainName: domainName,
            priceETH: priceETH,
            ethAmount: msg.value,
            timestamp: block.timestamp,
            completed: false,
            failed: false,
            pushChainTxHash: "",
            failureReason: ""
        });
        
        // Track user requests
        userMarketplaceRequests[msg.sender].push(requestId);
        
        // Update statistics
        totalListings++;
        totalETHCollected += msg.value;
        
        // Send ETH to treasury
        (bool success, ) = treasury.call{value: msg.value}("");
        require(success, "ETH transfer to treasury failed");
        
        emit MarketplaceListingRequested(
            msg.sender,
            domainName,
            priceETH,
            msg.value,
            requestId,
            block.timestamp
        );
    }
    
    /**
     * @dev Complete domain registration (called by universal signer)
     */
    function completeDomainRegistration(
        bytes32 requestId,
        string calldata pushChainTxHash
    ) external {
        require(msg.sender == universalSigner, "Only universal signer can complete");
        require(registrationRequests[requestId].user != address(0), "Request not found");
        require(!registrationRequests[requestId].completed, "Already completed");
        require(!registrationRequests[requestId].failed, "Request failed");
        require(bytes(pushChainTxHash).length > 0, "Invalid transaction hash");
        
        RegistrationRequest storage request = registrationRequests[requestId];
        request.completed = true;
        request.pushChainTxHash = pushChainTxHash;
        
        emit DomainRegistrationCompleted(
            requestId,
            request.user,
            request.domainName,
            pushChainTxHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Complete domain transfer (called by universal signer)
     */
    function completeDomainTransfer(
        bytes32 requestId,
        string calldata pushChainTxHash
    ) external {
        require(msg.sender == universalSigner, "Only universal signer can complete");
        require(transferRequests[requestId].user != address(0), "Request not found");
        require(!transferRequests[requestId].completed, "Already completed");
        require(!transferRequests[requestId].failed, "Request failed");
        require(bytes(pushChainTxHash).length > 0, "Invalid transaction hash");
        
        TransferRequest storage request = transferRequests[requestId];
        request.completed = true;
        request.pushChainTxHash = pushChainTxHash;
        
        emit DomainTransferCompleted(
            requestId,
            request.user,
            request.domainName,
            pushChainTxHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Complete marketplace listing (called by universal signer)
     */
    function completeMarketplaceListing(
        bytes32 requestId,
        string calldata pushChainTxHash
    ) external {
        require(msg.sender == universalSigner, "Only universal signer can complete");
        require(marketplaceRequests[requestId].user != address(0), "Request not found");
        require(!marketplaceRequests[requestId].completed, "Already completed");
        require(!marketplaceRequests[requestId].failed, "Request failed");
        require(bytes(pushChainTxHash).length > 0, "Invalid transaction hash");
        
        MarketplaceRequest storage request = marketplaceRequests[requestId];
        request.completed = true;
        request.pushChainTxHash = pushChainTxHash;
        
        emit MarketplaceListingCompleted(
            requestId,
            request.user,
            request.domainName,
            pushChainTxHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Mark domain registration as failed (called by universal signer)
     */
    function failDomainRegistration(
        bytes32 requestId,
        string calldata reason
    ) external {
        require(msg.sender == universalSigner, "Only universal signer can fail");
        require(registrationRequests[requestId].user != address(0), "Request not found");
        require(!registrationRequests[requestId].completed, "Already completed");
        require(!registrationRequests[requestId].failed, "Already failed");
        
        RegistrationRequest storage request = registrationRequests[requestId];
        request.failed = true;
        request.failureReason = reason;
        
        // Unmark domain as processed so it can be tried again
        processedDomains[request.domainName] = false;
        
        emit DomainRegistrationFailed(
            requestId,
            request.user,
            request.domainName,
            reason,
            block.timestamp
        );
    }
    
    /**
     * @dev Get registration request details
     */
    function getRegistrationRequest(bytes32 requestId) 
        external 
        view 
        returns (RegistrationRequest memory) 
    {
        return registrationRequests[requestId];
    }
    
    /**
     * @dev Get user's registration requests
     */
    function getUserRequests(address user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userRequests[user];
    }
    
    /**
     * @dev Check if domain name is valid
     */
    function isValidDomainName(string calldata domainName) 
        public 
        pure 
        returns (bool) 
    {
        bytes memory nameBytes = bytes(domainName);
        
        // Check length
        if (nameBytes.length < MIN_DOMAIN_LENGTH || nameBytes.length > MAX_DOMAIN_LENGTH) {
            return false;
        }
        
        // Check first and last character (cannot be hyphen)
        if (nameBytes[0] == 0x2D || nameBytes[nameBytes.length - 1] == 0x2D) {
            return false;
        }
        
        // Check each character
        for (uint256 i = 0; i < nameBytes.length; i++) {
            bytes1 char = nameBytes[i];
            
            // Allow lowercase letters (a-z)
            if (char >= 0x61 && char <= 0x7A) continue;
            
            // Allow numbers (0-9)
            if (char >= 0x30 && char <= 0x39) continue;
            
            // Allow hyphen (-)
            if (char == 0x2D) continue;
            
            // Invalid character
            return false;
        }
        
        return true;
    }
    
    /**
     * @dev Get current prices
     */
    function getRegistrationPrice() external view returns (uint256) {
        return registrationPriceETH;
    }
    
    function getTransferFee() external view returns (uint256) {
        return transferFeeETH;
    }
    
    function getListingFee() external view returns (uint256) {
        return listingFeeETH;
    }
    
    /**
     * @dev Get transfer request details
     */
    function getTransferRequest(bytes32 requestId) 
        external 
        view 
        returns (TransferRequest memory) 
    {
        return transferRequests[requestId];
    }
    
    /**
     * @dev Get marketplace request details
     */
    function getMarketplaceRequest(bytes32 requestId) 
        external 
        view 
        returns (MarketplaceRequest memory) 
    {
        return marketplaceRequests[requestId];
    }
    
    /**
     * @dev Get user's transfer requests
     */
    function getUserTransferRequests(address user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userTransferRequests[user];
    }
    
    /**
     * @dev Get user's marketplace requests
     */
    function getUserMarketplaceRequests(address user) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return userMarketplaceRequests[user];
    }
    
    /**
     * @dev Get contract statistics
     */
    function getStats() 
        external 
        view 
        returns (
            uint256 _totalRegistrations,
            uint256 _totalTransfers,
            uint256 _totalListings,
            uint256 _totalETHCollected
        ) 
    {
        return (totalRegistrations, totalTransfers, totalListings, totalETHCollected);
    }
    
    // Admin functions
    
    /**
     * @dev Update prices (only owner)
     */
    function updateRegistrationPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = registrationPriceETH;
        registrationPriceETH = newPrice;
        emit PriceUpdated(oldPrice, newPrice);
    }
    
    function updateTransferFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Fee must be greater than 0");
        transferFeeETH = newFee;
    }
    
    function updateListingFee(uint256 newFee) external onlyOwner {
        require(newFee > 0, "Fee must be greater than 0");
        listingFeeETH = newFee;
    }
    
    /**
     * @dev Update treasury address (only owner)
     */
    function updateTreasury(address newTreasury) external onlyOwner {
        require(newTreasury != address(0), "Invalid treasury address");
        address oldTreasury = treasury;
        treasury = newTreasury;
        emit TreasuryUpdated(oldTreasury, newTreasury);
    }
    
    /**
     * @dev Update universal signer address (only owner)
     */
    function updateUniversalSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer address");
        address oldSigner = universalSigner;
        universalSigner = newSigner;
        emit UniversalSignerUpdated(oldSigner, newSigner);
    }
    
    /**
     * @dev Pause contract (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Emergency withdraw (only owner)
     */
    function emergencyWithdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No ETH to withdraw");
        
        (bool success, ) = owner().call{value: balance}("");
        require(success, "ETH withdrawal failed");
    }
}
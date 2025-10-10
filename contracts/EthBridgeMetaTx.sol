// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./EthBridge.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title EthBridgeMetaTx
 * @dev Extension of EthBridge with meta-transaction support for gasless payments
 * Users sign messages, relayer executes transactions and pays gas
 */
contract EthBridgeMetaTx is EthBridge {
    using ECDSA for bytes32;
    
    // Meta-transaction nonces to prevent replay attacks
    mapping(address => uint256) public nonces;
    
    // Events for meta-transactions
    event MetaTransactionExecuted(
        address indexed user,
        address indexed relayer,
        string functionName,
        bool success
    );
    
    event DepositMade(
        address indexed user,
        uint256 amount,
        uint256 newBalance
    );
    
    event DepositWithdrawn(
        address indexed user,
        uint256 amount,
        uint256 remainingBalance
    );
    
    constructor(
        address _treasury,
        address _universalSigner
    ) EthBridge(_treasury, _universalSigner) {}
    
    /**
     * @dev Execute gasless domain registration via meta-transaction
     * Relayer pays gas, user pays domain fee via signature authorization
     */
    function executeMetaRegistration(
        address user,
        string calldata domainName,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused {
        // Verify nonce
        require(nonces[user] == nonce, "Invalid nonce");
        
        // Verify signature
        bytes32 messageHash = getRegistrationMessageHash(user, domainName, nonce);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == user, "Invalid signature");
        
        // Relayer must provide the domain fee (will be reimbursed by user)
        require(msg.value >= registrationPriceETH, "Insufficient payment for domain fee");
        
        // Increment nonce to prevent replay
        nonces[user]++;
        
        // Execute registration logic
        _executeRegistration(user, domainName, msg.value);
        
        emit MetaTransactionExecuted(user, msg.sender, "registration", true);
    }
    
    /**
     * @dev Execute gasless domain transfer via meta-transaction
     */
    function executeMetaTransfer(
        address user,
        string calldata domainName,
        address toAddress,
        uint256 targetChainId,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused {
        // Verify nonce
        require(nonces[user] == nonce, "Invalid nonce");
        
        // Verify signature
        bytes32 messageHash = getTransferMessageHash(user, domainName, toAddress, targetChainId, nonce);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == user, "Invalid signature");
        
        // Verify payment amount
        require(msg.value >= transferFeeETH, "Insufficient payment");
        
        // Increment nonce to prevent replay
        nonces[user]++;
        
        // Execute transfer logic
        _executeTransfer(user, domainName, toAddress, targetChainId, msg.value);
        
        emit MetaTransactionExecuted(user, msg.sender, "transfer", true);
    }
    
    /**
     * @dev Execute gasless marketplace listing via meta-transaction
     */
    function executeMetaMarketplaceListing(
        address user,
        string calldata domainName,
        uint256 priceETH,
        uint256 nonce,
        bytes calldata signature
    ) external payable nonReentrant whenNotPaused {
        // Verify nonce
        require(nonces[user] == nonce, "Invalid nonce");
        
        // Verify signature
        bytes32 messageHash = getMarketplaceMessageHash(user, domainName, priceETH, nonce);
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == user, "Invalid signature");
        
        // Verify payment amount
        require(msg.value >= listingFeeETH, "Insufficient payment");
        
        // Increment nonce to prevent replay
        nonces[user]++;
        
        // Execute marketplace listing logic
        _executeMarketplaceListing(user, domainName, priceETH, msg.value);
        
        emit MetaTransactionExecuted(user, msg.sender, "marketplace", true);
    }
    
    /**
     * @dev Internal function to execute registration (extracted from original)
     */
    function _executeRegistration(address user, string calldata domainName, uint256 ethAmount) internal {
        // Validate domain name
        require(isValidDomainName(domainName), "Invalid domain name");
        require(!processedDomains[domainName], "Domain already processed");
        
        // Generate request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            user,
            domainName,
            block.timestamp,
            block.number
        ));
        
        // Store registration request
        registrationRequests[requestId] = RegistrationRequest({
            user: user,
            domainName: domainName,
            ethAmount: ethAmount,
            timestamp: block.timestamp,
            completed: false,
            failed: false,
            pushChainTxHash: "",
            failureReason: ""
        });
        
        // Update mappings
        userRequests[user].push(requestId);
        processedDomains[domainName] = true;
        
        // Update stats
        totalRegistrations++;
        totalETHCollected += ethAmount;
        
        emit DomainRegistrationRequested(
            user,
            domainName,
            ethAmount,
            requestId,
            block.timestamp
        );
    }
    
    /**
     * @dev Internal function to execute transfer
     */
    function _executeTransfer(
        address user, 
        string calldata domainName, 
        address toAddress, 
        uint256 targetChainId, 
        uint256 ethAmount
    ) internal {
        // Generate request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            user,
            domainName,
            toAddress,
            targetChainId,
            block.timestamp,
            block.number
        ));
        
        // Store transfer request
        transferRequests[requestId] = TransferRequest({
            user: user,
            domainName: domainName,
            toAddress: toAddress,
            targetChainId: targetChainId,
            ethAmount: ethAmount,
            timestamp: block.timestamp,
            completed: false,
            failed: false,
            pushChainTxHash: "",
            failureReason: ""
        });
        
        // Update mappings
        userTransferRequests[user].push(requestId);
        
        // Update stats
        totalTransfers++;
        totalETHCollected += ethAmount;
        
        emit DomainTransferRequested(
            user,
            domainName,
            toAddress,
            targetChainId,
            ethAmount,
            requestId,
            block.timestamp
        );
    }
    
    /**
     * @dev Internal function to execute marketplace listing
     */
    function _executeMarketplaceListing(
        address user,
        string calldata domainName,
        uint256 priceETH,
        uint256 ethAmount
    ) internal {
        // Generate request ID
        bytes32 requestId = keccak256(abi.encodePacked(
            user,
            domainName,
            priceETH,
            block.timestamp,
            block.number
        ));
        
        // Store marketplace request
        marketplaceRequests[requestId] = MarketplaceRequest({
            user: user,
            domainName: domainName,
            priceETH: priceETH,
            ethAmount: ethAmount,
            timestamp: block.timestamp,
            completed: false,
            failed: false,
            pushChainTxHash: "",
            failureReason: ""
        });
        
        // Update mappings
        userMarketplaceRequests[user].push(requestId);
        
        // Update stats
        totalListings++;
        totalETHCollected += ethAmount;
        
        emit MarketplaceListingRequested(
            user,
            domainName,
            priceETH,
            ethAmount,
            requestId,
            block.timestamp
        );
    }
    
    /**
     * @dev Get message hash for registration
     */
    function getRegistrationMessageHash(
        address user,
        string calldata domainName,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "Register domain: ",
            domainName,
            ".push\nUser: ",
            user,
            "\nNonce: ",
            nonce
        ));
    }
    
    /**
     * @dev Get message hash for transfer
     */
    function getTransferMessageHash(
        address user,
        string calldata domainName,
        address toAddress,
        uint256 targetChainId,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "Transfer domain: ",
            domainName,
            ".push\nFrom: ",
            user,
            "\nTo: ",
            toAddress,
            "\nTarget Chain: ",
            targetChainId,
            "\nNonce: ",
            nonce
        ));
    }
    
    /**
     * @dev Get message hash for marketplace listing
     */
    function getMarketplaceMessageHash(
        address user,
        string calldata domainName,
        uint256 priceETH,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            "List domain: ",
            domainName,
            ".push\nSeller: ",
            user,
            "\nPrice: ",
            priceETH,
            " ETH\nNonce: ",
            nonce
        ));
    }
    
    /**
     * @dev Get current nonce for user
     */
    function getNonce(address user) external view returns (uint256) {
        return nonces[user];
    }
}
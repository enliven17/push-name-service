// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

// Push Chain Gateway interface for cross-chain messaging
interface IPushGateway {
    function sendMessage(
        uint256 targetChainId,
        address targetContract,
        bytes calldata payload,
        uint256 gasLimit
    ) external payable returns (bytes32 messageId);
    
    function getMessageFee(
        uint256 targetChainId,
        uint256 gasLimit
    ) external view returns (uint256 fee);
}

contract PushGatewayTest {
    IPushGateway public immutable gateway;
    
    event MessageSent(bytes32 indexed messageId, uint256 targetChainId, bytes payload);
    event MessageReceived(bytes32 indexed messageId, uint256 sourceChainId, bytes payload);
    
    constructor(address gatewayAddress) {
        gateway = IPushGateway(gatewayAddress);
    }
    
    function sendTestMessage(uint256 targetChainId) external payable {
        bytes memory payload = abi.encode("Hello from Push Chain!", block.timestamp, msg.sender);
        
        uint256 gasLimit = 100000;
        uint256 fee = gateway.getMessageFee(targetChainId, gasLimit);
        require(msg.value >= fee, "Insufficient fee");
        
        bytes32 messageId = gateway.sendMessage{value: fee}(
            targetChainId,
            address(this), // Target contract (same address on target chain)
            payload,
            gasLimit
        );
        
        emit MessageSent(messageId, targetChainId, payload);
        
        // Refund excess
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    function receiveMessage(
        bytes32 messageId,
        uint256 sourceChainId,
        bytes calldata payload
    ) external {
        // This would be called by the gateway on the target chain
        emit MessageReceived(messageId, sourceChainId, payload);
    }
}
import * as PushAPI from '@pushprotocol/restapi';
import { ethers } from 'ethers';

export interface PushNameServiceConfig {
  env: any; // Use any to avoid type conflicts with Push API
  account: string;
  signer?: ethers.Signer;
}

export interface DomainRecord {
  name: string;
  owner: string;
  expiresAt: number;
  sourceChainId: number;
  isUniversal: boolean;
  ipfsHash?: string;
  records?: Record<string, string>;
}

export interface CrossChainTransferRequest {
  domainName: string;
  fromAddress: string;
  toAddress: string;
  sourceChainId: number;
  targetChainId: number;
  messageId: string;
  timestamp: number;
}

export class PushNameService {
  private config: PushNameServiceConfig;
  private user: any;

  constructor(config: PushNameServiceConfig) {
    this.config = config;
  }

  async initialize() {
    try {
      // Check if wallet is available and unlocked
      if (!this.config.signer) {
        console.warn('⚠️ No signer available, skipping Push user initialization');
        return null;
      }

      // Try to get existing user first
      this.user = await PushAPI.user.get({
        account: this.config.account,
        env: this.config.env
      });

      if (!this.user) {
        console.log('📝 Creating new Push user...');
        // Create user if doesn't exist
        this.user = await PushAPI.user.create({
          account: this.config.account,
          env: this.config.env,
          signer: this.config.signer
        });
        console.log('✅ Push user created successfully');
      } else {
        console.log('✅ Push user found');
      }

      return this.user;
    } catch (error: any) {
      console.warn('⚠️ Push user initialization failed:', error.message);
      
      // Don't throw error - continue without Push features
      if (error.message?.includes('KeyringController') || error.message?.includes('locked')) {
        console.warn('💡 MetaMask is locked. Push features will be disabled until wallet is unlocked.');
      }
      
      return null;
    }
  }

  // Send cross-chain domain transfer notification
  async sendCrossChainTransferNotification(transfer: CrossChainTransferRequest) {
    try {
      const message = {
        type: 'CROSS_CHAIN_TRANSFER',
        title: `Domain Transfer: ${transfer.domainName}.push`,
        body: `Domain ${transfer.domainName}.push is being transferred from chain ${transfer.sourceChainId} to chain ${transfer.targetChainId}`,
        data: {
          domainName: transfer.domainName,
          fromAddress: transfer.fromAddress,
          toAddress: transfer.toAddress,
          sourceChainId: transfer.sourceChainId,
          targetChainId: transfer.targetChainId,
          messageId: transfer.messageId,
          timestamp: transfer.timestamp
        }
      };

      // Send notification to the recipient
      const response = await PushAPI.payloads.sendNotification({
        signer: this.config.signer!,
        type: 3, // targeted notification
        identityType: 2, // direct payload
        notification: {
          title: message.title,
          body: message.body
        },
        payload: {
          title: message.title,
          body: message.body,
          cta: '',
          img: ''
        },
        recipients: [transfer.toAddress],
        channel: this.config.account,
        env: this.config.env
      });

      return response;
    } catch (error) {
      console.error('Failed to send cross-chain transfer notification:', error);
      throw error;
    }
  }

  // Send domain registration notification
  async sendDomainRegistrationNotification(domain: DomainRecord) {
    try {
      const message = {
        type: 'DOMAIN_REGISTERED',
        title: `Domain Registered: ${domain.name}.push`,
        body: `Your domain ${domain.name}.push has been successfully registered and will expire on ${new Date(domain.expiresAt * 1000).toLocaleDateString()}`,
        data: domain
      };

      const response = await PushAPI.payloads.sendNotification({
        signer: this.config.signer!,
        type: 3, // targeted notification
        identityType: 2, // direct payload
        notification: {
          title: message.title,
          body: message.body
        },
        payload: {
          title: message.title,
          body: message.body,
          cta: '',
          img: ''
        },
        recipients: [domain.owner],
        channel: this.config.account,
        env: this.config.env
      });

      return response;
    } catch (error) {
      console.error('Failed to send domain registration notification:', error);
      throw error;
    }
  }

  // Send domain expiration warning
  async sendDomainExpirationWarning(domain: DomainRecord, daysUntilExpiry: number) {
    try {
      const message = {
        type: 'DOMAIN_EXPIRING',
        title: `Domain Expiring: ${domain.name}.push`,
        body: `Your domain ${domain.name}.push will expire in ${daysUntilExpiry} days. Renew now to keep your domain active.`,
        data: { ...domain, daysUntilExpiry }
      };

      const response = await PushAPI.payloads.sendNotification({
        signer: this.config.signer!,
        type: 3, // targeted notification
        identityType: 2, // direct payload
        notification: {
          title: message.title,
          body: message.body
        },
        payload: {
          title: message.title,
          body: message.body,
          cta: '',
          img: ''
        },
        recipients: [domain.owner],
        channel: this.config.account,
        env: this.config.env
      });

      return response;
    } catch (error) {
      console.error('Failed to send domain expiration warning:', error);
      throw error;
    }
  }

  // Get user's notifications
  async getUserNotifications(page = 1, limit = 10) {
    try {
      const notifications = await PushAPI.user.getFeeds({
        user: this.config.account,
        env: this.config.env,
        page,
        limit
      });

      return notifications;
    } catch (error) {
      console.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  // Subscribe to Push Name Service channel
  async subscribeToChannel(channelAddress: string) {
    try {
      const response = await PushAPI.channels.subscribe({
        signer: this.config.signer!,
        channelAddress,
        userAddress: this.config.account,
        onSuccess: () => {
          console.log('Successfully subscribed to Push Name Service channel');
        },
        onError: (error: any) => {
          console.error('Failed to subscribe to channel:', error);
        },
        env: this.config.env
      });

      return response;
    } catch (error) {
      console.error('Failed to subscribe to channel:', error);
      throw error;
    }
  }

  // Create a chat for domain-related discussions
  async createDomainChat(domainName: string, participants: string[]) {
    try {
      const chatId = `${domainName}.push`;
      
      const response = await PushAPI.chat.createGroup({
        groupName: `${domainName}.push Domain Chat`,
        groupDescription: `Discussion group for ${domainName}.push domain`,
        members: participants,
        groupImage: null,
        admins: [this.config.account],
        isPublic: false,
        account: this.config.account,
        env: this.config.env,
        signer: this.config.signer
      });

      return response;
    } catch (error) {
      console.error('Failed to create domain chat:', error);
      throw error;
    }
  }

  // Send message in domain chat
  async sendDomainChatMessage(chatId: string, message: string) {
    try {
      const response = await PushAPI.chat.send({
        messageContent: message,
        messageType: 'Text',
        receiverAddress: chatId,
        account: this.config.account,
        env: this.config.env,
        signer: this.config.signer
      });

      return response;
    } catch (error) {
      console.error('Failed to send chat message:', error);
      throw error;
    }
  }

  // Get domain chat history
  async getDomainChatHistory(chatId: string, page = 1, limit = 10) {
    try {
      const history = await PushAPI.chat.history({
        threadhash: chatId,
        account: this.config.account,
        limit,
        toDecrypt: true,
        env: this.config.env
      });

      return history;
    } catch (error) {
      console.error('Failed to get chat history:', error);
      throw error;
    }
  }

  // Create a video call for domain transfer verification
  async createDomainTransferCall(participants: string[], domainName: string) {
    try {
      // This would integrate with Push Video SDK when available
      const callData = {
        type: 'DOMAIN_TRANSFER_VERIFICATION',
        domainName,
        participants,
        timestamp: Date.now()
      };

      // For now, we'll send a notification about the call
      const response = await PushAPI.payloads.sendNotification({
        signer: this.config.signer!,
        type: 4, // broadcast notification
        identityType: 2, // direct payload
        notification: {
          title: `Domain Transfer Call: ${domainName}.push`,
          body: `A video call has been initiated for ${domainName}.push domain transfer verification`
        },
        payload: {
          title: `Domain Transfer Call: ${domainName}.push`,
          body: `A video call has been initiated for ${domainName}.push domain transfer verification`,
          cta: '',
          img: ''
        },
        recipients: participants,
        channel: this.config.account,
        env: this.config.env
      });

      return { callData, notification: response };
    } catch (error) {
      console.error('Failed to create domain transfer call:', error);
      throw error;
    }
  }
}

// Utility functions for Push Protocol integration
export const pushUtils = {
  // Format domain name for Push notifications
  formatDomainName: (name: string) => `${name}.push`,

  // Generate unique message ID for cross-chain transfers
  generateMessageId: (domainName: string, fromAddress: string, toAddress: string, sourceChainId: number, targetChainId: number) => {
    return ethers.keccak256(
      ethers.AbiCoder.defaultAbiCoder().encode(
        ['string', 'address', 'address', 'uint256', 'uint256', 'uint256'],
        [domainName, fromAddress, toAddress, sourceChainId, targetChainId, Date.now()]
      )
    );
  },

  // Validate Push address format
  isValidPushAddress: (address: string) => {
    return ethers.isAddress(address);
  },

  // Get supported chains for Push Protocol
  getSupportedChains: () => [
    { id: 1, name: 'Ethereum', symbol: 'ETH' },
    { id: 137, name: 'Polygon', symbol: 'MATIC' },
    { id: 56, name: 'BSC', symbol: 'BNB' },
    { id: 42161, name: 'Arbitrum', symbol: 'ETH' },
    { id: 10, name: 'Optimism', symbol: 'ETH' }
  ],

  // Format notification timestamp
  formatNotificationTime: (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }
};

export default PushNameService;
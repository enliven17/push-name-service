import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🔍 Push Name Service Supabase Debug:', {
  supabaseUrl: supabaseUrl ? 'Connected' : 'Missing',
  supabaseAnonKey: supabaseAnonKey ? 'Found' : 'Missing',
  actualUrl: supabaseUrl,
  keyLength: supabaseAnonKey?.length || 0
});

// Create a client with service role key for database operations (bypasses RLS)
export const supabase = supabaseUrl && (supabaseServiceKey || supabaseAnonKey)
  ? createClient(supabaseUrl as string, (supabaseServiceKey || supabaseAnonKey) as string, {
      db: { schema: 'public' },
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: {
          apikey: (supabaseServiceKey || supabaseAnonKey) as string,
          Authorization: `Bearer ${supabaseServiceKey || supabaseAnonKey}`,
          Accept: 'application/json'
        }
      }
    })
  : null

// Push Domain interface
export interface PushDomain {
  id: string
  name: string
  owner_address: string
  registration_date: string
  expiration_date: string
  is_universal: boolean
  source_chain_id: number
  current_chain_id: number
  transaction_hash?: string
  ipfs_hash?: string
  price_paid?: number
  currency?: string
  status: 'active' | 'expired' | 'transferred'
  created_at: string
  updated_at: string
}

// Domain Record interface
export interface DomainRecord {
  id: string
  domain_id: string
  record_type: string
  record_value: string
  ttl: number
  created_at: string
  updated_at: string
}

// Domain Transfer interface
export interface DomainTransfer {
  id: string
  domain_id: string
  from_address: string
  to_address: string
  from_chain_id: number
  to_chain_id: number
  transaction_hash?: string
  push_message_id?: string
  status: 'pending' | 'completed' | 'failed'
  initiated_at: string
  completed_at?: string
  error_message?: string
  created_at: string
}

// Push Notification interface
export interface PushNotification {
  id: string
  recipient_address: string
  notification_type: string
  title: string
  message: string
  domain_name?: string
  chain_id?: number
  transaction_hash?: string
  push_notification_id?: string
  is_sent: boolean
  sent_at?: string
  created_at: string
}

// Marketplace Listing interface
export interface MarketplaceListing {
  id: string
  domain_id: string
  seller_address: string
  price: number
  currency: string
  chain_id: number
  status: 'active' | 'sold' | 'cancelled' | 'expired'
  listing_transaction_hash?: string
  sale_transaction_hash?: string
  buyer_address?: string
  expires_at?: string
  created_at: string
  updated_at: string
}

// User Profile interface
export interface UserProfile {
  id: string
  wallet_address: string
  push_user_id?: string
  display_name?: string
  avatar_url?: string
  bio?: string
  is_push_subscribed: boolean
  push_channel_address?: string
  total_domains: number
  total_universal_domains: number
  created_at: string
  updated_at: string
}

// Legacy Domain interface for backward compatibility
export interface Domain extends PushDomain {}

// Push Name Service Database Operations
export class PushDomainService {
  private supabase = supabase

  constructor() {
    if (!this.supabase) {
      console.error('❌ Supabase client not initialized')
    }
  }

  // Check if domain is available
  async checkAvailability(domainName: string): Promise<boolean> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .rpc('check_domain_availability', { domain_name: domainName.toLowerCase() })

      if (error) {
        console.error('Error checking domain availability:', error)
        return false
      }

      return data as boolean
    } catch (error) {
      console.error('Error checking domain availability:', error)
      return false
    }
  }

  // Register a new domain
  async registerDomain(
    domainName: string,
    ownerAddress: string,
    chainId: number,
    transactionHash: string,
    isUniversal: boolean = false,
    price: number = 0.001,
    currency: string = 'PC'
  ): Promise<PushDomain> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .rpc('register_push_domain', {
          domain_name: domainName.toLowerCase(),
          owner_addr: ownerAddress.toLowerCase(),
          chain_id: chainId,
          tx_hash: transactionHash,
          is_universal_domain: isUniversal,
          price: price,
          currency_used: currency
        })

      if (error) {
        console.error('Error registering domain:', error)
        throw error
      }

      // Fetch the created domain
      const { data: domain, error: fetchError } = await this.supabase
        .from('push_domains')
        .select('*')
        .eq('id', data)
        .single()
      
      console.log('📋 Registered domain data:', domain)

      if (fetchError) {
        console.error('Error fetching registered domain:', fetchError)
        throw fetchError
      }

      return domain as PushDomain
    } catch (error) {
      console.error('Error registering domain:', error)
      throw error
    }
  }

  // Get domains by owner
  async getDomainsByOwner(ownerAddress: string): Promise<PushDomain[]> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .rpc('get_user_domains', { user_address: ownerAddress.toLowerCase() })

      if (error) {
        console.error('Error fetching user domains:', error)
        return []
      }

      return data as PushDomain[]
    } catch (error) {
      console.error('Error fetching user domains:', error)
      return []
    }
  }

  // Get domain by name
  async getDomainByName(domainName: string): Promise<PushDomain | null> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .from('push_domains')
        .select('*')
        .eq('name', domainName.toLowerCase())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Domain not found
        }
        console.error('Error fetching domain:', error)
        throw error
      }

      return data as PushDomain
    } catch (error) {
      console.error('Error fetching domain:', error)
      return null
    }
  }

  // Set domain record (A, CNAME, etc.)
  async setDomainRecord(
    domainId: string,
    recordType: string,
    recordValue: string,
    ttl: number = 3600
  ): Promise<DomainRecord> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .from('push_domain_records')
        .upsert({
          domain_id: domainId,
          record_type: recordType.toUpperCase(),
          record_value: recordValue,
          ttl: ttl
        })
        .select()
        .single()

      if (error) {
        console.error('Error setting domain record:', error)
        throw error
      }

      return data as DomainRecord
    } catch (error) {
      console.error('Error setting domain record:', error)
      throw error
    }
  }

  // Get domain records
  async getDomainRecords(domainId: string): Promise<DomainRecord[]> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .from('push_domain_records')
        .select('*')
        .eq('domain_id', domainId)

      if (error) {
        console.error('Error fetching domain records:', error)
        return []
      }

      return data as DomainRecord[]
    } catch (error) {
      console.error('Error fetching domain records:', error)
      return []
    }
  }

  // Create domain transfer
  async createDomainTransfer(
    domainId: string,
    fromAddress: string,
    toAddress: string,
    fromChainId: number,
    toChainId: number,
    transactionHash?: string,
    pushMessageId?: string
  ): Promise<DomainTransfer> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .from('push_domain_transfers')
        .insert({
          domain_id: domainId,
          from_address: fromAddress.toLowerCase(),
          to_address: toAddress.toLowerCase(),
          from_chain_id: fromChainId,
          to_chain_id: toChainId,
          transaction_hash: transactionHash,
          push_message_id: pushMessageId,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating domain transfer:', error)
        throw error
      }

      return data as DomainTransfer
    } catch (error) {
      console.error('Error creating domain transfer:', error)
      throw error
    }
  }

  // Get user profile
  async getUserProfile(walletAddress: string): Promise<UserProfile | null> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .from('push_user_profiles')
        .select('*')
        .eq('wallet_address', walletAddress.toLowerCase())
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // Profile not found
        }
        console.error('Error fetching user profile:', error)
        throw error
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Create or update user profile
  async upsertUserProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    if (!this.supabase) throw new Error('Supabase not connected')

    try {
      const { data, error } = await this.supabase
        .from('push_user_profiles')
        .upsert(profile)
        .select()
        .single()

      if (error) {
        console.error('Error upserting user profile:', error)
        throw error
      }

      return data as UserProfile
    } catch (error) {
      console.error('Error upserting user profile:', error)
      throw error
    }
  }
}

// Create singleton instance
export const pushDomainService = new PushDomainService()

// Legacy domain service for backward compatibility
export const domainService = {
  checkAvailability: (name: string) => pushDomainService.checkAvailability(name),
  registerDomain: (name: string, owner: string, price: string, txHash: string) => 
    pushDomainService.registerDomain(name, owner, 42101, txHash, false, parseFloat(price), 'PC'),
  getDomainsByOwner: (owner: string) => pushDomainService.getDomainsByOwner(owner),
  getTransferHistory: async (address: string) => {
    // Return empty array for now - will implement later
    return []
  },
  directDomainTransfer: async (domainId: string, fromAddress: string, toAddress: string, txHash: string) => {
    // Create transfer record and update domain owner
    if (!supabase) throw new Error('Supabase not connected')
    
    try {
      // Update domain owner
      const { error: updateError } = await supabase
        .from('push_domains')
        .update({ 
          owner_address: toAddress.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq('id', domainId)

      if (updateError) throw updateError

      // Create transfer record
      await pushDomainService.createDomainTransfer(
        domainId,
        fromAddress,
        toAddress,
        42101, // Push Chain
        42101, // Same chain transfer
        txHash
      )

      return true
    } catch (error) {
      console.error('Error in direct domain transfer:', error)
      throw error
    }
  }
}

// Test connection
if (supabase) {
  console.log('✅ Push Name Service Supabase connected successfully')
} else {
  console.error('❌ Push Name Service Supabase connection failed')
}
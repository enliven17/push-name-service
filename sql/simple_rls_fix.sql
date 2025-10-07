-- Simple RLS Fix for Push Name Service
-- Run this in Supabase SQL Editor

-- Disable RLS for all tables (development mode)
ALTER TABLE push_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_domain_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_domain_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_user_profiles DISABLE ROW LEVEL SECURITY;

-- Grant permissions to all roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- Ensure the tables exist and have proper structure
CREATE TABLE IF NOT EXISTS push_domains (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(63) NOT NULL UNIQUE,
    owner_address VARCHAR(42) NOT NULL,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_universal BOOLEAN DEFAULT FALSE,
    source_chain_id INTEGER NOT NULL DEFAULT 42101,
    current_chain_id INTEGER NOT NULL DEFAULT 42101,
    transaction_hash VARCHAR(66),
    ipfs_hash VARCHAR(100),
    price_paid DECIMAL(18, 8),
    currency VARCHAR(10) DEFAULT 'PC',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_user_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    push_user_id VARCHAR(100),
    display_name VARCHAR(100),
    avatar_url TEXT,
    bio TEXT,
    is_push_subscribed BOOLEAN DEFAULT FALSE,
    push_channel_address VARCHAR(42),
    total_domains INTEGER DEFAULT 0,
    total_universal_domains INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_push_domains_owner ON push_domains(owner_address);
CREATE INDEX IF NOT EXISTS idx_push_domains_name ON push_domains(name);
CREATE INDEX IF NOT EXISTS idx_push_profiles_wallet ON push_user_profiles(wallet_address);
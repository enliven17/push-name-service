-- Push Name Service Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create push_domains table
CREATE TABLE IF NOT EXISTS push_domains (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(63) NOT NULL UNIQUE, -- Domain name without .push extension
    owner_address VARCHAR(42) NOT NULL, -- Ethereum address
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expiration_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_universal BOOLEAN DEFAULT FALSE, -- Can be transferred cross-chain
    source_chain_id INTEGER NOT NULL DEFAULT 42101, -- Push Chain Donut Testnet
    current_chain_id INTEGER NOT NULL DEFAULT 42101,
    transaction_hash VARCHAR(66), -- Registration transaction hash
    ipfs_hash VARCHAR(100), -- IPFS content hash
    price_paid DECIMAL(18, 8), -- Price paid in native currency
    currency VARCHAR(10) DEFAULT 'PC', -- Currency used (PC, ETH, MATIC, etc.)
    status VARCHAR(20) DEFAULT 'active', -- active, expired, transferred
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push_domain_records table for DNS-like records
CREATE TABLE IF NOT EXISTS push_domain_records (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    domain_id UUID REFERENCES push_domains(id) ON DELETE CASCADE,
    record_type VARCHAR(20) NOT NULL, -- A, CNAME, TXT, MX, etc.
    record_value TEXT NOT NULL,
    ttl INTEGER DEFAULT 3600,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(domain_id, record_type)
);

-- Create push_domain_transfers table for cross-chain transfers
CREATE TABLE IF NOT EXISTS push_domain_transfers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    domain_id UUID REFERENCES push_domains(id) ON DELETE CASCADE,
    from_address VARCHAR(42) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    from_chain_id INTEGER NOT NULL,
    to_chain_id INTEGER NOT NULL,
    transaction_hash VARCHAR(66),
    push_message_id VARCHAR(66), -- Push Protocol message ID
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push_notifications table for Push Protocol notifications
CREATE TABLE IF NOT EXISTS push_notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_address VARCHAR(42) NOT NULL,
    notification_type VARCHAR(50) NOT NULL, -- domain_registered, domain_expiring, transfer_completed, etc.
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    domain_name VARCHAR(63),
    chain_id INTEGER,
    transaction_hash VARCHAR(66),
    push_notification_id VARCHAR(100), -- Push Protocol notification ID
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push_marketplace_listings table
CREATE TABLE IF NOT EXISTS push_marketplace_listings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    domain_id UUID REFERENCES push_domains(id) ON DELETE CASCADE,
    seller_address VARCHAR(42) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    chain_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'active', -- active, sold, cancelled, expired
    listing_transaction_hash VARCHAR(66),
    sale_transaction_hash VARCHAR(66),
    buyer_address VARCHAR(42),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create push_user_profiles table for Push Protocol user data
CREATE TABLE IF NOT EXISTS push_user_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL UNIQUE,
    push_user_id VARCHAR(100), -- Push Protocol user ID
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_push_domains_owner ON push_domains(owner_address);
CREATE INDEX IF NOT EXISTS idx_push_domains_name ON push_domains(name);
CREATE INDEX IF NOT EXISTS idx_push_domains_chain ON push_domains(current_chain_id);
CREATE INDEX IF NOT EXISTS idx_push_domains_expiration ON push_domains(expiration_date);
CREATE INDEX IF NOT EXISTS idx_push_domains_status ON push_domains(status);

CREATE INDEX IF NOT EXISTS idx_push_transfers_domain ON push_domain_transfers(domain_id);
CREATE INDEX IF NOT EXISTS idx_push_transfers_from ON push_domain_transfers(from_address);
CREATE INDEX IF NOT EXISTS idx_push_transfers_to ON push_domain_transfers(to_address);
CREATE INDEX IF NOT EXISTS idx_push_transfers_status ON push_domain_transfers(status);

CREATE INDEX IF NOT EXISTS idx_push_notifications_recipient ON push_notifications(recipient_address);
CREATE INDEX IF NOT EXISTS idx_push_notifications_type ON push_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_push_notifications_sent ON push_notifications(is_sent);

CREATE INDEX IF NOT EXISTS idx_push_listings_domain ON push_marketplace_listings(domain_id);
CREATE INDEX IF NOT EXISTS idx_push_listings_seller ON push_marketplace_listings(seller_address);
CREATE INDEX IF NOT EXISTS idx_push_listings_status ON push_marketplace_listings(status);

CREATE INDEX IF NOT EXISTS idx_push_profiles_wallet ON push_user_profiles(wallet_address);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_push_domains_updated_at BEFORE UPDATE ON push_domains FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_domain_records_updated_at BEFORE UPDATE ON push_domain_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_marketplace_listings_updated_at BEFORE UPDATE ON push_marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_user_profiles_updated_at BEFORE UPDATE ON push_user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create RLS (Row Level Security) policies
ALTER TABLE push_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_domain_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_domain_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_user_profiles ENABLE ROW LEVEL SECURITY;

-- Policies for push_domains
CREATE POLICY "Public domains are viewable by everyone" ON push_domains FOR SELECT USING (true);
CREATE POLICY "Users can insert their own domains" ON push_domains FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own domains" ON push_domains FOR UPDATE USING (owner_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid()));

-- Policies for push_domain_records
CREATE POLICY "Domain records are viewable by everyone" ON push_domain_records FOR SELECT USING (true);
CREATE POLICY "Domain owners can manage their records" ON push_domain_records FOR ALL USING (
    domain_id IN (SELECT id FROM push_domains WHERE owner_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid()))
);

-- Policies for push_domain_transfers
CREATE POLICY "Transfers are viewable by involved parties" ON push_domain_transfers FOR SELECT USING (
    from_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid()) OR
    to_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Users can initiate transfers for their domains" ON push_domain_transfers FOR INSERT WITH CHECK (
    from_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid())
);

-- Policies for push_notifications
CREATE POLICY "Users can view their own notifications" ON push_notifications FOR SELECT USING (
    recipient_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid())
);

-- Policies for push_marketplace_listings
CREATE POLICY "Listings are viewable by everyone" ON push_marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Users can create listings for their domains" ON push_marketplace_listings FOR INSERT WITH CHECK (
    seller_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid())
);
CREATE POLICY "Sellers can update their own listings" ON push_marketplace_listings FOR UPDATE USING (
    seller_address = (SELECT wallet_address FROM push_user_profiles WHERE id = auth.uid())
);

-- Policies for push_user_profiles
CREATE POLICY "Profiles are viewable by everyone" ON push_user_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON push_user_profiles FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own profile" ON push_user_profiles FOR UPDATE USING (id = auth.uid());

-- Create functions for domain management
CREATE OR REPLACE FUNCTION check_domain_availability(domain_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN NOT EXISTS (
        SELECT 1 FROM push_domains 
        WHERE name = LOWER(domain_name) 
        AND (status = 'active' AND expiration_date > NOW())
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_user_domains(user_address TEXT)
RETURNS TABLE (
    id UUID,
    name VARCHAR(63),
    expiration_date TIMESTAMP WITH TIME ZONE,
    is_universal BOOLEAN,
    current_chain_id INTEGER,
    status VARCHAR(20)
) AS $$
BEGIN
    RETURN QUERY
    SELECT d.id, d.name, d.expiration_date, d.is_universal, d.current_chain_id, d.status
    FROM push_domains d
    WHERE d.owner_address = LOWER(user_address)
    ORDER BY d.created_at DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION register_push_domain(
    domain_name TEXT,
    owner_addr TEXT,
    chain_id INTEGER,
    tx_hash TEXT,
    is_universal_domain BOOLEAN DEFAULT FALSE,
    price DECIMAL DEFAULT 0.001,
    currency_used TEXT DEFAULT 'PC'
)
RETURNS UUID AS $$
DECLARE
    domain_id UUID;
BEGIN
    INSERT INTO push_domains (
        name, 
        owner_address, 
        expiration_date, 
        is_universal, 
        source_chain_id, 
        current_chain_id, 
        transaction_hash, 
        price_paid, 
        currency
    ) VALUES (
        LOWER(domain_name),
        LOWER(owner_addr),
        NOW() + INTERVAL '1 year',
        is_universal_domain,
        chain_id,
        chain_id,
        tx_hash,
        price,
        currency_used
    ) RETURNING id INTO domain_id;
    
    -- Update user profile domain count
    INSERT INTO push_user_profiles (wallet_address, total_domains, total_universal_domains)
    VALUES (LOWER(owner_addr), 1, CASE WHEN is_universal_domain THEN 1 ELSE 0 END)
    ON CONFLICT (wallet_address) 
    DO UPDATE SET 
        total_domains = push_user_profiles.total_domains + 1,
        total_universal_domains = push_user_profiles.total_universal_domains + CASE WHEN is_universal_domain THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN domain_id;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO push_domains (name, owner_address, expiration_date, is_universal, source_chain_id, current_chain_id, price_paid, currency) VALUES
('test', '0x1234567890123456789012345678901234567890', NOW() + INTERVAL '1 year', true, 42101, 42101, 0.001, 'PC'),
('demo', '0x1234567890123456789012345678901234567890', NOW() + INTERVAL '1 year', false, 42101, 42101, 0.001, 'PC'),
('example', '0x0987654321098765432109876543210987654321', NOW() + INTERVAL '1 year', true, 42101, 42101, 0.001, 'PC')
ON CONFLICT (name) DO NOTHING;

-- Insert sample domain records
INSERT INTO push_domain_records (domain_id, record_type, record_value) 
SELECT d.id, 'A', '192.168.1.1' FROM push_domains d WHERE d.name = 'test'
ON CONFLICT (domain_id, record_type) DO NOTHING;

INSERT INTO push_domain_records (domain_id, record_type, record_value) 
SELECT d.id, 'CNAME', 'example.com' FROM push_domains d WHERE d.name = 'demo'
ON CONFLICT (domain_id, record_type) DO NOTHING;

COMMENT ON TABLE push_domains IS 'Main table for .push domain registrations';
COMMENT ON TABLE push_domain_records IS 'DNS-like records for .push domains';
COMMENT ON TABLE push_domain_transfers IS 'Cross-chain domain transfer history';
COMMENT ON TABLE push_notifications IS 'Push Protocol notifications log';
COMMENT ON TABLE push_marketplace_listings IS 'Domain marketplace listings';
COMMENT ON TABLE push_user_profiles IS 'User profiles with Push Protocol integration';
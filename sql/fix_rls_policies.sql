-- Fix RLS Policies for Push Name Service
-- Run this in your Supabase SQL Editor to fix the RLS policy issues

-- Drop existing policies
DROP POLICY IF EXISTS "Public domains are viewable by everyone" ON push_domains;
DROP POLICY IF EXISTS "Users can insert their own domains" ON push_domains;
DROP POLICY IF EXISTS "Users can update their own domains" ON push_domains;

DROP POLICY IF EXISTS "Domain records are viewable by everyone" ON push_domain_records;
DROP POLICY IF EXISTS "Domain owners can manage their records" ON push_domain_records;

DROP POLICY IF EXISTS "Transfers are viewable by involved parties" ON push_domain_transfers;
DROP POLICY IF EXISTS "Users can initiate transfers for their domains" ON push_domain_transfers;

DROP POLICY IF EXISTS "Users can view their own notifications" ON push_notifications;

DROP POLICY IF EXISTS "Listings are viewable by everyone" ON push_marketplace_listings;
DROP POLICY IF EXISTS "Users can create listings for their domains" ON push_marketplace_listings;
DROP POLICY IF EXISTS "Sellers can update their own listings" ON push_marketplace_listings;

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON push_user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON push_user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON push_user_profiles;

-- Create new simplified policies that allow public access
-- Since this is a public domain service, we'll allow read access to everyone
-- and write access through service role key

-- Policies for push_domains
CREATE POLICY "Allow public read access to domains" ON push_domains FOR SELECT USING (true);
CREATE POLICY "Allow service role to insert domains" ON push_domains FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service role to update domains" ON push_domains FOR UPDATE USING (true);
CREATE POLICY "Allow service role to delete domains" ON push_domains FOR DELETE USING (true);

-- Policies for push_domain_records
CREATE POLICY "Allow public read access to domain records" ON push_domain_records FOR SELECT USING (true);
CREATE POLICY "Allow service role to manage domain records" ON push_domain_records FOR ALL USING (true);

-- Policies for push_domain_transfers
CREATE POLICY "Allow public read access to transfers" ON push_domain_transfers FOR SELECT USING (true);
CREATE POLICY "Allow service role to manage transfers" ON push_domain_transfers FOR ALL USING (true);

-- Policies for push_notifications
CREATE POLICY "Allow public read access to notifications" ON push_notifications FOR SELECT USING (true);
CREATE POLICY "Allow service role to manage notifications" ON push_notifications FOR ALL USING (true);

-- Policies for push_marketplace_listings
CREATE POLICY "Allow public read access to listings" ON push_marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Allow service role to manage listings" ON push_marketplace_listings FOR ALL USING (true);

-- Policies for push_user_profiles
CREATE POLICY "Allow public read access to profiles" ON push_user_profiles FOR SELECT USING (true);
CREATE POLICY "Allow service role to manage profiles" ON push_user_profiles FOR ALL USING (true);

-- Alternative: Disable RLS entirely for development (uncomment if needed)
-- ALTER TABLE push_domains DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE push_domain_records DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE push_domain_transfers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE push_notifications DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE push_marketplace_listings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE push_user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop the existing function first
DROP FUNCTION IF EXISTS register_push_domain(TEXT, TEXT, INTEGER, TEXT, BOOLEAN, DECIMAL, TEXT);

-- Grant necessary permissions to authenticated and anon roles
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
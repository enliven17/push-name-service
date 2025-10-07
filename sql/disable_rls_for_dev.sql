-- Disable RLS for development
-- Run this in Supabase SQL Editor to temporarily disable RLS

ALTER TABLE push_domains DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_domain_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_domain_transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_marketplace_listings DISABLE ROW LEVEL SECURITY;
ALTER TABLE push_user_profiles DISABLE ROW LEVEL SECURITY;

-- Grant full access to all roles for development
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
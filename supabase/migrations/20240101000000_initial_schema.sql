/*
  # Initial Schema Setup for KeiYaShiv Water Supply

  ## Query Description:
  This migration creates the necessary tables (clients, drivers, entries, payments, tanker_sizes, invoice_settings) 
  to store all application data in Supabase. It also sets up Row Level Security (RLS) policies to allow 
  standard CRUD operations and inserts default configuration data to prevent frontend crashes.
  
  ## Metadata:
  - Schema-Category: Structural
  - Impact-Level: High
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Creates `clients` table with custom pricing JSONB.
  - Creates `drivers` table linked to clients.
  - Creates `entries` table for tanker trips.
  - Creates `payments` table for transaction records.
  - Creates `tanker_sizes` for global pricing.
  - Creates `invoice_settings` for app configuration.
  
  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: Added permissive policies for all tables to allow frontend operations.
  - Auth Requirements: None (Anon access allowed for ease of use as requested).
  
  ## Performance Impact:
  - Indexes: Primary keys created. Foreign keys added for relational integrity.
  - Triggers: None.
  - Estimated Impact: Low.
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  address TEXT,
  "invoiceFrequency" TEXT NOT NULL,
  "customPricing" JSONB
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  "clientId" TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE
);

-- Create entries table
CREATE TABLE IF NOT EXISTS entries (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  "clientId" TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  "driverId" TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  "clientId" TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  mode TEXT NOT NULL,
  "chequeNumber" TEXT,
  "chequeDate" TEXT,
  "receiverName" TEXT NOT NULL,
  notes TEXT
);

-- Create tanker_sizes table
CREATE TABLE IF NOT EXISTS tanker_sizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL
);

-- Create invoice_settings table
CREATE TABLE IF NOT EXISTS invoice_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  "companyName" TEXT NOT NULL,
  "companyAddress" TEXT NOT NULL,
  "taxId" TEXT,
  "footerNote" TEXT NOT NULL,
  terms TEXT NOT NULL,
  "invoiceDay" INTEGER NOT NULL,
  "autoEmail" BOOLEAN NOT NULL,
  "ccEmails" TEXT,
  last_auto_invoice_date TEXT
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanker_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all operations on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on entries" ON entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on tanker_sizes" ON tanker_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on invoice_settings" ON invoice_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default data
INSERT INTO invoice_settings (id, "companyName", "companyAddress", "footerNote", terms, "invoiceDay", "autoEmail", "ccEmails")
VALUES (
  1,
  'KeiYaShiv Water Supply',
  '123, Water Works Road, City - 380001',
  'Thank you for your business!',
  'Payment due within 7 days of invoice date.',
  1,
  true,
  ''
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tanker_sizes (id, name, price) VALUES
('t1', '5000L', 150),
('t2', '30000L', 750)
ON CONFLICT (id) DO NOTHING;

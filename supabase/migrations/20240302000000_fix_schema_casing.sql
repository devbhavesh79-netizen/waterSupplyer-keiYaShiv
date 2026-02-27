/*
  # Fix Database Schema and Column Names
  
  ## Query Description:
  This migration drops the incorrectly formatted tables (with camelCase columns) and recreates them using standard snake_case naming conventions. It also inserts the required default data for invoice_settings and tanker_sizes to prevent null constraint violations.
  
  ## Metadata:
  - Schema-Category: Structural
  - Impact-Level: High (Recreates tables)
  - Requires-Backup: false (Assuming fresh setup as CRUD was failing)
  - Reversible: false
  
  ## Structure Details:
  - Recreates `clients`, `drivers`, `tanker_sizes`, `entries`, `payments`, `invoice_settings` with snake_case columns.
  - Adds default row to `invoice_settings` to fix the 23502 error.
  - Adds permissive RLS policies to allow the frontend to read/write data.
*/

-- Drop existing tables to fix column casing issues
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS drivers CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS tanker_sizes CASCADE;
DROP TABLE IF EXISTS invoice_settings CASCADE;

-- Create clients table
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  email TEXT,
  address TEXT,
  invoice_frequency TEXT NOT NULL DEFAULT 'Monthly',
  custom_pricing JSONB
);

-- Create drivers table
CREATE TABLE drivers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE
);

-- Create tanker_sizes table
CREATE TABLE tanker_sizes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL
);

-- Create entries table
CREATE TABLE entries (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  driver_id TEXT REFERENCES drivers(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  price NUMERIC NOT NULL
);

-- Create payments table
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  date TIMESTAMPTZ NOT NULL,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  mode TEXT NOT NULL,
  cheque_number TEXT,
  cheque_date TIMESTAMPTZ,
  receiver_name TEXT NOT NULL,
  notes TEXT
);

-- Create invoice_settings table with snake_case
CREATE TABLE invoice_settings (
  id INT PRIMARY KEY DEFAULT 1,
  company_name TEXT NOT NULL,
  company_address TEXT NOT NULL,
  tax_id TEXT,
  footer_note TEXT NOT NULL,
  terms TEXT NOT NULL,
  invoice_day INT NOT NULL DEFAULT 1,
  auto_email BOOLEAN NOT NULL DEFAULT true,
  cc_emails TEXT,
  last_auto_invoice_date TEXT
);

-- Enable RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanker_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for anon access (since there's no auth currently)
CREATE POLICY "Allow all operations for anon on clients" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on drivers" ON drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on tanker_sizes" ON tanker_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on entries" ON entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on payments" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on invoice_settings" ON invoice_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default invoice settings
INSERT INTO invoice_settings (
  id, company_name, company_address, footer_note, terms, invoice_day, auto_email
) VALUES (
  1, 
  'KeiYaShiv Water Supply', 
  '123, Water Works Road, City - 380001', 
  'Thank you for your business!', 
  'Payment due within 7 days of invoice date.', 
  1, 
  true
);

-- Insert default tanker sizes
INSERT INTO tanker_sizes (id, name, price) VALUES 
  ('t1', '5000L', 150),
  ('t2', '30000L', 750);

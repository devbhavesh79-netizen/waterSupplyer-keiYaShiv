/*
  # Setup Database Schema
  Creates necessary tables for the water supply management system.

  ## Query Description:
  This operation creates the core tables (clients, drivers, entries, payments, tanker_sizes, invoice_settings) and sets up Row Level Security (RLS) policies to allow anonymous access for the frontend application.

  ## Metadata:
  - Schema-Category: "Structural"
  - Impact-Level: "High"
  - Requires-Backup: false
  - Reversible: true

  ## Structure Details:
  Creates 6 tables with their respective columns and foreign key relationships.

  ## Security Implications:
  - RLS Status: Enabled
  - Policy Changes: Yes (Public access granted for MVP)
  - Auth Requirements: None
*/

-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    email TEXT,
    address TEXT,
    invoice_frequency TEXT NOT NULL DEFAULT 'Monthly',
    custom_pricing JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE IF NOT EXISTS public.drivers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create entries table
CREATE TABLE IF NOT EXISTS public.entries (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    driver_id TEXT REFERENCES public.drivers(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    date TIMESTAMPTZ NOT NULL,
    client_id TEXT REFERENCES public.clients(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    mode TEXT NOT NULL,
    cheque_number TEXT,
    cheque_date TIMESTAMPTZ,
    receiver_name TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tanker_sizes table
CREATE TABLE IF NOT EXISTS public.tanker_sizes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invoice_settings table
CREATE TABLE IF NOT EXISTS public.invoice_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    company_name TEXT NOT NULL DEFAULT 'KeiYaShiv Water Supply',
    company_address TEXT NOT NULL DEFAULT '123, Water Works Road, City - 380001',
    tax_id TEXT,
    footer_note TEXT DEFAULT 'Thank you for your business!',
    terms TEXT DEFAULT 'Payment due within 7 days of invoice date.',
    invoice_day INTEGER DEFAULT 1,
    auto_email BOOLEAN DEFAULT true,
    cc_emails TEXT,
    last_auto_invoice_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tanker_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-run
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Allow public all access on clients" ON public.clients;
    DROP POLICY IF EXISTS "Allow public all access on drivers" ON public.drivers;
    DROP POLICY IF EXISTS "Allow public all access on entries" ON public.entries;
    DROP POLICY IF EXISTS "Allow public all access on payments" ON public.payments;
    DROP POLICY IF EXISTS "Allow public all access on tanker_sizes" ON public.tanker_sizes;
    DROP POLICY IF EXISTS "Allow public all access on invoice_settings" ON public.invoice_settings;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Create public access policies (Since there's no auth yet)
CREATE POLICY "Allow public all access on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on drivers" ON public.drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on entries" ON public.entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on tanker_sizes" ON public.tanker_sizes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all access on invoice_settings" ON public.invoice_settings FOR ALL USING (true) WITH CHECK (true);

-- Insert default tanker sizes if not exists
INSERT INTO public.tanker_sizes (id, name, price) 
VALUES 
    ('t1', '5000L', 150),
    ('t2', '30000L', 750)
ON CONFLICT DO NOTHING;

-- Insert default invoice settings
INSERT INTO public.invoice_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

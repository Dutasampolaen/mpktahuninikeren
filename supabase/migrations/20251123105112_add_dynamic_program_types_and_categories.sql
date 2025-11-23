/*
  # Add Dynamic Program Types and Categories
  
  1. New Tables
    - program_types: Store custom program types
    - program_categories: Store custom program categories
  
  2. Changes
    - These replace the hardcoded values in the frontend
*/

-- Create program types table
CREATE TABLE IF NOT EXISTS program_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create program categories table
CREATE TABLE IF NOT EXISTS program_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  display_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE program_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Everyone can view active program types"
  ON program_types FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage program types"
  ON program_types FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Everyone can view active program categories"
  ON program_categories FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins can manage program categories"
  ON program_categories FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default types
INSERT INTO program_types (name, display_name, description) VALUES
  ('kegiatan_besar', 'Kegiatan Besar', 'Program berskala besar yang membutuhkan persiapan ekstensif'),
  ('kegiatan_kecil', 'Kegiatan Kecil', 'Program berskala kecil dengan persiapan minimal'),
  ('advokasi', 'Advokasi', 'Program advokasi dan aspirasi siswa')
ON CONFLICT (name) DO NOTHING;

-- Insert default categories
INSERT INTO program_categories (name, display_name, description) VALUES
  ('pendidikan', 'Pendidikan', 'Program terkait pendidikan dan pembelajaran'),
  ('sosial', 'Sosial', 'Program kegiatan sosial kemasyarakatan'),
  ('olahraga', 'Olahraga', 'Program kegiatan olahraga dan kesehatan'),
  ('seni_budaya', 'Seni & Budaya', 'Program seni dan kebudayaan'),
  ('lingkungan', 'Lingkungan', 'Program peduli lingkungan'),
  ('kesehatan', 'Kesehatan', 'Program kesehatan dan kebersihan')
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_program_types_active ON program_types(is_active);
CREATE INDEX IF NOT EXISTS idx_program_categories_active ON program_categories(is_active);

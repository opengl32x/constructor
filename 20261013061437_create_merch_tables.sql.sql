/*
# Create merchandise constructor tables (single-tenant, no auth)

## Overview
This migration creates the core schema for the Merch Constructor app.
The app is a single-tenant (no sign-in) application, so all policies
allow anon + authenticated access since data is intentionally public/shared.

## New Tables
1. **products** — Base merchandise items (hoodie, t-shirt, sweatshirt, cap)
   - id (uuid, PK)
   - name (text) — display name, e.g. "Худи оверсайз"
   - product_type (text) — "hoodie" | "tshirt" | "sweatshirt" | "cap"
   - description (text)
   - base_price (numeric) — base price in rubles
   - available_colors (jsonb) — array of {name, hex} color objects
   - sizes (jsonb) — array of size strings, e.g. ["S","M","L","XL"]
   - mockup_front_svg (text) — SVG path or URL for front mockup
   - mockup_back_svg (text) — SVG path or URL for back mockup
   - canvas_area (jsonb) — {x, y, width, height} of printable area on mockup
   - created_at (timestamptz)

2. **presets** — Pre-made community designs
   - id (uuid, PK)
   - product_id (uuid, FK → products)
   - name (text)
   - thumbnail_url (text) — preview image URL
   - design_config (jsonb) — full JSON of canvas layers/objects
   - is_featured (boolean) — show on homepage
   - created_at (timestamptz)

3. **orders** — Customer orders
   - id (uuid, PK)
   - customer_name (text)
   - customer_email (text)
   - customer_phone (text)
   - shipping_address (text)
   - items (jsonb) — array of {product_id, product_name, size, color, quantity, design_config, preview_url, price}
   - total_amount (numeric)
   - status (text) — "pending" | "processing" | "shipped" | "delivered"
   - created_at (timestamptz)

4. **cliparts** — Library of ready-to-use icons/graphics
   - id (uuid, PK)
   - name (text)
   - category (text) — e.g. "icons", "logos", "shapes", "emoji"
   - image_url (text) — URL to the clipart image
   - thumbnail_url (text)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant app with no sign-in; data is intentionally public.
- orders table: anon can INSERT (place orders) and SELECT (view status), but
  cannot UPDATE or DELETE (orders are managed by the store operator).
*/

-- ──────────────── products ────────────────
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_type text NOT NULL,
  description text DEFAULT '',
  base_price numeric(10, 2) NOT NULL DEFAULT 0,
  available_colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  sizes jsonb NOT NULL DEFAULT '["S","M","L","XL","XXL"]'::jsonb,
  mockup_front_svg text DEFAULT '',
  mockup_back_svg text DEFAULT '',
  canvas_area jsonb NOT NULL DEFAULT '{"x":80,"y":120,"width":240,"height":280}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_products" ON products;
CREATE POLICY "anon_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_products" ON products;
CREATE POLICY "anon_insert_products" ON products FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_products" ON products;
CREATE POLICY "anon_update_products" ON products FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_products" ON products;
CREATE POLICY "anon_delete_products" ON products FOR DELETE
  TO anon, authenticated USING (true);

-- ──────────────── presets ────────────────
CREATE TABLE IF NOT EXISTS presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  thumbnail_url text DEFAULT '',
  design_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_presets" ON presets;
CREATE POLICY "anon_select_presets" ON presets FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_presets" ON presets;
CREATE POLICY "anon_insert_presets" ON presets FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_presets" ON presets;
CREATE POLICY "anon_update_presets" ON presets FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_presets" ON presets;
CREATE POLICY "anon_delete_presets" ON presets FOR DELETE
  TO anon, authenticated USING (true);

-- ──────────────── orders ────────────────
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text NOT NULL,
  shipping_address text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10, 2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_orders" ON orders;
CREATE POLICY "anon_select_orders" ON orders FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- No UPDATE/DELETE policies: orders are managed by the store operator, not the frontend.

-- ──────────────── cliparts ────────────────
CREATE TABLE IF NOT EXISTS cliparts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'icons',
  image_url text NOT NULL,
  thumbnail_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE cliparts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cliparts" ON cliparts;
CREATE POLICY "anon_select_cliparts" ON cliparts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cliparts" ON cliparts;
CREATE POLICY "anon_insert_cliparts" ON cliparts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cliparts" ON cliparts;
CREATE POLICY "anon_update_cliparts" ON cliparts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cliparts" ON cliparts;
CREATE POLICY "anon_delete_cliparts" ON cliparts FOR DELETE
  TO anon, authenticated USING (true);

-- ──────────────── Indexes ────────────────
CREATE INDEX IF NOT EXISTS idx_products_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_presets_product ON presets(product_id);
CREATE INDEX IF NOT EXISTS idx_presets_featured ON presets(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_cliparts_category ON cliparts(category);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

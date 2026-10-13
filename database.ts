import { customizeProduct, narxozLogos } from './customization';
import { supabase } from './supabase';
import type { Product, Preset, Clipart, OrderInsert } from '@/types';

// ──────────────── Products ────────────────

export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('base_price', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Product[]).map(customizeProduct);
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? customizeProduct(data as Product) : null;
}

// ──────────────── Presets ────────────────

export async function fetchFeaturedPresets(): Promise<Preset[]> {
  const { data, error } = await supabase
    .from('presets')
    .select('*, product:products(*)')
    .eq('is_featured', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Preset[];
}

export async function savePreset(
  productId: string,
  name: string,
  designConfig: unknown,
  thumbnailUrl: string,
): Promise<Preset> {
  const { data, error } = await supabase
    .from('presets')
    .insert({
      product_id: productId,
      name,
      design_config: designConfig,
      thumbnail_url: thumbnailUrl,
      is_featured: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Preset;
}

// ──────────────── Cliparts ────────────────

export async function fetchCliparts(): Promise<Clipart[]> {
  const { data, error } = await supabase
    .from('cliparts')
    .select('*')
    .order('category', { ascending: true });
  if (error) return narxozLogos;
  return [...narxozLogos, ...((data ?? []) as Clipart[])];
}

// ──────────────── Orders ────────────────

export async function createOrder(order: OrderInsert): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('orders')
    .insert(order)
    .select('id')
    .single();
  if (error) throw error;
  return { id: data.id };
}

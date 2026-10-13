// ──────────────────────────────────────────────
// Core domain types for the Merch Constructor app
// ──────────────────────────────────────────────

export type ProductType = 'hoodie' | 'tshirt' | 'sweatshirt' | 'cap';

export interface ProductColor {
  name: string;
  hex: string;
}

export interface CanvasArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Base merchandise item stored in the `products` table. */
export interface Product {
  id: string;
  name: string;
  product_type: ProductType;
  description: string;
  base_price: number;
  available_colors: ProductColor[];
  sizes: string[];
  mockup_front_svg: string;
  mockup_back_svg: string;
  canvas_area: CanvasArea;
  created_at: string;
}

export type LayerType = 'text' | 'image' | 'clipart';

export type DesignSide = 'front' | 'back';

/** A single design element placed on the canvas. */
export interface DesignLayer {
  id: string;
  type: LayerType;
  // text-specific
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  // image / clipart
  src?: string;
  // common
  fill?: string;
  left: number;
  top: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  flipX?: boolean;
  flipY?: boolean;
}

/** Full serializable state of the constructor canvas for one side. */
export interface DesignState {
  side: DesignSide;
  color: string;
  layers: DesignLayer[];
}

/** Complete design config (both sides) saved as JSON. */
export interface DesignConfig {
  front: DesignState;
  back: DesignState;
  productId: string;
  productName: string;
  productType: ProductType;
}

/** A preset from the `presets` table — a ready-made community design. */
export interface Preset {
  id: string;
  product_id: string;
  name: string;
  thumbnail_url: string;
  design_config: DesignConfig;
  is_featured: boolean;
  created_at: string;
}

/** A clipart icon from the `cliparts` table. */
export interface Clipart {
  id: string;
  name: string;
  category: string;
  image_url: string;
  thumbnail_url: string;
  created_at: string;
}

/** One item in the shopping cart. */
export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  productType: ProductType;
  basePrice: number;
  size: string;
  color: string;
  colorName: string;
  quantity: number;
  designConfig: DesignConfig;
  previewUrl: string;
  previewFront: string;
  previewBack: string;
  side: DesignSide;
}

/** An order placed by a customer, stored in the `orders` table. */
export interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  items: CartItem[];
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  created_at: string;
}

/** The shape of a row inserted into the `orders` table. */
export interface OrderInsert {
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: string;
  items: CartItem[] | Record<string, unknown>[];
  total_amount: number;
  status: 'pending';
}

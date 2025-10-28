export interface Kit {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  hasExtraBarrelSelector: boolean;
  price: number;
  pricePerExtraBarrel?: number;
  yieldInfo: string;
}

export interface Product {
  id: string;
  name: string;
  imageUrl: string;
  kits: Kit[];
  discountTiers?: { quantity: number; percentage: number }[];
  type?: 'individual' | 'combo';
  comboComponents?: string[];
}

export interface CartItem {
  product: Product;
  kit: Kit;
  quantity: number;
  timestamp: number;
}

export type Screen = 'home' | 'product' | 'cart' | 'confirmation' | 'combos';
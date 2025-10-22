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
  emoji: string;
  imageUrl: string;
  kits: Kit[];
  discountTiers?: { quantity: number; percentage: number }[];
}

export interface CartItem {
  product: Product;
  kit: Kit;
  quantity: number;
  timestamp: number;
}

export type Screen = 'home' | 'product' | 'cart' | 'confirmation';
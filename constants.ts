import { Product } from './types';

// Nueva interfaz para agrupar productos
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  products: Product[];
}

const BEBIDAS_INDIVIDUALES: Product[] = [
  {
    id: 'cerveza',
    name: 'Cerveza artesanal',
    imageUrl: 'https://i.imgur.com/rIaCQC9.jpeg',
    type: 'individual',
    discountTiers: [
        { quantity: 2, percentage: 5 },
        { quantity: 3, percentage: 10 },
        { quantity: 4, percentage: 15 },
    ],
    kits: [
      {
        id: 'kit-completo-cerveza',
        name: 'Kit completo',
        description: 'Barril, canilla y balde para hielo. ¡Incluye regalos!',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 12000,
        yieldInfo: 'Todo listo para servir. Ideal para 15-20 personas.',
      },
      {
        id: 'kit-extra-cerveza',
        name: 'Kit + barril de recambio',
        description: 'Llevate el kit base y sumá barriles de repuesto.',
        imageUrl: 'https://imgur.com/LfBOdL6.jpeg',
        hasExtraBarrelSelector: true,
        price: 12000,
        pricePerExtraBarrel: 7000,
        yieldInfo: 'Kit base + barriles extra (40 pintas c/u).',
      },
      {
        id: 'solo-barril-cerveza',
        name: 'Solo el barril (10L)',
        description: 'Un barril de 10L con nuestra mejor cerveza artesanal.',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 8500,
        yieldInfo: 'Rinde aprox. 20 pintas.',
      },
    ],
  },
  {
    id: 'fernet',
    name: 'Fernet con coca',
    imageUrl: 'https://i.imgur.com/LZqB5FT.jpeg',
    type: 'individual',
    discountTiers: [
        { quantity: 2, percentage: 5 },
        { quantity: 3, percentage: 10 },
    ],
    kits: [
      {
        id: 'kit-completo-fernet',
        name: 'Kit completo',
        description: 'Barril, canilla y balde para hielo. ¡Incluye regalos!',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 13000,
        yieldInfo: 'Todo listo para servir. Ideal para 20-25 personas.',
      },
      {
        id: 'kit-extra-fernet',
        name: 'Kit + barril de recambio',
        description: 'Llevate el kit base y sumá barriles de repuesto.',
        imageUrl: 'https://imgur.com/LfBOdL6.jpeg',
        hasExtraBarrelSelector: true,
        price: 13000,
        pricePerExtraBarrel: 7500,
        yieldInfo: 'Kit base + barriles extra (50 vasos c/u).',
      },
      {
        id: 'solo-barril-fernet',
        name: 'Solo el barril (10L)',
        description: 'Un barril de 10L del clásico Branca con Coca, listo para servir.',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 9000,
        yieldInfo: 'Rinde aprox. 25 vasos.',
      },
    ],
  },
  {
    id: 'gin-tonic',
    name: 'Gin tonic',
    imageUrl: 'https://i.imgur.com/oCl0lDc.jpeg',
    type: 'individual',
    discountTiers: [
        { quantity: 2, percentage: 5 },
        { quantity: 3, percentage: 10 },
        { quantity: 4, percentage: 15 },
    ],
    kits: [
       {
        id: 'kit-completo-gin',
        name: 'Kit completo',
        description: 'Barril, canilla y balde para hielo. ¡Incluye regalos!',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 15000,
        yieldInfo: 'Todo listo para servir. Ideal para 20-25 personas.',
      },
      {
        id: 'kit-extra-gin',
        name: 'Kit + barril de recambio',
        description: 'Llevate el kit base y sumá barriles de repuesto.',
        imageUrl: 'https://imgur.com/LfBOdL6.jpeg',
        hasExtraBarrelSelector: true,
        price: 15000,
        pricePerExtraBarrel: 9000,
        yieldInfo: 'Kit base + barriles extra (45 copas c/u).',
      },
      {
        id: 'solo-barril-gin',
        name: 'Solo el barril (10L)',
        description: 'Un barril de 10L de gin tonic Navegante, fresco y equilibrado.',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 11000,
        yieldInfo: 'Rinde aprox. 22 copas.',
      },
    ],
  },
];

const COMBOS: Product[] = [
  {
    id: 'ruta-19',
    name: 'Ruta 19 (Fernet+Cerveza)',
    imageUrl: 'https://i.imgur.com/ogS35Ej.jpeg',
    type: 'combo',
    comboComponents: ['fernet', 'cerveza'],
    discountTiers: [{ quantity: 1, percentage: 10 }],
    kits: [
      {
        id: 'kit-completo-ruta-19',
        name: 'Kit completo',
        description: '¡Precio promocional! Dos barriles (Fernet + Cerveza) con canilla y balde para hielo.',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 25000,
        yieldInfo: 'Rinde para +30 personas.',
      },
      {
        id: 'solo-barriles-ruta-19',
        name: 'Solo los barriles',
        description: '¡Precio promocional! Un barril de Fernet (10L) y uno de Cerveza Artesanal (10L).',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 17500,
        yieldInfo: 'Rinde para +30 personas.',
      },
    ],
  },
  {
    id: 'viento-sur',
    name: 'Viento Sur (Gin+Cerveza)',
    imageUrl: 'https://i.imgur.com/pfbrtm9.jpeg',
    type: 'combo',
    comboComponents: ['gin-tonic', 'cerveza'],
    discountTiers: [{ quantity: 1, percentage: 10 }],
    kits: [
       {
        id: 'kit-completo-viento-sur',
        name: 'Kit completo',
        description: '¡Precio promocional! Dos barriles (Gin + Cerveza) con canilla y balde para hielo.',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 27000,
        yieldInfo: 'Rinde para +30 personas.',
      },
      {
        id: 'solo-barriles-viento-sur',
        name: 'Solo los barriles',
        description: '¡Precio promocional! Un barril de Gin Tonic (10L) y uno de Cerveza Artesanal (10L).',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 19500,
        yieldInfo: 'Rinde para +30 personas.',
      },
    ],
  },
  {
    id: 'sunset-club',
    name: 'Sunset Club (Fernet+Gin)',
    imageUrl: 'https://i.imgur.com/H0hAX06.jpeg',
    type: 'combo',
    comboComponents: ['fernet', 'gin-tonic'],
    discountTiers: [{ quantity: 1, percentage: 10 }],
    kits: [
       {
        id: 'kit-completo-sunset-club',
        name: 'Kit completo',
        description: '¡Precio promocional! Dos barriles (Fernet + Gin) con canilla y balde para hielo.',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 28000,
        yieldInfo: 'Rinde para +30 personas.',
      },
       {
        id: 'solo-barriles-sunset-club',
        name: 'Solo los barriles',
        description: '¡Precio promocional! Un barril de Fernet (10L) y uno de Gin Tonic (10L).',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 20000,
        yieldInfo: 'Rinde para +30 personas.',
      },
    ],
  },
  {
    id: 'casa-tres',
    name: 'Casa Tres (Cerveza+Gin+Fernet)',
    imageUrl: 'https://i.imgur.com/axyDJuD.jpeg',
    type: 'combo',
    comboComponents: ['cerveza', 'gin-tonic', 'fernet'],
    discountTiers: [{ quantity: 1, percentage: 10 }],
    kits: [
      {
        id: 'kit-completo-casa-tres',
        name: 'Kit completo',
        description: '¡Precio promocional! Tres barriles (Cerveza, Gin, Fernet) con canilla y balde para hielo.',
        imageUrl: 'https://i.imgur.com/es8bYMh.png',
        hasExtraBarrelSelector: false,
        price: 40000,
        yieldInfo: 'Rinde para +50 personas.',
      },
      {
        id: 'solo-barriles-casa-tres',
        name: 'Solo los barriles',
        description: '¡Precio promocional! Un barril de cada una de nuestras bebidas (10L c/u).',
        imageUrl: 'https://imgur.com/x9N2mLT.jpeg',
        hasExtraBarrelSelector: false,
        price: 28500,
        yieldInfo: 'Rinde para +50 personas.',
      },
    ],
  },
];

export const PRODUCT_CATEGORIES: ProductCategory[] = [
    {
        id: 'individuales',
        name: 'Bebidas Individuales',
        description: 'Elegí tu bebida preferida y armá el pedido a tu medida.',
        products: BEBIDAS_INDIVIDUALES,
    },
    {
        id: 'combos',
        name: 'Combos y Promociones',
        description: 'Aprovechá nuestros combos con precios especiales para tu evento.',
        products: COMBOS,
    }
];
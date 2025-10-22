import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Product, Kit, CartItem, Screen } from './types';
import { PRODUCTS } from './constants';

const WHATSAPP_NUMBER = '5493425521278';

// --- Type Definitions ---
interface AutomaticDiscount {
  percentage: number;
  amount: number;
}
interface AutomaticDiscounts {
  [productId: string]: AutomaticDiscount;
}
type PriceData = Record<string, { barril: number; kitCompleto: number }>;
type GroupedCartProduct = { product: Product; items: CartItem[]; totalQuantity: number; subtotal: number };

// --- Helper Functions ---
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

const calculateItemTotal = (item: CartItem): number => {
  // FIX: Ensure properties from cart items (which may come from localStorage) are treated as numbers.
  const quantity = Number(item.quantity || 0);
  const price = Number(item.kit.price || 0);
  if (item.kit.hasExtraBarrelSelector && item.kit.pricePerExtraBarrel) {
    const extraBarrelPrice = Number(item.kit.pricePerExtraBarrel || 0);
    return price + (quantity - 1) * extraBarrelPrice;
  }
  return price * quantity;
};

const generateOrderMessage = (cart: CartItem[], discounts: AutomaticDiscounts): string => {
  if (cart.length === 0) return 'Mi pedido está vacío.';

  const header = '*¡Hola! Quisiera hacer el siguiente pedido:*\n\n';
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + calculateItemTotal(item), 0);
  let totalDiscountAmount = 0;

  const items = cart
    .map((item) => {
      let details = `${item.kit.name} de ${item.product.name}`;
      if (item.kit.hasExtraBarrelSelector) {
        const recambioCount = Number(item.quantity || 1) - 1;
        if (recambioCount > 0) {
           details += ` (con ${recambioCount} barril${recambioCount > 1 ? 'es' : ''} de recambio)`;
        }
      } else {
        details += ` (x${item.quantity})`;
      }
      return `• ${details} - ${formatCurrency(calculateItemTotal(item))}`;
    })
    .join('\n');
  
  let footer = `\n\n*Total estimado: ${formatCurrency(subtotal)}*\n\n¡Muchas gracias!`;

  if (Object.keys(discounts).length > 0) {
      totalDiscountAmount = Object.values(discounts).reduce((sum: number, d: AutomaticDiscount) => sum + d.amount, 0);
      const total = subtotal - totalDiscountAmount;
      footer = `\n\n*Subtotal:* ${formatCurrency(subtotal)}\n*Ahorro por cantidad:* -${formatCurrency(totalDiscountAmount)}\n\n*Total Final: ${formatCurrency(total)}*\n\n¡Muchas gracias!`;
  }

  return header + items + footer;
};

// --- UI Components ---

const SkeletonLoader: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`bg-slate-700 rounded-md shimmer ${className}`} />
);

const ProductCardSkeleton: React.FC = () => (
    <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg">
        <SkeletonLoader className="w-full aspect-square" />
        <div className="p-6">
            <SkeletonLoader className="h-8 w-3/4 mx-auto" />
        </div>
    </div>
);


const FlyingImage: React.FC<{
    config: { imgSrc: string; startRect: DOMRect };
    targetRef: React.RefObject<HTMLElement>;
    onAnimationEnd: () => void;
}> = ({ config, targetRef, onAnimationEnd }) => {
    const [styles, setStyles] = useState<React.CSSProperties>({
        position: 'fixed',
        left: config.startRect.left,
        top: config.startRect.top,
        width: config.startRect.width,
        height: config.startRect.height,
        transition: 'all 1s cubic-bezier(0.5, 0, 0.75, 0)',
        zIndex: 100,
        borderRadius: '0.5rem',
        objectFit: 'cover',
    });

    useEffect(() => {
        const targetRect = targetRef.current?.getBoundingClientRect();
        if (!targetRect) return;

        const timeoutId = setTimeout(() => {
            setStyles(prev => ({
                ...prev,
                left: targetRect.left + targetRect.width / 2,
                top: targetRect.top + targetRect.height / 2,
                width: 0,
                height: 0,
                opacity: 0.5,
                transform: 'rotate(180deg)',
            }));
        }, 10);

        const animationDuration = 1000;
        const endTimeoutId = setTimeout(onAnimationEnd, animationDuration);

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(endTimeoutId);
        };
    }, [targetRef, onAnimationEnd]);

    return <img src={config.imgSrc} alt="Animating item" style={styles} />;
};

const ProductCard: React.FC<{ product: Product, onSelect: (p: Product) => void }> = ({ product, onSelect }) => (
  <div
    onClick={() => onSelect(product)}
    className="bg-white rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer active:scale-100"
  >
    <div className="relative aspect-square">
      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
    </div>
    <h2 className="text-2xl font-bold text-slate-900 p-6 text-center">
      {product.name} <span className="text-3xl ml-2">{product.emoji}</span>
    </h2>
  </div>
);

const ProductSelector: React.FC<{ products: Product[], onSelectProduct: (product: Product) => void; }> = ({ products, onSelectProduct }) => {
  return (
    <div className="animate-fade-in">
      <div className="text-center pt-4 sm:pt-8 px-4 sm:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Todo comienza con una elección.</h1>
        <p className="text-lg sm:text-xl text-gray-300 mb-8">¿Cuál es la tuya?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 sm:px-0">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
        ))}
      </div>
    </div>
  );
};

const DiscountProgressBar: React.FC<{
    product: Product;
    currentQuantity: number;
}> = ({ product, currentQuantity }) => {
    if (!product.discountTiers || product.discountTiers.length === 0) return null;

    const tiers = [...product.discountTiers].sort((a, b) => a.quantity - b.quantity);
    const maxTier = tiers[tiers.length - 1];

    if (currentQuantity >= maxTier.quantity) {
        return (
            <div className="h-10 flex items-center justify-center mt-3">
                <p className="text-sm text-green-400 font-bold">¡Descuento máximo aplicado! 🎉</p>
            </div>
        );
    }
    
    // Find the next tier we are aiming for to display in the text
    const nextTier = tiers.find(t => currentQuantity < t.quantity);

    if (!nextTier) {
        // Fallback, should be caught by the maxTier check above
         return (
            <div className="h-10 flex items-center justify-center mt-3">
                <p className="text-sm text-green-400 font-bold">¡Descuento máximo aplicado! 🎉</p>
            </div>
        );
    }

    // The progress is calculated as a percentage of the way to the MAXIMUM tier.
    // This provides a consistent visual, as requested by the user.
    const progress = (currentQuantity / maxTier.quantity) * 100;
    
    const itemsNeeded = nextTier.quantity - currentQuantity;

    return (
        <div className="h-10 mt-3 text-center">
             <p className="text-xs text-gray-300 mb-1 font-semibold">
                ¡Agregá {itemsNeeded} más para un {nextTier.percentage}% de descuento!
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className="bg-brand-cyan h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
        </div>
    );
};


const ProductDetail: React.FC<{ 
    product: Product; 
    onAddToCart: (product: Product, kit: Kit, quantity: number, imageElement: HTMLImageElement) => void; 
    onBack: () => void;
    isLoadingPrices: boolean;
}> = ({ product, onAddToCart, onBack, isLoadingPrices }) => {
  const [quantities, setQuantities] = useState<{ [kitId: string]: number }>({});
  const [unlockedAnimation, setUnlockedAnimation] = useState<{ [kitId: string]: boolean }>({});
  const [activeKitId, setActiveKitId] = useState<string>(
    product.kits.find(k => k.name === 'Kit completo')?.id || product.kits[0].id
  );
  
  const handleQuantityChange = (kitId: string, delta: number) => {
    setQuantities(prev => {
      const kit = product.kits.find(k => k.id === kitId);
      if (!kit) return prev;

      const minQuantity = 1;
      const maxQuantity = 5;
      
      const current = Number(prev[kitId] ?? 1);
      const newValue = Math.max(minQuantity, Math.min(maxQuantity, current + delta));
      
      const oldTotalBarrels = current;
      const newTotalBarrels = newValue;

      const oldTier = product.discountTiers?.slice().reverse().find(t => oldTotalBarrels >= t.quantity);
      const newTier = product.discountTiers?.slice().reverse().find(t => newTotalBarrels >= t.quantity);
      
      if (newTier && (!oldTier || newTier.percentage > oldTier.percentage)) {
          setUnlockedAnimation(prevAnim => ({ ...prevAnim, [kitId]: true }));
          setTimeout(() => {
              setUnlockedAnimation(prevAnim => {
                  const nextAnim = { ...prevAnim };
                  delete nextAnim[kitId];
                  return nextAnim;
              });
          }, 1500);
      }
      return { ...prev, [kitId]: newValue };
    });
  };

  return (
    <div className="p-4 sm:p-8 animate-fade-in">
      <button onClick={onBack} className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors duration-300 mb-6 inline-block transform active:scale-90">
        &larr; Volver
      </button>
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-8">
        {product.name} <span className="text-4xl">{product.emoji}</span>
      </h1>

      <div className="flex justify-center mb-6 border-b-2 border-slate-700 max-w-lg mx-auto">
        {product.kits.map(kit => (
          <button 
            key={kit.id}
            onClick={() => setActiveKitId(kit.id)}
            className={`flex-1 px-2 py-3 text-xs sm:text-base font-bold transition-all duration-300 border-b-4 ${activeKitId === kit.id ? 'border-brand-cyan text-white' : 'border-transparent text-gray-400 hover:text-white'}`}
          >
            {kit.name.replace(' (10L)', '')}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {product.kits.map((kit) => {
          if (kit.id !== activeKitId) return null;

          const isMostPopular = kit.name === 'Kit completo';
          const isExtraBarrelKit = kit.hasExtraBarrelSelector && kit.pricePerExtraBarrel;
          const quantity = Number(quantities[kit.id] ?? 1);
          
          const totalBarrels = quantity;
          const dynamicPrice = isExtraBarrelKit ? Number(kit.price) + ((quantity - 1) * Number(kit.pricePerExtraBarrel || 0)) : Number(kit.price) * quantity;

          const applicableTier = product.discountTiers?.slice().reverse().find(tier => totalBarrels >= tier.quantity);
          const discountedPrice = applicableTier ? dynamicPrice * (1 - applicableTier.percentage / 100) : dynamicPrice;
          
          return (
            <div key={kit.id} className="max-w-md mx-auto lg:max-w-4xl animate-fade-in">
              <div 
                className={`bg-slate-800 rounded-lg p-6 flex flex-col lg:flex-row lg:gap-8 shadow-lg relative ${isMostPopular ? 'border-2 border-brand-cyan' : 'border-2 border-transparent'}`}
              >
                {isMostPopular && !isExtraBarrelKit && (
                  <div className="absolute top-0 right-0 bg-brand-cyan text-slate-900 text-xs sm:text-sm font-bold px-3 py-1 rounded-bl-lg rounded-tr-md">
                    MÁS POPULAR
                  </div>
                )}
                
                {/* --- Left Column: Image --- */}
                <div className="lg:w-2/5 flex-shrink-0">
                    <img id={`kit-img-${kit.id}`} src={kit.imageUrl} alt={kit.name} className="w-full aspect-square lg:aspect-auto lg:h-full object-cover rounded-md" />
                </div>
                
                {/* --- Right Column: Details & Actions --- */}
                <div className="lg:w-3/5 flex flex-col justify-between">
                    {/* Top Section: Name & Description */}
                    <div>
                        <h2 className="text-2xl font-bold text-white mt-4 lg:mt-0">
                            {kit.name}
                        </h2>
                        <p className="text-gray-300 mt-2">
                            {kit.description}
                        </p>
                    </div>

                    {/* Bottom Section: Controls */}
                    <div className="mt-4 lg:mt-0">
                        <div className="flex justify-between items-center mt-4">
                            {isLoadingPrices ? (
                                <div className="flex flex-col justify-center h-[64px]">
                                    <SkeletonLoader className="h-8 w-32 mb-1" />
                                </div>
                            ) : (
                                <div className="text-left h-[64px] flex flex-col justify-center">
                                    {applicableTier ? (
                                        <>
                                            <p className="text-xl text-gray-400 line-through">{formatCurrency(dynamicPrice)}</p>
                                            <p className="text-3xl font-bold text-white -mt-1">{formatCurrency(discountedPrice)}</p>
                                        </>
                                    ) : (
                                        <p className="text-3xl font-bold text-white flex items-center h-full">{formatCurrency(dynamicPrice)}</p>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center gap-1">
                                <button onClick={() => handleQuantityChange(kit.id, -1)} disabled={quantity <= 1} className="bg-slate-700 text-white rounded-full w-8 h-8 text-xl font-bold hover:bg-slate-600 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50">-</button>
                                <span className="text-white text-xl font-bold w-10 text-center">{quantity}</span>
                                <button onClick={() => handleQuantityChange(kit.id, 1)} disabled={quantity >= 5} className="bg-slate-700 text-white rounded-full w-8 h-8 text-xl font-bold hover:bg-slate-600 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50">+</button>
                            </div>
                        </div>

                        <DiscountProgressBar product={product} currentQuantity={totalBarrels} />
                        
                        {applicableTier && (
                            <div className={`text-center font-bold text-green-400 my-3 text-lg ${unlockedAnimation[kit.id] ? 'animate-pop' : ''}`}>
                                ¡Estás ahorrando un {applicableTier.percentage}%!
                            </div>
                        )}

                        <button
                            onClick={() => {
                                const imageElement = document.getElementById(`kit-img-${kit.id}`) as HTMLImageElement;
                                if (imageElement && quantity > 0) {
                                    onAddToCart(product, kit, quantity, imageElement);
                                }
                            }}
                            className="mt-2 w-full bg-brand-cyan text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-brand-light-blue transition-all duration-300 text-lg disabled:bg-slate-600 disabled:cursor-not-allowed transform active:scale-90"
                        >
                            Agregar al pedido
                        </button>
                    </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const OrderActions: React.FC<{ orderMessage: string, onAction?: () => void }> = ({ orderMessage, onAction }) => {
    const [copyStatus, setCopyStatus] = useState('');
    const encodedOrderMessage = useMemo(() => encodeURIComponent(orderMessage), [orderMessage]);

    const handleAction = (action: () => void | Promise<void>) => {
        action();
        if (onAction) onAction();
    };

    const handleWhatsApp = () => handleAction(() => { window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedOrderMessage}`, '_blank'); });
    const handleCopy = async () => handleAction(async () => {
        try { 
            await navigator.clipboard.writeText(orderMessage); 
            setCopyStatus('¡Copiado!');
            setTimeout(() => setCopyStatus(''), 2000);
        } catch (err) { 
            setCopyStatus('Error al copiar');
            setTimeout(() => setCopyStatus(''), 2000);
        }
    });
    const handleShare = async () => handleAction(async () => {
        if (navigator.share) {
            try { await navigator.share({ title: 'Mi Pedido de BarrilesYA!', text: orderMessage }); } 
            catch (error) { console.error('Error sharing:', error); }
        } else {
            handleCopy();
        }
    });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={handleWhatsApp} className="bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-300 text-lg">Enviar por WhatsApp</button>
            <button onClick={handleCopy} className="bg-brand-light-blue text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-300 text-lg relative">{copyStatus || 'Copiar Pedido'}</button>
            <button onClick={handleShare} className="bg-brand-cyan text-slate-900 font-bold py-3 px-4 rounded-lg hover:bg-cyan-600 transition-colors duration-300 text-lg">Compartir</button>
        </div>
    );
};


const Cart: React.FC<{ 
    cart: CartItem[];
    discounts: AutomaticDiscounts;
    onBack: () => void; 
    onBackToProduct: () => void; 
    onReset: () => void; 
    onRemoveItem: (timestamp: number) => void; 
    onUpdateQuantity: (timestamp: number, newQuantity: number) => void; 
    onOrderPlaced: () => void; 
}> = ({ cart, discounts, onBack, onBackToProduct, onReset, onRemoveItem, onUpdateQuantity, onOrderPlaced }) => {
  
  const orderMessage = useMemo(() => generateOrderMessage(cart, discounts), [cart, discounts]);
  const encodedOrderMessage = useMemo(() => encodeURIComponent(orderMessage), [orderMessage]);

  const handleWhatsAppClick = () => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedOrderMessage}`, '_blank');
    onOrderPlaced();
  };

  const groupedCart = useMemo(() => {
    return cart.reduce((acc: Record<string, GroupedCartProduct>, item: CartItem) => {
      const productId = item.product.id;
      if (!acc[productId]) {
        acc[productId] = { product: item.product, items: [], totalQuantity: 0, subtotal: 0 };
      }
      acc[productId].items.push(item);
      acc[productId].totalQuantity += Number(item.quantity || 0);
      acc[productId].subtotal += calculateItemTotal(item);
      return acc;
    }, {} as Record<string, GroupedCartProduct>);
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="text-center p-8 flex flex-col items-center justify-center h-full animate-fade-in">
        <h1 className="text-3xl font-bold text-white mb-4">Tu pedido está vacío</h1>
        <p className="text-gray-300 mb-8">Agregá alguna bebida para empezar.</p>
        <button onClick={onBack} className="bg-brand-cyan text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-brand-light-blue transition-colors duration-300 text-lg transform active:scale-90">
          Elegir Bebida
        </button>
      </div>
    );
  }

  // FIX: Explicitly type reduce callback arguments to prevent 'unknown' type errors from Object.values().
  const subtotal = Object.keys(groupedCart).reduce((sum: number, productId: string) => sum + groupedCart[productId].subtotal, 0);
  const totalDiscount = Object.keys(discounts).reduce((sum: number, productId: string) => sum + discounts[productId].amount, 0);
  const total = subtotal - totalDiscount;

  return (
    <div className="p-4 sm:p-8 animate-fade-in max-w-4xl mx-auto">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6">Tu Pedido</h1>
      <div className="bg-slate-800 rounded-lg p-6 mb-8 shadow-lg">
        <div className="space-y-6">
          {/* FIX: Use Object.keys().map for better type safety with index signatures. */}
          {Object.keys(groupedCart).map((productId: string) => {
            const group = groupedCart[productId];
            const discount = discounts[productId];
            return (
              <div key={productId} className="border-b border-slate-700 last:border-b-0 pb-6 last:pb-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold text-white">{group.product.name} {group.product.emoji}</h2>
                </div>
                
                <ul className="space-y-4 text-white">
                  {group.items.map(item => (
                    <li key={item.timestamp} className="flex flex-col sm:flex-row sm:items-center">
                      <div className="flex-grow">
                        <span>{item.kit.name}</span>
                        <p className="text-brand-cyan font-bold mt-1 sm:mt-0 sm:ml-2 sm:inline-block">{formatCurrency(calculateItemTotal(item))}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-3 sm:mt-0">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => onUpdateQuantity(item.timestamp, Math.max(1, Number(item.quantity || 1) - 1))} 
                            disabled={Number(item.quantity) <= 1}
                            className="bg-slate-700 text-white rounded-full w-8 h-8 text-xl font-bold hover:bg-slate-600 transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >-</button>
                          <span className="text-white text-xl font-bold w-8 text-center">{item.quantity}</span>
                          <button 
                            onClick={() => onUpdateQuantity(item.timestamp, Math.min(5, Number(item.quantity || 0) + 1))} 
                            disabled={Number(item.quantity) >= 5}
                            className="bg-slate-700 text-white rounded-full w-8 h-8 text-xl font-bold hover:bg-slate-600 transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          >+</button>
                        </div>
                        <button onClick={() => onRemoveItem(item.timestamp)} className="text-red-400 hover:text-red-500 text-3xl font-light">&times;</button>
                      </div>
                    </li>
                  ))}
                </ul>
                {discount && (
                    <p className="text-green-400 text-right mt-2 font-medium">
                        ¡Excelente! Estás ahorrando {formatCurrency(discount.amount)} en {group.product.name}.
                    </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-6 border-t border-slate-700 text-right text-xl text-white space-y-2">
            <p>Subtotal: <span>{formatCurrency(subtotal)}</span></p>
            {totalDiscount > 0 && <p className="text-green-400">Ahorro por cantidad: <span>-{formatCurrency(totalDiscount)}</span></p>}
            <p className="text-2xl font-bold">Total: <span className="text-brand-cyan">{formatCurrency(total)}</span></p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <button
          onClick={handleWhatsAppClick}
          className="w-full bg-green-500 text-white font-bold py-4 px-6 rounded-lg hover:bg-green-600 transition-colors duration-300 text-xl shadow-lg transform active:scale-90 flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01s-.521.074-.792.372c-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span>Enviar por WhatsApp</span>
        </button>
        <button
          onClick={onBack}
          className="w-full bg-slate-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-slate-600 transition-colors duration-300 text-lg transform active:scale-90"
        >
          + Agregar otra bebida
        </button>
      </div>

      <div className="text-center mt-8 flex justify-center items-center gap-4 sm:gap-6">
        <button onClick={onBackToProduct} className="text-brand-cyan hover:text-cyan-300 font-bold py-2 px-4 transition-transform active:scale-90">
          &larr; Volver al último producto
        </button>
        <button onClick={onReset} className="text-red-400 hover:text-red-500 font-bold py-2 px-4 transition-transform active:scale-90">
          Vaciar pedido y empezar de nuevo
        </button>
      </div>
    </div>
  );
};

const ConfirmationScreen: React.FC<{ onReset: () => void; lastOrder: { items: CartItem[]; discounts: AutomaticDiscounts } }> = ({ onReset, lastOrder }) => {
    const subtotal = lastOrder.items.reduce((sum: number, item: CartItem) => sum + calculateItemTotal(item), 0);
    // FIX: Explicitly type the `discount` parameter in reduce to fix type inference issues with Object.values.
    const totalDiscountAmount = Object.keys(lastOrder.discounts).reduce((sum: number, discountKey: string) => sum + lastOrder.discounts[discountKey].amount, 0);
    const total = subtotal - totalDiscountAmount;
    const orderMessage = useMemo(() => generateOrderMessage(lastOrder.items, lastOrder.discounts), [lastOrder]);

    return (
        <div className="text-center p-8 flex flex-col items-center justify-center h-full animate-fade-in max-w-2xl mx-auto">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-3xl font-bold text-white mb-4">¡Pedido generado con éxito!</h1>
            <p className="text-gray-300 mb-8 text-lg">Gracias por tu pedido. Nos pondremos en contacto a la brevedad para coordinar la entrega.</p>

            {lastOrder.items.length > 0 && (
                <div className="bg-slate-800 rounded-lg p-6 my-8 w-full text-left shadow-lg">
                    <h2 className="text-xl font-bold text-white mb-4 border-b border-slate-700 pb-2">Resumen de tu pedido</h2>
                    <ul className="space-y-2 text-gray-300">
                        {lastOrder.items.map(item => (
                             <li key={item.timestamp} className="flex justify-between items-center">
                                <span className="flex-grow pr-4">{item.product.emoji} {item.kit.name} de {item.product.name} (x{item.quantity})</span>
                                <span className="font-semibold">{formatCurrency(calculateItemTotal(item))}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-slate-700 text-right space-y-1">
                        <p>Subtotal: <span>{formatCurrency(subtotal)}</span></p>
                        {totalDiscountAmount > 0 && <p className="text-green-400">Ahorro por cantidad: <span>-{formatCurrency(totalDiscountAmount)}</span></p>}
                        <p className="text-xl font-bold text-white">Total: <span className="text-brand-cyan">{formatCurrency(total)}</span></p>
                    </div>
                </div>
            )}
            
            <div className="mt-4 pt-6 border-t border-slate-700 w-full">
                <p className="text-gray-400 mb-4">¿Necesitás reenviar el pedido?</p>
                <OrderActions orderMessage={orderMessage} />
            </div>

            <button onClick={onReset} className="bg-brand-cyan text-slate-900 font-bold py-3 px-6 rounded-lg hover:bg-brand-light-blue transition-colors duration-300 text-lg mt-8 transform active:scale-90">
                Hacer un nuevo pedido
            </button>
        </div>
    );
};

const MiniCart: React.FC<{ 
    cart: CartItem[], 
    discounts: AutomaticDiscounts,
    isExpanded: boolean,
    setIsExpanded: (expanded: boolean) => void,
    onGoToCart: () => void,
    onRemoveItem: (timestamp: number) => void,
    onUpdateQuantity: (timestamp: number, newQuantity: number) => void
}> = ({ cart, discounts, isExpanded, setIsExpanded, onGoToCart, onRemoveItem, onUpdateQuantity }) => {
    if (cart.length === 0) return null;

    // This state ensures the component is not removed from the DOM until the exit animation completes.
    const [renderExpandedPanel, setRenderExpandedPanel] = useState(isExpanded);

    useEffect(() => {
        if (isExpanded) {
            setRenderExpandedPanel(true);
        } else {
            // After the transition duration, set display: none by un-rendering the component.
            const timer = setTimeout(() => {
                setRenderExpandedPanel(false);
            }, 300); // Must match Tailwind's duration-300
            return () => clearTimeout(timer);
        }
    }, [isExpanded]);


    const subtotal = cart.reduce((sum: number, item) => sum + calculateItemTotal(item), 0);
    // FIX: Explicitly type `d` as `AutomaticDiscount` to resolve type error.
    const totalDiscount = Object.keys(discounts).reduce((sum: number, productId: string) => sum + discounts[productId].amount, 0);
    const total = subtotal - totalDiscount;
    const itemCount = cart.length;

    const toggleExpand = () => setIsExpanded(!isExpanded);

    return (
        <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-40 w-full max-w-xs sm:max-w-sm">
            {/* Expanded Panel - Conditionally rendered for robust hiding */}
            {renderExpandedPanel && (
              <div className={`
                  bg-slate-800 text-white rounded-lg shadow-2xl p-4 overflow-hidden
                  transition-all duration-300 ease-in-out
                  ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
              `}>
                  <div onClick={toggleExpand} className="flex justify-between items-center cursor-pointer pb-3 border-b border-slate-700">
                      <h3 className="font-bold text-lg">Tu Pedido ({itemCount})</h3>
                      <span className="transform transition-transform duration-300" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </div>
                  <div className="mt-4 space-y-3 max-h-48 overflow-y-auto pr-2">
                      {cart.map(item => (
                          <div key={item.timestamp} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm">
                             <div>
                                <p className="font-semibold truncate">{item.kit.name}</p>
                                <p className="text-brand-cyan">{formatCurrency(calculateItemTotal(item))}</p>
                             </div>
                             <div className="flex items-center gap-1 bg-slate-700 rounded-full">
                                <button 
                                  onClick={() => onUpdateQuantity(item.timestamp, Math.max(1, Number(item.quantity) - 1))}
                                  disabled={Number(item.quantity) <= 1}
                                  className="text-white rounded-full w-6 h-6 text-lg font-bold hover:bg-slate-600 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
                                >-</button>
                                <span className="text-white font-bold w-5 text-center">{item.quantity}</span>
                                <button 
                                  onClick={() => onUpdateQuantity(item.timestamp, Math.min(5, Number(item.quantity) + 1))}
                                  disabled={Number(item.quantity) >= 5}
                                  className="text-white rounded-full w-6 h-6 text-lg font-bold hover:bg-slate-600 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
                                >+</button>
                             </div>
                             <button onClick={() => onRemoveItem(item.timestamp)} className="text-red-400 hover:text-red-500 text-2xl font-light leading-none p-1 transition-transform active:scale-90 flex items-center justify-center">&times;</button>
                          </div>
                      ))}
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-700 flex justify-between items-center">
                      <span className="font-bold text-lg">Total Final:</span>
                      <span className="font-bold text-xl text-brand-cyan">{formatCurrency(total)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <button onClick={toggleExpand} className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors">Seguir pidiendo</button>
                      <button onClick={onGoToCart} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-3 rounded-lg text-sm transition-colors">Finalizar compra</button>
                  </div>
              </div>
            )}

            {/* Collapsed Button */}
            <div onClick={toggleExpand} className={`
                bg-green-600 text-white rounded-lg shadow-2xl p-4 cursor-pointer mt-4
                transform transition-all duration-300 ease-in-out
                ${isExpanded ? 'opacity-0 translate-y-4 pointer-events-none invisible' : 'opacity-100 translate-y-0 visible hover:scale-105'}
            `}>
                <p className="text-lg text-center font-semibold">Tu pedido está listo 🛒 → Tocá para finalizar</p>
            </div>
        </div>
    );
};


// --- Main App Component ---

function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
        const savedCart = window.localStorage.getItem('barrilesYaCart');
        if (savedCart) {
            const parsedCart = JSON.parse(savedCart);
            if (Array.isArray(parsedCart)) {
                // FIX: Add type assertion to ensure the cart state is correctly typed as CartItem[]
                // This resolves a cascading type issue where `item.quantity` was inferred as `unknown`.
                return parsedCart.map((item: any) => ({
                    ...item,
                    quantity: Number(item.quantity || 0)
                }));
            }
        }
        return [];
    } catch (error) {
        console.error("Could not parse cart from localStorage", error);
        return [];
    }
  });
  
  const [automaticDiscounts, setAutomaticDiscounts] = useState<AutomaticDiscounts>({});
  const [lastOrderInfo, setLastOrderInfo] = useState<{ items: CartItem[], discounts: AutomaticDiscounts }>({ items: [], discounts: {} });
  const [liveProducts, setLiveProducts] = useState<Product[]>(PRODUCTS);
  const [priceLastUpdated, setPriceLastUpdated] = useState<string>('');
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(true);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isMiniCartExpanded, setIsMiniCartExpanded] = useState(false);
  const [isCartShaking, setIsCartShaking] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const cartIconRef = useRef<HTMLDivElement>(null);
  const [animationConfig, setAnimationConfig] = useState<{
      active: boolean;
      imgSrc: string | null;
      startRect: DOMRect | null;
  }>({ active: false, imgSrc: null, startRect: null });


  useEffect(() => {
    const PRICE_CACHE_KEY = 'barrilesYaPrices';
    const PRICE_TIMESTAMP_KEY = 'barrilesYaPriceTimestamp';
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzBXKoYgw1cRrhr4VTIQLEfQ30NrCGlmDIgacvLoUYN_eTnnZ7qMvdxVMNhqHIrg6cwchewxYUesv_/pub?gid=0&single=true&output=csv';

    const updateProductsWithPrices = (prices: PriceData) => {
        const updatedProducts = PRODUCTS.map(product => {
            const productPrices = prices[product.id];
            if (productPrices) {
                const newKits = product.kits.map(kit => {
                    if (kit.id.includes('solo-barril')) {
                        return { ...kit, price: productPrices.barril };
                    }
                    if (kit.id.includes('kit-completo')) {
                        return { ...kit, price: productPrices.kitCompleto };
                    }
                    if (kit.id.includes('kit-extra')) {
                        return { ...kit, price: productPrices.kitCompleto, pricePerExtraBarrel: productPrices.barril };
                    }
                    return kit;
                });
                return { ...product, kits: newKits };
            }
            return product;
        });
        setLiveProducts(updatedProducts);
    };

    const fetchPrices = async () => {
        try {
            const cachedPricesRaw = localStorage.getItem(PRICE_CACHE_KEY);
            const cachedTimestamp = localStorage.getItem(PRICE_TIMESTAMP_KEY);
            if (cachedPricesRaw) {
                updateProductsWithPrices(JSON.parse(cachedPricesRaw));
                if (cachedTimestamp) {
                    setPriceLastUpdated(cachedTimestamp);
                }
            }
        } catch (e) { console.error("Failed to load cached prices", e); }

        try {
            const response = await fetch(GOOGLE_SHEET_URL);
            if (!response.ok) throw new Error('Network response was not ok');
            const csvText = await response.text();
            
            const lines = csvText.trim().split('\n');
            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

            const productIndex = headers.findIndex(h => h.includes('producto'));
            const barrilPriceIndex = headers.findIndex(h => h.includes('precio barril (ars)'));
            const kitCompletoPriceIndex = headers.findIndex(h => h.includes('precio kit completo (ars)'));

            if (productIndex === -1 || barrilPriceIndex === -1 || kitCompletoPriceIndex === -1) {
                throw new Error('Could not find required columns in CSV (Producto, Precio barril (ARS), Precio kit completo (ARS))');
            }
            
            const newPrices: PriceData = {};
            for (let i = 1; i < lines.length; i++) {
                const cells = lines[i].split(',');
                const productName = cells[productIndex]?.trim().toLowerCase();
                const barrilPriceString = cells[barrilPriceIndex]?.trim();
                const kitCompletoPriceString = cells[kitCompletoPriceIndex]?.trim();

                if (productName && barrilPriceString && kitCompletoPriceString) {
                    const barrilPrice = parseInt(barrilPriceString.replace(/\D/g, ''), 10);
                    const kitCompletoPrice = parseInt(kitCompletoPriceString.replace(/\D/g, ''), 10);
                    
                    if (!isNaN(barrilPrice) && !isNaN(kitCompletoPrice)) {
                        let productId = '';
                        if (productName.includes('cerveza')) productId = 'cerveza';
                        else if (productName.includes('fernet')) productId = 'fernet';
                        else if (productName.includes('gin')) productId = 'gin-tonic';
                        
                        if (productId) {
                           newPrices[productId] = { barril: barrilPrice, kitCompleto: kitCompletoPrice };
                        }
                    }
                }
            }
            
            if (Object.keys(newPrices).length > 0) {
                updateProductsWithPrices(newPrices);
                const timestamp = new Date().toLocaleString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                localStorage.setItem(PRICE_CACHE_KEY, JSON.stringify(newPrices));
                localStorage.setItem(PRICE_TIMESTAMP_KEY, timestamp);
                setPriceLastUpdated(timestamp);
            }
        } catch (error) {
            console.error("Failed to fetch prices from CSV, using cached/default values:", error);
        } finally {
            setIsLoadingPrices(false);
            setIsInitialLoad(false);
        }
    };

    fetchPrices();
  }, []);


  useEffect(() => {
    window.localStorage.setItem('barrilesYaCart', JSON.stringify(cart));

    const newDiscounts: AutomaticDiscounts = {};
    type GroupedProduct = { product: Product, totalQuantity: number, subtotal: number };
    const groupedByProduct = cart.reduce((acc: Record<string, GroupedProduct>, item: CartItem) => {
        const pid = item.product.id;
        if (!acc[pid]) {
          acc[pid] = { product: item.product, totalQuantity: 0, subtotal: 0 };
        }
        acc[pid].totalQuantity += Number(item.quantity || 0);
        acc[pid].subtotal += calculateItemTotal(item);
        return acc;
    }, {} as Record<string, GroupedProduct>);

    for (const productId in groupedByProduct) {
        const group = groupedByProduct[productId];
        const liveProduct = liveProducts.find(p => p.id === productId);
        const tiers = liveProduct?.discountTiers || [];
        
        const applicableTier = tiers
            .slice()
            .sort((a, b) => b.quantity - a.quantity)
            .find(tier => group.totalQuantity >= tier.quantity);

        if (applicableTier) {
            newDiscounts[productId] = {
                percentage: applicableTier.percentage,
                // FIX: Corrected typo from `applicable-tier.percentage` to `applicableTier.percentage`
                amount: (group.subtotal * applicableTier.percentage) / 100
            };
        }
    }
    setAutomaticDiscounts(newDiscounts);

  }, [cart, liveProducts]);


  const handleSelectProduct = useCallback((product: Product) => {
    setSelectedProduct(product);
    setScreen('product');
  }, []);
  
  const handleUpdateCartQuantity = useCallback((timestamp: number, newQuantity: number) => {
    setCart(prevCart => prevCart.map(item => 
        item.timestamp === timestamp ? { ...item, quantity: newQuantity } : item
    ));
  }, []);

  const handleAddToCart = useCallback((product: Product, kit: Kit, quantity: number, imageElement: HTMLImageElement) => {
    const startRect = imageElement.getBoundingClientRect();
    setAnimationConfig({ active: true, imgSrc: imageElement.src, startRect });
    
    setTimeout(() => {
      const existingItem = cart.find(item => item.product.id === product.id && item.kit.id === kit.id);

      if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          handleUpdateCartQuantity(existingItem.timestamp, newQuantity);
      } else {
          const newItem: CartItem = { product, kit, quantity, timestamp: Date.now() };
          setCart(prevCart => [...prevCart, newItem]);
      }
      setFeedbackMessage('¡Agregado al pedido!');
    }, 100);

    setTimeout(() => {
        setFeedbackMessage('');
    }, 2500);
  }, [cart, handleUpdateCartQuantity]);
  
  const handleRemoveFromCart = useCallback((timestamp: number) => {
    setCart(prevCart => prevCart.filter(item => item.timestamp !== timestamp));
  }, []);
  
  const handleOrderPlaced = useCallback(() => {
    setLastOrderInfo({ items: [...cart], discounts: automaticDiscounts });
    setCart([]);
    setScreen('confirmation');
  }, [cart, automaticDiscounts]);

  const goHome = useCallback(() => {
      setScreen('home');
      setSelectedProduct(null);
  }, []);
  
  const goToCart = useCallback(() => {
      setScreen('cart');
  }, []);

  const goBackToProduct = useCallback(() => {
      if (cart.length > 0) {
        const lastItem = cart[cart.length-1];
        const lastProductInCart = liveProducts.find(p => p.id === lastItem.product.id);
        setSelectedProduct(lastProductInCart || null);
        setScreen('product');
      } else {
        goHome();
      }
  }, [cart, goHome, liveProducts]);

  const resetOrder = useCallback(() => {
    setLastOrderInfo({ items: [], discounts: {} });
    setCart([]);
    setScreen('home');
    setSelectedProduct(null);
  }, []);

  const renderScreen = () => {
    switch (screen) {
      case 'product':
        return selectedProduct && <ProductDetail product={selectedProduct} onAddToCart={handleAddToCart} onBack={goHome} isLoadingPrices={isLoadingPrices} />;
      case 'cart':
        return <Cart cart={cart} discounts={automaticDiscounts} onBack={goHome} onBackToProduct={goBackToProduct} onReset={resetOrder} onRemoveItem={handleRemoveFromCart} onUpdateQuantity={handleUpdateCartQuantity} onOrderPlaced={handleOrderPlaced} />;
      case 'confirmation':
        return <ConfirmationScreen onReset={resetOrder} lastOrder={lastOrderInfo} />;
      case 'home':
      default:
        return <ProductSelector products={liveProducts} onSelectProduct={handleSelectProduct} />;
    }
  };

  const cartItemCount = cart.length;

  return (
    <div className="bg-brand-dark-blue min-h-screen font-sans text-white relative">
      {animationConfig.active && animationConfig.imgSrc && animationConfig.startRect && (
          <FlyingImage
              config={{ imgSrc: animationConfig.imgSrc, startRect: animationConfig.startRect }}
              targetRef={cartIconRef}
              onAnimationEnd={() => {
                  setAnimationConfig({ active: false, imgSrc: null, startRect: null });
                  setIsCartShaking(true);
                  setTimeout(() => setIsCartShaking(false), 820);
              }}
          />
      )}
      <header className="p-4 sm:p-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-wider cursor-pointer" onClick={resetOrder}>BarrilesYA!</h1>
        <div ref={cartIconRef} onClick={goToCart} className={`relative cursor-pointer p-2 ${isCartShaking ? 'animate-shake' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {cartItemCount > 0 && (
            <span className="absolute top-0 right-0 bg-brand-cyan text-slate-900 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
                {cartItemCount}
            </span>
            )}
        </div>
      </header>
      <main className="container mx-auto px-0 sm:px-4 pb-24 sm:pb-8">
          {isInitialLoad ? (
            <div className="animate-fade-in">
              <div className="text-center pt-4 sm:pt-8 px-4 sm:px-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Buscando las mejores promos...</h1>
                <p className="text-lg sm:text-xl text-gray-300 mb-8">Un momento, por favor.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 sm:px-0">
                <ProductCardSkeleton />
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </div>
            </div>
          ) : (
            renderScreen()
          )}
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm">
        <p>&copy; {new Date().getFullYear()} BarrilesYA!. Todos los derechos reservados.</p>
        {priceLastUpdated && <p className="text-gray-400 mt-1">Precios actualizados por última vez: {priceLastUpdated}</p>}
      </footer>
       {feedbackMessage && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-green-500 text-white py-3 px-6 rounded-lg shadow-lg animate-fade-in z-50">
              {feedbackMessage}
          </div>
      )}
      {(screen === 'home' || screen === 'product') && (
        <MiniCart 
            cart={cart} 
            discounts={automaticDiscounts} 
            isExpanded={isMiniCartExpanded}
            setIsExpanded={setIsMiniCartExpanded}
            onGoToCart={goToCart}
            onRemoveItem={handleRemoveFromCart}
            onUpdateQuantity={handleUpdateCartQuantity}
        />
      )}
    </div>
  );
}

export default App;
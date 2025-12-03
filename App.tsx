
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Product, Kit, CartItem, Screen } from './types';
import { PRODUCT_CATEGORIES, ProductCategory } from './constants';

const WHATSAPP_NUMBER = '5493425521278';

// --- Type Definitions ---
interface AutomaticDiscount {
  percentage: number;
  amount: number;
}
interface AutomaticDiscounts {
  [productId: string]: AutomaticDiscount;
}
type PriceData = Record<string, { barril?: number; kitCompleto: number }>;
type GroupedCartProduct = { product: Product; items: CartItem[]; totalQuantity: number; subtotal: number };

// --- Helper Functions ---
const formatCurrency = (amount: number) => 
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(amount);

const smartRoundToMarketingPrice = (price: number): number => {
    if (price <= 0) return 0;
    // Round up to the nearest thousand
    const upperThousand = Math.ceil(price / 1000) * 1000;
    // Subtract 10 to get the .990 ending
    return upperThousand - 10;
};

const calculateItemTotal = (item: CartItem): number => {
  const quantity = Number(item.quantity || 0);
  const price = Number(item.kit.price || 0);

  if (item.kit.hasExtraBarrelSelector && item.kit.pricePerExtraBarrel) {
    const extraBarrelPrice = Number(item.kit.pricePerExtraBarrel || 0);
    // For this kit, quantity = number of EXTRA barrels.
    // The total price is the base kit price plus the price of all extra barrels.
    return price + (quantity * extraBarrelPrice);
  }
  // For other kits, quantity = number of items.
  return price * quantity;
};

const getItemBarrelCount = (item: CartItem): number => {
    const quantity = Number(item.quantity || 0);
    if (item.kit.hasExtraBarrelSelector) {
        // 1 base barrel + N extra barrels
        return 1 + quantity;
    }
    // For other kits, 1 item = 1 barrel
    return quantity;
}


const generateOrderMessage = (cart: CartItem[], discounts: AutomaticDiscounts): string => {
  if (cart.length === 0) return 'Mi pedido está vacío.';

  const header = '*¡Hola! Quisiera hacer el siguiente pedido:*\n\n';
  const subtotal = cart.reduce((sum: number, item: CartItem) => sum + calculateItemTotal(item), 0);
  let totalDiscountAmount = 0;

  const items = cart
    .map((item) => {
      let details = `${item.kit.name} de ${item.product.name}`;
      if (item.product.type === 'combo') {
          // Combos have fixed quantity of 1, no need to show quantity
      } else if (item.kit.hasExtraBarrelSelector) {
        const recambioCount = Number(item.quantity || 1);
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
    <div className={`bg-gray-200 rounded-md shimmer ${className}`} />
);

const ProductCardSkeleton: React.FC = () => (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-lg">
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

const ProductCard: React.FC<{ product: Product, onSelect: (p: Product) => void }> = ({ product, onSelect }) => {
    const isCombo = product.type === 'combo';
    const comboNameMatch = isCombo ? product.name.match(/(.+?)\s\((.+)\)/) : null;

    return (
        <div
            onClick={() => onSelect(product)}
            className="bg-white rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer active:scale-100 flex flex-col border border-brand-secondary/50"
        >
            <div className="relative aspect-square">
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            </div>
            <div className="p-2 sm:p-3 text-center flex flex-col justify-center items-center flex-grow">
                {comboNameMatch ? (
                    <>
                        <h2 className="text-base sm:text-lg font-extrabold text-brand-dark-blue leading-tight">
                            {comboNameMatch[1]}
                        </h2>
                        <p className="text-xs sm:text-sm font-normal text-brand-dark-blue/70 mt-1 leading-tight">
                            {comboNameMatch[2].replace(/\+/g, ' + ')}
                        </p>
                    </>
                ) : (
                    <h2 className="text-base sm:text-lg font-extrabold text-brand-dark-blue">
                        {product.name}
                    </h2>
                )}
            </div>
        </div>
    );
};

const CategoryCard: React.FC<{ name: string, imageUrl: string, onClick: () => void }> = ({ name, imageUrl, onClick }) => (
    <div
        onClick={onClick}
        className="bg-white rounded-lg overflow-hidden shadow-lg transform hover:scale-105 transition-transform duration-300 cursor-pointer active:scale-100 flex flex-col border border-brand-secondary/50"
    >
        <div className="relative aspect-square">
            <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
        </div>
        <div className="p-2 sm:p-3 text-center flex flex-col justify-center items-center flex-grow">
            <h2 className="text-base sm:text-lg font-extrabold text-brand-dark-blue">
                {name}
            </h2>
        </div>
    </div>
);

const HomeScreen: React.FC<{
    categories: ProductCategory[],
    onSelectProduct: (product: Product) => void,
    onSelectCombos: () => void
}> = ({ categories, onSelectProduct, onSelectCombos }) => {
    const individualProducts = categories.find(c => c.id === 'individuales')?.products || [];
    const cerveza = individualProducts.find(p => p.id === 'cerveza');
    const fernet = individualProducts.find(p => p.id === 'fernet');
    const gin = individualProducts.find(p => p.id === 'gin-tonic');
    const homeProducts = [cerveza, fernet, gin].filter(Boolean) as Product[];

    return (
        <div className="animate-fade-in">
            <div className="text-center pt-4 sm:pt-8 px-4">
                <div className="inline-block bg-yellow-300 text-brand-dark-blue font-black px-4 py-1.5 rounded-full mb-4 shadow-sm text-sm sm:text-base border-2 border-brand-dark-blue transform -rotate-1 animate-pulse-subtle">
                    EDICIÓN FIESTAS - PRECIOS REDONDOS 🎉
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-brand-dark-blue mb-2">Elegí, combiná y disfrutá</h1>
                <p className="text-base sm:text-lg text-brand-dark-blue/80 mb-8">Armá tu pedido como más te guste. Nosotros nos ocupamos del resto.</p>
            </div>

            <div className="max-w-3xl lg:max-w-5xl mx-auto px-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {homeProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
                    ))}
                    <CategoryCard
                        name="¡Promociones!"
                        imageUrl="https://i.imgur.com/XdqBrW6.jpeg"
                        onClick={onSelectCombos}
                    />
                </div>
            </div>
        </div>
    );
};

const CombosScreen: React.FC<{
    categories: ProductCategory[],
    onSelectProduct: (product: Product) => void,
    onBack: () => void
}> = ({ categories, onSelectProduct, onBack }) => {
    const comboCategory = categories.find(c => c.id === 'combos');
    const comboProducts = comboCategory?.products || [];
  
    return (
        <div className="p-4 sm:p-8 animate-fade-in">
            <button onClick={onBack} className="bg-brand-light-blue text-brand-background font-bold py-2 px-4 rounded-lg hover:bg-brand-cyan hover:text-brand-dark-blue transition-colors duration-300 mb-6 inline-block transform active:scale-90">
                &larr; Volver
            </button>
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-black text-brand-dark-blue inline-block pb-2 border-b-4 border-brand-cyan">{comboCategory?.name || 'Combos'}</h1>
                <p className="text-lg text-brand-dark-blue/80 mt-2 max-w-2xl mx-auto">{comboCategory?.description || ''}</p>
            </div>
            <div className="max-w-4xl mx-auto px-4 sm:px-6">
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
                    {comboProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
                    ))}
                </div>
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
                <p className="text-sm text-green-500 font-bold">¡Descuento máximo aplicado! 🎉</p>
            </div>
        );
    }
    
    // Find the next tier we are aiming for to display in the text
    const nextTier = tiers.find(t => currentQuantity < t.quantity);

    if (!nextTier) {
        // Fallback, should be caught by the maxTier check above
         return (
            <div className="h-10 flex items-center justify-center mt-3">
                <p className="text-sm text-green-500 font-bold">¡Descuento máximo aplicado! 🎉</p>
            </div>
        );
    }

    // The progress is calculated as a percentage of the way to the MAXIMUM tier.
    // This provides a consistent visual, as requested by the user.
    const progress = (currentQuantity / maxTier.quantity) * 100;
    
    const itemsNeeded = nextTier.quantity - currentQuantity;

    return (
        <div className="h-10 mt-3 text-center">
             <p className="text-xs text-brand-dark-blue/80 mb-1 font-semibold">
                ¡Agregá {itemsNeeded} más para un {nextTier.percentage}% de descuento!
            </p>
            <div className="w-full bg-brand-secondary rounded-full h-2.5">
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
      
      const isExtraBarrelKit = kit.hasExtraBarrelSelector && kit.pricePerExtraBarrel;
      const oldTotalBarrels = isExtraBarrelKit ? 1 + current : current;
      const newTotalBarrels = isExtraBarrelKit ? 1 + newValue : newValue;

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

  const isCombo = product.type === 'combo';

  return (
    <div className="p-4 sm:p-8 animate-fade-in">
      <button onClick={onBack} className="bg-brand-light-blue text-brand-background font-bold py-2 px-4 rounded-lg hover:bg-brand-cyan hover:text-brand-dark-blue transition-colors duration-300 mb-6 inline-block transform active:scale-90">
        &larr; Volver
      </button>
      <h1 className="text-3xl sm:text-4xl font-black text-brand-dark-blue text-center mb-8">
        {product.name}
      </h1>

      <div className="flex justify-center mb-6 border-b-2 border-brand-secondary max-w-lg mx-auto">
        {product.kits.map(kit => (
          <button 
            key={kit.id}
            onClick={() => setActiveKitId(kit.id)}
            className={`flex-1 px-2 py-3 text-xs sm:text-base font-bold transition-all duration-300 border-b-4 ${activeKitId === kit.id ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-brand-dark-blue/60 hover:text-brand-dark-blue'}`}
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
          
          const quantity = isCombo ? 1 : Number(quantities[kit.id] ?? 1);
          
          let totalBarrels, dynamicPrice, recambioCount;

          if (isExtraBarrelKit) {
            // For this kit, 'quantity' is the number of EXTRA barrels.
            recambioCount = quantity;
            totalBarrels = 1 + recambioCount; // Base kit + extra barrels
            dynamicPrice = Number(kit.price) + (recambioCount * Number(kit.pricePerExtraBarrel || 0));
          } else {
            // For other kits, 'quantity' is the number of items.
            totalBarrels = quantity;
            recambioCount = 0;
            dynamicPrice = Number(kit.price) * quantity;
          }

          // For combos, the price is final. For individuals, we check tiers.
          const applicableTier = product.discountTiers?.slice().reverse().find(tier => totalBarrels >= tier.quantity);
          let finalPrice = applicableTier ? dynamicPrice * (1 - applicableTier.percentage / 100) : dynamicPrice;
          
          if (isCombo && applicableTier) {
            finalPrice = smartRoundToMarketingPrice(finalPrice);
          }

          return (
            <div key={kit.id} className="max-w-md mx-auto lg:max-w-4xl animate-fade-in">
              <div 
                className={`bg-white rounded-lg p-6 flex flex-col lg:flex-row lg:gap-8 shadow-xl relative ${isMostPopular && !isCombo ? 'border-2 border-brand-cyan' : 'border-2 border-brand-secondary/50'}`}
              >
                {isMostPopular && !isExtraBarrelKit && !isCombo && (
                  <div className="absolute top-0 right-0 bg-brand-cyan text-brand-dark-blue text-xs sm:text-sm font-bold px-3 py-1 rounded-bl-lg rounded-tr-md">
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
                        <h2 className="text-2xl font-extrabold text-brand-dark-blue mt-4 lg:mt-0">
                            {kit.name}
                        </h2>
                        <p className="text-brand-dark-blue/80 mt-2">
                           {isExtraBarrelKit 
                                ? <span className="font-semibold text-brand-cyan">El precio incluye el kit completo más {recambioCount} barril{recambioCount === 1 ? '' : 'es'} de recambio. Total de barriles: {totalBarrels}.</span>
                                : kit.description
                            }
                        </p>
                    </div>

                    {/* Bottom Section: Controls */}
                    <div className="mt-4 lg:mt-0">
                        <div className="flex justify-between items-center mt-4">
                            {isLoadingPrices ? (
                                <div className="flex flex-col justify-center h-[72px]">
                                    <SkeletonLoader className="h-10 w-36 mb-1" />
                                </div>
                            ) : (
                                <div className="text-left h-[72px] flex flex-col justify-center">
                                    {applicableTier ? (
                                        <>
                                            <p className="text-xl text-brand-dark-blue/50 line-through">{formatCurrency(dynamicPrice)}</p>
                                            <p className={`text-3xl font-bold ${isCombo ? 'text-green-500' : 'text-brand-dark-blue'}`}>{formatCurrency(finalPrice)}</p>
                                        </>
                                    ) : (
                                        <p className="text-3xl font-bold text-brand-dark-blue flex items-center h-full">{formatCurrency(finalPrice)}</p>
                                    )}
                                </div>
                            )}
                            { !isCombo && (
                              <div className="flex items-center gap-1">
                                  <button onClick={() => handleQuantityChange(kit.id, -1)} disabled={quantity <= 1} className="bg-brand-light-blue text-brand-background rounded-full w-6 h-6 text-base font-bold hover:bg-brand-cyan hover:text-brand-dark-blue flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50">-</button>
                                  <span className="text-brand-dark-blue text-base font-bold w-6 text-center">{quantity}</span>
                                  <button onClick={() => handleQuantityChange(kit.id, 1)} disabled={quantity >= 5} className="bg-brand-light-blue text-brand-background rounded-full w-6 h-6 text-base font-bold hover:bg-brand-cyan hover:text-brand-dark-blue flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50">+</button>
                              </div>
                            )}
                        </div>

                        { !isCombo && <DiscountProgressBar product={product} currentQuantity={totalBarrels} /> }
                        
                        {applicableTier && !isCombo && (
                            <div className={`text-center font-bold text-green-500 my-3 text-lg ${unlockedAnimation[kit.id] ? 'animate-pop' : ''}`}>
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
                            className="mt-2 w-full bg-brand-cyan text-brand-dark-blue font-bold py-3 px-4 rounded-lg hover:bg-brand-light-blue hover:text-brand-background transition-all duration-300 text-lg disabled:bg-brand-light-blue/20 disabled:text-brand-secondary disabled:cursor-not-allowed transform active:scale-90"
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
            <button onClick={handleWhatsApp} className="bg-green-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-600 transition-colors duration-300 text-base sm:text-lg">Enviar por WhatsApp</button>
            <button onClick={handleCopy} className="bg-brand-light-blue text-brand-background font-bold py-3 px-4 rounded-lg hover:bg-brand-cyan hover:text-brand-dark-blue transition-colors duration-300 text-base sm:text-lg relative">{copyStatus || 'Copiar Pedido'}</button>
            <button onClick={handleShare} className="bg-brand-cyan text-brand-dark-blue font-bold py-3 px-4 rounded-lg hover:bg-brand-light-blue hover:text-brand-background transition-colors duration-300 text-base sm:text-lg">Compartir</button>
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
      acc[productId].totalQuantity += getItemBarrelCount(item);
      acc[productId].subtotal += calculateItemTotal(item);
      return acc;
    }, {} as Record<string, GroupedCartProduct>);
  }, [cart]);

  if (cart.length === 0) {
    return (
      <div className="text-center p-8 flex flex-col items-center justify-center h-full animate-fade-in">
        <h1 className="text-3xl font-black text-brand-dark-blue mb-4">Tu pedido está vacío</h1>
        <p className="text-brand-dark-blue/80 mb-8">Agregá alguna bebida para empezar.</p>
        <button onClick={onBack} className="bg-brand-cyan text-brand-dark-blue font-bold py-3 px-6 rounded-lg hover:bg-brand-light-blue hover:text-brand-background transition-colors duration-300 text-lg transform active:scale-90">
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
      <h1 className="text-3xl sm:text-4xl font-black text-brand-dark-blue text-center mb-6">Tu Pedido</h1>
      <div className="bg-white rounded-lg p-6 mb-8 shadow-xl border border-brand-secondary/50">
        <div className="space-y-6">
          {/* FIX: Use Object.keys().map for better type safety with index signatures. */}
          {Object.keys(groupedCart).map((productId: string) => {
            const group = groupedCart[productId];
            const discount = discounts[productId];
            return (
              <div key={productId} className="border-b border-brand-secondary last:border-b-0 pb-6 last:pb-0">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-extrabold text-brand-dark-blue">{group.product.name}</h2>
                </div>
                
                <ul className="space-y-4 text-brand-dark-blue">
                  {group.items.map(item => {
                    const isCombo = item.product.type === 'combo';
                    return (
                      <li key={item.timestamp} className="flex flex-col sm:flex-row sm:items-center">
                        <div className="flex-grow">
                          <span>{item.kit.name}</span>
                          <p className="text-brand-cyan font-bold mt-1 sm:mt-0 sm:ml-2 sm:inline-block">{formatCurrency(calculateItemTotal(item))}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-3 sm:mt-0">
                          { !isCombo ? (
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => onUpdateQuantity(item.timestamp, Math.max(1, Number(item.quantity || 1) - 1))} 
                                disabled={Number(item.quantity) <= 1}
                                className="bg-brand-light-blue text-brand-background rounded-full w-8 h-8 text-xl font-bold hover:bg-brand-cyan hover:text-brand-dark-blue transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >-</button>
                              <span className="text-brand-dark-blue text-xl font-bold w-8 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => onUpdateQuantity(item.timestamp, Math.min(5, Number(item.quantity || 0) + 1))} 
                                disabled={Number(item.quantity) >= 5}
                                className="bg-brand-light-blue text-brand-background rounded-full w-8 h-8 text-xl font-bold hover:bg-brand-cyan hover:text-brand-dark-blue transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
                              >+</button>
                            </div>
                          ) : null }
                          <button onClick={() => onRemoveItem(item.timestamp)} className="text-red-400 hover:text-red-500 text-3xl font-light">&times;</button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {discount && (
                    <p className="text-green-500 text-right mt-2 font-medium">
                        ¡Excelente! Estás ahorrando {formatCurrency(discount.amount)} en {group.product.name}.
                    </p>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 pt-6 border-t border-brand-secondary text-right text-xl text-brand-dark-blue space-y-2">
            <p>Subtotal: <span>{formatCurrency(subtotal)}</span></p>
            {totalDiscount > 0 && <p className="text-green-500">Ahorro por cantidad: <span>-{formatCurrency(totalDiscount)}</span></p>}
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
          <span>Finalizar y enviar</span>
        </button>
        <button
          onClick={onBack}
          className="w-full bg-brand-light-blue text-brand-background font-bold py-3 px-6 rounded-lg hover:bg-brand-cyan hover:text-brand-dark-blue transition-colors duration-300 text-lg transform active:scale-90"
        >
          + Agregar otra bebida
        </button>
      </div>

      <div className="text-center mt-8 flex justify-center items-center gap-4 sm:gap-6">
        <button onClick={onBackToProduct} className="text-brand-cyan hover:text-brand-light-blue font-bold py-2 px-4 transition-transform active:scale-90">
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
        <div className="text-center p-4 sm:p-8 flex flex-col items-center animate-fade-in max-w-2xl mx-auto">
            <div className="text-5xl sm:text-6xl mb-4">🎉</div>
            <h1 className="text-2xl sm:text-3xl font-black text-brand-dark-blue mb-4">¡Pedido generado con éxito!</h1>
            <p className="text-brand-dark-blue/80 mb-8 text-base sm:text-lg">Gracias por tu pedido. Nos pondremos en contacto a la brevedad para coordinar la entrega.</p>

            {lastOrder.items.length > 0 && (
                <div className="bg-white rounded-lg p-6 my-8 w-full text-left shadow-xl border border-brand-secondary/50">
                    <h2 className="text-xl font-extrabold text-brand-dark-blue mb-4 border-b border-brand-secondary pb-2">Resumen de tu pedido</h2>
                    <ul className="space-y-2 text-brand-dark-blue/90">
                        {lastOrder.items.map(item => (
                             <li key={item.timestamp} className="flex justify-between items-center">
                                <span className="flex-grow pr-4">{item.kit.name} de {item.product.name} {item.product.type !== 'combo' ? `(x${item.quantity})` : ''}</span>
                                <span className="font-semibold">{formatCurrency(calculateItemTotal(item))}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="mt-4 pt-4 border-t border-brand-secondary text-right space-y-1">
                        <p className="text-brand-dark-blue">Subtotal: <span>{formatCurrency(subtotal)}</span></p>
                        {totalDiscountAmount > 0 && <p className="text-green-500">Ahorro por cantidad: <span>-{formatCurrency(totalDiscountAmount)}</span></p>}
                        <p className="text-xl font-bold text-brand-dark-blue">Total: <span className="text-brand-cyan">{formatCurrency(total)}</span></p>
                    </div>
                </div>
            )}
            
            <div className="mt-4 pt-6 border-t border-brand-secondary w-full">
                <p className="text-brand-dark-blue/80 mb-4">¿Necesitás reenviar el pedido?</p>
                <OrderActions orderMessage={orderMessage} />
            </div>

            <button onClick={onReset} className="bg-brand-cyan text-brand-dark-blue font-bold py-3 px-6 rounded-lg hover:bg-brand-light-blue hover:text-brand-background transition-colors duration-300 text-base sm:text-lg mt-8 transform active:scale-90">
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

    const subtotal = cart.reduce((sum: number, item) => sum + calculateItemTotal(item), 0);
    const totalDiscount = Object.keys(discounts).reduce((sum: number, productId: string) => sum + discounts[productId].amount, 0);
    const total = subtotal - totalDiscount;
    const itemCount = cart.length;

    return (
        <>
            {/* Expanded Panel */}
            <div className={`fixed bottom-0 left-0 right-0 bg-brand-background/90 backdrop-blur-md shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] rounded-t-2xl z-40 transition-transform duration-300 ease-in-out border-t border-brand-secondary ${isExpanded ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="p-4 border-b border-brand-secondary flex justify-between items-center">
                    <h3 className="font-extrabold text-xl text-brand-dark-blue">Tu Pedido ({itemCount})</h3>
                    <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full hover:bg-brand-secondary transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-dark-blue/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                </div>

                <div className="p-4 space-y-3 max-h-48 overflow-y-auto">
                    {cart.map(item => {
                        const isCombo = item.product.type === 'combo';
                        return (
                          <div key={item.timestamp} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center text-sm">
                             <div>
                                <p className="font-semibold truncate text-brand-dark-blue">{item.kit.name} de {item.product.name}</p>
                                <p className="text-brand-cyan font-bold">{formatCurrency(calculateItemTotal(item))}</p>
                             </div>
                             { !isCombo ? (
                               <div className="flex items-center gap-1 bg-brand-secondary rounded-full">
                                  <button 
                                    onClick={() => onUpdateQuantity(item.timestamp, Math.max(1, Number(item.quantity) - 1))}
                                    disabled={Number(item.quantity) <= 1}
                                    className="text-brand-dark-blue rounded-full w-6 h-6 text-lg font-bold hover:bg-brand-secondary/50 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
                                  >-</button>
                                  <span className="text-brand-dark-blue font-bold w-5 text-center">{item.quantity}</span>
                                  <button 
                                    onClick={() => onUpdateQuantity(item.timestamp, Math.min(5, Number(item.quantity) + 1))}
                                    disabled={Number(item.quantity) >= 5}
                                    className="text-brand-dark-blue rounded-full w-6 h-6 text-lg font-bold hover:bg-brand-secondary/50 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
                                  >+</button>
                               </div>
                             ) : <div /> }
                             <button onClick={() => onRemoveItem(item.timestamp)} className="text-red-400 hover:text-red-500 text-2xl font-light leading-none p-1 transition-transform active:scale-90 flex items-center justify-center">&times;</button>
                          </div>
                        )
                      })}
                </div>

                <div className="p-4 border-t border-brand-secondary bg-transparent">
                    <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-lg text-brand-dark-blue">Total Final:</span>
                        <span className="font-bold text-2xl text-brand-cyan">{formatCurrency(total)}</span>
                    </div>
                    <button onClick={onGoToCart} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-3 rounded-lg text-lg transition-colors transform active:scale-95">
                        Confirmar pedido
                    </button>
                </div>
            </div>

            {/* Collapsed Button */}
            <div
                onClick={() => setIsExpanded(true)}
                className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 cursor-pointer group transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}`}
            >
                <div
                    className="bg-brand-cyan text-brand-dark-blue rounded-xl shadow-2xl py-3 px-5 flex flex-col items-center justify-center gap-1 transform transition-transform duration-200 group-hover:scale-110 group-active:scale-100 animate-pulse-subtle"
                >
                    <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span className="font-bold text-lg">{formatCurrency(total)}</span>
                    </div>
                    <div className="text-xs font-bold text-center opacity-90">
                        Avanzar con el pedido &rarr;
                    </div>
                </div>
            </div>
        </>
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
  const [productCategories, setProductCategories] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);
  const allLiveProducts = useMemo(() => productCategories.flatMap(c => c.products), [productCategories]);
  const [priceLastUpdated, setPriceLastUpdated] = useState<string>('');
  const [isLoadingPrices, setIsLoadingPrices] = useState<boolean>(true);
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true);
  const [isMiniCartExpanded, setIsMiniCartExpanded] = useState(false);
  const [isCartShaking, setIsCartShaking] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
  const feedbackTimers = useRef<{ visibility: number | null, clear: number | null }>({ visibility: null, clear: null });
  const cartIconRef = useRef<HTMLDivElement>(null);
  const [animationConfig, setAnimationConfig] = useState<{
      active: boolean;
      imgSrc: string | null;
      startRect: DOMRect | null;
  }>({ active: false, imgSrc: null, startRect: null });

  // --- History Navigation Logic ---
  const navigate = useCallback((newScreen: Screen, product: Product | null = null) => {
    const state = { screen: newScreen, selectedProductId: product?.id };
    window.history.pushState(state, '');
    setScreen(newScreen);
    setSelectedProduct(product);
  }, []); // setScreen and setSelectedProduct are stable, so no dependencies needed.

  useEffect(() => {
    // On initial load, replace current history state with our app's initial state.
    window.history.replaceState({ screen: 'home', selectedProductId: null }, '');

    const handlePopState = (event: PopStateEvent) => {
      if (event.state) {
        const { screen: newScreen, selectedProductId } = event.state;
        setScreen(newScreen || 'home');
        const product = selectedProductId ? allLiveProducts.find(p => p.id === selectedProductId) : null;
        setSelectedProduct(product || null);
      } else {
        // Fallback for states before our app took over history.
        setScreen('home');
        setSelectedProduct(null);
      }
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [allLiveProducts]); // Dependency is important to have the latest products list.


  useEffect(() => {
    const PRICE_CACHE_KEY = 'barrilesYaPrices';
    const PRICE_TIMESTAMP_KEY = 'barrilesYaPriceTimestamp';
    const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRzBXKoYgw1cRrhr4VTIQLEfQ30NrCGlmDIgacvLoUYN_eTnnZ7qMvdxVMNhqHIrg6cwchewxYUesv_/pub?gid=0&single=true&output=csv';

    const updateProductsWithPrices = (prices: PriceData) => {
        const updatedCategories = PRODUCT_CATEGORIES.map(category => ({
            ...category,
            products: category.products.map(product => {
                const productPrices = prices[product.id];
                if (!productPrices) return product;

                const newKits = product.kits.map(kit => {
                    let newPrice = kit.price;
                    let newExtraBarrelPrice = kit.pricePerExtraBarrel;
                    
                    if (product.type === 'combo') {
                        // For 'kit-completo', use the 'Precio kit completo (ARS)' column
                        if (kit.id.includes('kit-completo') && productPrices.kitCompleto !== undefined) {
                            newPrice = productPrices.kitCompleto;
                        }
                        // For 'solo-barriles', use the 'Precio barril (ARS)' column
                        if (kit.id.includes('solo-barriles') && productPrices.barril !== undefined) {
                            newPrice = productPrices.barril;
                        }
                    } else {
                         if (kit.id.includes('solo-barril') && productPrices.barril !== undefined) {
                            newPrice = productPrices.barril;
                        }
                        if (kit.id.includes('kit-completo') && productPrices.kitCompleto !== undefined) {
                            newPrice = productPrices.kitCompleto;
                        }
                        if (kit.id.includes('kit-extra') && productPrices.kitCompleto !== undefined && productPrices.barril !== undefined) {
                            newPrice = productPrices.kitCompleto;
                            newExtraBarrelPrice = productPrices.barril;
                        }
                    }
                    return { ...kit, price: newPrice, pricePerExtraBarrel: newExtraBarrelPrice };
                });
                return { ...product, kits: newKits };
            })
        }));
        setProductCategories(updatedCategories);
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
                if (!productName) continue;

                const barrilPriceString = cells[barrilPriceIndex]?.trim();
                const kitCompletoPriceString = cells[kitCompletoPriceIndex]?.trim();

                const barrilPrice = barrilPriceString ? parseInt(barrilPriceString.replace(/\D/g, ''), 10) : NaN;
                const kitCompletoPrice = kitCompletoPriceString ? parseInt(kitCompletoPriceString.replace(/\D/g, ''), 10) : NaN;
                
                let productId = '';
                if (productName.includes('cerveza') && !productName.includes('+')) productId = 'cerveza';
                else if (productName.includes('fernet') && !productName.includes('+')) productId = 'fernet';
                else if (productName.includes('gin') && !productName.includes('tonic') && !productName.includes('+')) productId = 'gin-tonic';
                else if (productName.includes('gin tonic')) productId = 'gin-tonic';
                else if (productName.includes('ruta 19')) productId = 'ruta-19';
                else if (productName.includes('viento sur')) productId = 'viento-sur';
                else if (productName.includes('sunset club')) productId = 'sunset-club';
                else if (productName.includes('casa tres')) productId = 'casa-tres';
                
                if (productId) {
                   const priceEntry: { barril?: number; kitCompleto: number } = {} as any;
                    let hasPrice = false;
                    
                    if (!isNaN(kitCompletoPrice)) {
                        priceEntry.kitCompleto = kitCompletoPrice;
                        hasPrice = true;
                    }
                    if (!isNaN(barrilPrice)) {
                        priceEntry.barril = barrilPrice;
                    }

                    if (hasPrice) {
                        newPrices[productId] = priceEntry;
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
    type GroupedProduct = { product: Product, totalBarrelQuantity: number, subtotal: number };
    const groupedByProduct = cart.reduce((acc: Record<string, GroupedProduct>, item: CartItem) => {
        const pid = item.product.id;
        if (!acc[pid]) {
          acc[pid] = { product: item.product, totalBarrelQuantity: 0, subtotal: 0 };
        }
        acc[pid].totalBarrelQuantity += getItemBarrelCount(item);
        acc[pid].subtotal += calculateItemTotal(item);
        return acc;
    }, {} as Record<string, GroupedProduct>);

    for (const productId in groupedByProduct) {
        const group = groupedByProduct[productId];
        const liveProduct = allLiveProducts.find(p => p.id === productId);
        const tiers = liveProduct?.discountTiers || [];
        
        const applicableTier = tiers
            .slice()
            .sort((a, b) => b.quantity - a.quantity)
            .find(tier => group.totalBarrelQuantity >= tier.quantity);

        if (applicableTier) {
            newDiscounts[productId] = {
                percentage: applicableTier.percentage,
                amount: (group.subtotal * applicableTier.percentage) / 100
            };
        }
    }
    setAutomaticDiscounts(newDiscounts);

  }, [cart, allLiveProducts]);

  useEffect(() => {
    if (cart.length < 2 || allLiveProducts.length === 0) return;

    const sortedCombos = allLiveProducts
      .filter(p => p.type === 'combo' && p.comboComponents && p.comboComponents.length > 0)
      .sort((a, b) => (b.comboComponents?.length ?? 0) - (a.comboComponents?.length ?? 0));

    const availableKits = new Map<string, number[]>();
    cart.forEach(item => {
      if (item.product.type === 'individual' && item.kit.id.includes('kit-completo')) {
        const virtualTimestamps = Array.from({ length: item.quantity }, (_, i) => item.timestamp + i * 0.01);
        availableKits.set(item.product.id, virtualTimestamps);
      }
    });

    const combosToAdd: CartItem[] = [];
    const consumedVirtualTimestamps = new Set<number>();

    for (const comboDef of sortedCombos) {
      const required = comboDef.comboComponents!;
      
      while (true) {
        const foundTimestamps: number[] = [];
        let canMakeCombo = true;

        for (const compId of required) {
          const availableTimestamps = availableKits.get(compId) || [];
          const nextAvailableTs = availableTimestamps.find(ts => !consumedVirtualTimestamps.has(ts));
          
          if (nextAvailableTs !== undefined) {
            foundTimestamps.push(nextAvailableTs);
          } else {
            canMakeCombo = false;
            break;
          }
        }

        if (canMakeCombo) {
          foundTimestamps.forEach(ts => consumedVirtualTimestamps.add(ts));
          const comboKit = comboDef.kits.find(k => k.id.includes('kit-completo'));
          if (comboKit) {
            combosToAdd.push({
              product: comboDef,
              kit: comboKit,
              quantity: 1,
              timestamp: Date.now() + Math.random(),
            });
          }
        } else {
          break; 
        }
      }
    }

    if (combosToAdd.length > 0) {
      let newCart = [...cart];
      const consumedOriginalItems = new Map<number, number>(); 
      consumedVirtualTimestamps.forEach(vts => {
        const originalTs = Math.floor(vts);
        consumedOriginalItems.set(originalTs, (consumedOriginalItems.get(originalTs) || 0) + 1);
      });

      newCart = newCart.map(item => {
        const consumedCount = consumedOriginalItems.get(item.timestamp);
        if (consumedCount) {
          return { ...item, quantity: item.quantity - consumedCount };
        }
        return item;
      }).filter(item => item.quantity > 0);

      newCart.push(...combosToAdd);
      
      const oldCartSignature = cart.map(i => `${i.kit.id}x${i.quantity}`).sort().join(',');
      const newCartSignature = newCart.map(i => `${i.kit.id}x${i.quantity}`).sort().join(',');

      if (oldCartSignature !== newCartSignature) {
          setCart(newCart);
          setFeedbackMessage('¡Combo detectado! Tu pedido fue actualizado con el mejor precio.');
      }
    }
  }, [cart, allLiveProducts]);


  const handleSelectProduct = useCallback((product: Product) => {
    navigate('product', product);
  }, [navigate]);
  
  const handleUpdateCartQuantity = useCallback((timestamp: number, newQuantity: number) => {
    setCart(prevCart => prevCart.map(item => 
        item.timestamp === timestamp ? { ...item, quantity: newQuantity } : item
    ));
  }, []);

  const showFeedback = (message: string) => {
      if (feedbackTimers.current.visibility) clearTimeout(feedbackTimers.current.visibility);
      if (feedbackTimers.current.clear) clearTimeout(feedbackTimers.current.clear);

      setFeedbackMessage(message);
      setIsFeedbackVisible(true);

      feedbackTimers.current.visibility = window.setTimeout(() => {
          setIsFeedbackVisible(false);
      }, 2700);

      feedbackTimers.current.clear = window.setTimeout(() => {
          setFeedbackMessage('');
      }, 3000);
  };

  const handleAddToCart = useCallback((product: Product, kit: Kit, quantity: number, imageElement: HTMLImageElement) => {
    const startRect = imageElement.getBoundingClientRect();
    setAnimationConfig({ active: true, imgSrc: imageElement.src, startRect });
    
    setTimeout(() => {
      const isCombo = product.type === 'combo';
      const existingItem = cart.find(item => item.kit.id === kit.id);

      if (isCombo) {
        if (existingItem) {
          showFeedback('Este combo ya está en tu pedido.');
          setIsCartShaking(true);
          setTimeout(() => setIsCartShaking(false), 820);
        } else {
          const newItem: CartItem = { product, kit, quantity: 1, timestamp: Date.now() };
          setCart(prev => [...prev, newItem]);
          showFeedback('¡Combo agregado!');
        }
        return;
      }
      
      // Default logic for individual items
      if (existingItem) {
          const newQuantity = existingItem.quantity + quantity;
          handleUpdateCartQuantity(existingItem.timestamp, newQuantity);
      } else {
          const newItem: CartItem = { product, kit, quantity, timestamp: Date.now() };
          setCart(prevCart => [...prevCart, newItem]);
      }
      showFeedback('¡Agregado al pedido!');
    }, 100);

  }, [cart, handleUpdateCartQuantity]);
  
  const handleRemoveFromCart = useCallback((timestamp: number) => {
    setCart(prevCart => prevCart.filter(item => item.timestamp !== timestamp));
  }, []);
  
  const handleOrderPlaced = useCallback(() => {
    setLastOrderInfo({ items: [...cart], discounts: automaticDiscounts });
    setCart([]);
    navigate('confirmation');
  }, [cart, automaticDiscounts, navigate, setCart, setLastOrderInfo]);

  const goHome = useCallback(() => {
      navigate('home');
  }, [navigate]);
  
  const goToCart = useCallback(() => {
      setIsMiniCartExpanded(false);
      navigate('cart');
  }, [navigate, setIsMiniCartExpanded]);

  const goBackToProduct = useCallback(() => {
      if (cart.length > 0) {
        const lastItem = cart[cart.length-1];
        const lastProductInCart = allLiveProducts.find(p => p.id === lastItem.product.id);
        navigate('product', lastProductInCart || null);
      } else {
        goHome();
      }
  }, [cart, goHome, allLiveProducts, navigate]);

  const resetOrder = useCallback(() => {
    setLastOrderInfo({ items: [], discounts: {} });
    setCart([]);
    navigate('home');
  }, [navigate, setCart, setLastOrderInfo]);

  const handleBackFromProduct = useCallback(() => {
    if (selectedProduct?.type === 'combo') {
        navigate('combos');
    } else {
        navigate('home');
    }
  }, [selectedProduct, navigate]);

  const renderScreen = () => {
    switch (screen) {
      case 'product':
        return selectedProduct && <ProductDetail product={selectedProduct} onAddToCart={handleAddToCart} onBack={handleBackFromProduct} isLoadingPrices={isLoadingPrices} />;
      case 'cart':
        return <Cart cart={cart} discounts={automaticDiscounts} onBack={goHome} onBackToProduct={goBackToProduct} onReset={resetOrder} onRemoveItem={handleRemoveFromCart} onUpdateQuantity={handleUpdateCartQuantity} onOrderPlaced={handleOrderPlaced} />;
      case 'confirmation':
        return <ConfirmationScreen onReset={resetOrder} lastOrder={lastOrderInfo} />;
      case 'combos':
        return <CombosScreen categories={productCategories} onSelectProduct={handleSelectProduct} onBack={goHome} />;
      case 'home':
      default:
        return <HomeScreen categories={productCategories} onSelectProduct={handleSelectProduct} onSelectCombos={() => navigate('combos')} />;
    }
  };

  const cartItemCount = cart.length;

  return (
    <div className="min-h-screen font-sans text-brand-dark-blue relative bg-brand-background">
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
      <header className="bg-brand-dark-blue text-white font-sans">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
            
            <div className="flex-1 flex justify-start">
                <div className="text-3xl font-black tracking-tighter cursor-pointer" onClick={resetOrder}>
                    PUMP
                </div>
            </div>

            <div className="flex-1 flex justify-end items-center gap-4 sm:gap-6">
                <a href="https://calculadorabarrilitos.netlify.app/" target="_blank" rel="noopener noreferrer" className="text-sm sm:text-base font-semibold hover:opacity-75 transition-opacity duration-200">
                    Calculadora
                </a>
                <div ref={cartIconRef} onClick={goToCart} className={`relative cursor-pointer p-2 ${isCartShaking ? 'animate-shake' : ''}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {cartItemCount > 0 && (
                        <span className="absolute top-0 right-0 bg-brand-cyan text-brand-dark-blue text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1/4 -translate-y-1/4">
                            {cartItemCount}
                        </span>
                    )}
                </div>
            </div>
        </div>
      </header>
      <main className="container mx-auto px-0 sm:px-4 pb-48 sm:pb-8">
          {isInitialLoad ? (
            <div className="animate-fade-in">
              <div className="text-center pt-4 sm:pt-8 px-4 sm:px-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-brand-dark-blue mb-2">Buscando las mejores promos...</h1>
                <p className="text-lg sm:text-xl text-brand-dark-blue/80 mb-8">Un momento, por favor.</p>
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
      <footer className="text-center p-4 text-brand-dark-blue/60 text-sm">
        <p>&copy; {new Date().getFullYear()} BarrilesYA!. Todos los derechos reservados.</p>
        {priceLastUpdated && <p className="text-brand-dark-blue/50 mt-1">Precios actualizados por última vez: {priceLastUpdated}</p>}
      </footer>
       {feedbackMessage && (
          <div className={`fixed top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white py-3 px-6 rounded-lg shadow-lg z-50 transition-all duration-300 ${isFeedbackVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}`}>
              {feedbackMessage}
          </div>
      )}
      {(screen === 'home' || screen === 'product' || screen === 'combos') && (
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

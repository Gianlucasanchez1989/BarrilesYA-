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
                <h1 className="text-2xl sm:text-3xl font-black text-brand-dark-blue mb-2">Elegí, combiná y disfrutá</h1>
                <p className="text-base sm:text-lg text-brand-dark-blue/80 mb-8">Armá tu pedido como más te guste. Nosotros nos ocupamos del resto.</p>
            </div>

            <div className="max-w-md mx-auto px-4">
                <div className="grid grid-cols-1 gap-4">
                    {homeProducts.map((product) => (
                        <ProductCard key={product.id} product={product} onSelect={onSelectProduct} />
                    ))}
                    {/* DESACTIVADO TEMPORALMENTE: TARJETA DE PROMOCIONES
                    <CategoryCard
                        name="¡Promociones!"
                        imageUrl="https://imgur.com"
                        onClick={onSelectCombos}
                    />
                    */}
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
← Volver


{comboCategory?.name || 'Combos'}
{comboCategory?.description || ''}



{comboProducts.map((product) => (

))}



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

¡Descuento máximo aplicado! 🎉

);
}
// Find the next tier we are aiming for to display in the text
const nextTier = tiers.find(t => currentQuantity < t.quantity);
if (!nextTier) {
// Fallback, should be caught by the maxTier check above
return (

¡Descuento máximo aplicado! 🎉

);
}
// The progress is calculated as a percentage of the way to the MAXIMUM tier.
// This provides a consistent visual, as requested by the user.
const progress = (currentQuantity / maxTier.quantity) * 100;
const itemsNeeded = nextTier.quantity - currentQuantity;
return (


¡Agregá {itemsNeeded} más para un {nextTier.percentage}% de descuento!


<div
className="bg-brand-cyan h-2.5 rounded-full transition-all duration-300"
style={{ width: ${progress}% }}
>


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
const [activeKitId, setActiveKitId] = useState(
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


← Volver


{product.name}
{product.kits.map(kit => (
<button
key={kit.id}
onClick={() => setActiveKitId(kit.id)}
className={flex-1 px-2 py-3 text-xs sm:text-base font-bold transition-all duration-300 border-b-4 ${activeKitId === kit.id ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-brand-dark-blue/60 hover:text-brand-dark-blue'}}
>
{kit.name.replace(' (10L)', '')}

))}
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

<div
className={bg-white rounded-lg p-6 flex flex-col lg:flex-row lg:gap-8 shadow-xl relative ${isMostPopular && !isCombo ? 'border-2 border-brand-cyan' : 'border-2 border-brand-secondary/50'}}
>
{isMostPopular && !isExtraBarrelKit && !isCombo && (

MÁS POPULAR

)}
{/* --- Left Column: Image --- */}

<img id={kit-img-${kit.id}} src={kit.imageUrl} alt={kit.name} className="w-full aspect-square lg:aspect-auto lg:h-full object-cover rounded-md" />
{/* --- Right Column: Details & Actions --- /}

{/ Top Section: Name & Description */}


{kit.name}


{isExtraBarrelKit
? El precio incluye el kit completo más {recambioCount} barril{recambioCount === 1 ? '' : 'es'} de recambio. Total de barriles: {totalBarrels}.
: kit.description
}

{/* Bottom Section: Controls */}


{isLoadingPrices ? (



) : (

{applicableTier ? (
<>
{formatCurrency(dynamicPrice)}
<p className={text-3xl font-bold ${isCombo ? 'text-green-500' : 'text-brand-dark-blue'}}>{formatCurrency(finalPrice)}
</>
) : (
{formatCurrency(finalPrice)}
)}

)}
{ !isCombo && (

<button onClick={() => handleQuantityChange(kit.id, -1)} disabled={quantity <= 1} className="bg-brand-light-blue text-brand-background rounded-full w-6 h-6 text-base font-bold hover:bg-brand-cyan hover:text-brand-dark-blue flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50">-
{quantity}
<button onClick={() => handleQuantityChange(kit.id, 1)} disabled={quantity >= 5} className="bg-brand-light-blue text-brand-background rounded-full w-6 h-6 text-base font-bold hover:bg-brand-cyan hover:text-brand-dark-blue flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50">+

)}
{ !isCombo &&  }
{applicableTier && !isCombo && (
<div className={text-center font-bold text-green-500 my-3 text-lg ${unlockedAnimation[kit.id] ? 'animate-pop' : ''}}>
¡Estás ahorrando un {applicableTier.percentage}%!

)}
<button
onClick={() => {
const imageElement = document.getElementById(kit-img-${kit.id}) as HTMLImageElement;
if (imageElement && quantity > 0) {
onAddToCart(product, kit, quantity, imageElement);
}
}}
className="mt-2 w-full bg-brand-cyan text-brand-dark-blue font-bold py-3 px-4 rounded-lg hover:bg-brand-light-blue hover:text-brand-background transition-all duration-300 text-lg disabled:bg-brand-light-blue/20 disabled:text-brand-secondary disabled:cursor-not-allowed transform active:scale-90"
>
Agregar al pedido





);
})}


);
};
const OrderActions: React.FC<{ orderMessage: string, onAction?: () => void }> = ({ orderMessage, onAction }) => {
const [copyStatus, setCopyStatus] = useState('');
const encodedOrderMessage = useMemo(() => encodeURIComponent(orderMessage), [orderMessage]);
const handleAction = (action: () => void | Promise) => {
action();
if (onAction) onAction();
};
const handleWhatsApp = () => handleAction(() => { window.open(https://wa.me{WHATSAPP_NUMBER}?text=${encodedOrderMessage}, '_blank'); });
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

Enviar por WhatsApp
{copyStatus || 'Copiar Pedido'}
Compartir

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
window.open(https://wa.me{WHATSAPP_NUMBER}?text=${encodedOrderMessage}, '_blank');
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

Tu pedido está vacío
Agregá alguna bebida para empezar.

Elegir Bebida


);
}
// FIX: Explicitly type reduce callback arguments to prevent 'unknown' type errors from Object.values().
const subtotal = Object.keys(groupedCart).reduce((sum: number, productId: string) => sum + groupedCart[productId].subtotal, 0);
const totalDiscount = Object.keys(discounts).reduce((sum: number, productId: string) => sum + discounts[productId].amount, 0);
const total = subtotal - totalDiscount;
return (

Tu Pedido


{/* FIX: Use Object.keys().map for better type safety with index signatures. */}
{Object.keys(groupedCart).map((productId: string) => {
const group = groupedCart[productId];
const discount = discounts[productId];
return (


{group.product.name}
{group.items.map(item => {
const isCombo = item.product.type === 'combo';
return (


{item.kit.name}
{formatCurrency(calculateItemTotal(item))}


{ !isCombo ? (

<button
onClick={() => onUpdateQuantity(item.timestamp, Math.max(1, Number(item.quantity || 1) - 1))}
disabled={Number(item.quantity) <= 1}
className="bg-brand-light-blue text-brand-background rounded-full w-8 h-8 text-xl font-bold hover:bg-brand-cyan hover:text-brand-dark-blue transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
>-
{item.quantity}
<button
onClick={() => onUpdateQuantity(item.timestamp, Math.min(5, Number(item.quantity || 0) + 1))}
disabled={Number(item.quantity) >= 5}
className="bg-brand-light-blue text-brand-background rounded-full w-8 h-8 text-xl font-bold hover:bg-brand-cyan hover:text-brand-dark-blue transition-transform active:scale-90 disabled:opacity-50 disabled:cursor-not-allowed"
>+

) : null }
<button onClick={() => onRemoveItem(item.timestamp)} className="text-red-400 hover:text-red-500 text-3xl font-light">×


);
})}

{discount && (

¡Excelente! Estás ahorrando {formatCurrency(discount.amount)} en {group.product.name}.

)}

);
})}


Subtotal: {formatCurrency(subtotal)}
{totalDiscount > 0 && Ahorro por cantidad: -{formatCurrency(totalDiscount)}}
Total: {formatCurrency(total)}

Finalizar y enviar


+ Agregar otra bebida

← Volver al último producto


Vaciar pedido y empezar de nuevo



);
};
const ConfirmationScreen: React.FC<{ onReset: () => void; lastOrder: { items: CartItem[]; discounts: AutomaticDiscounts } }> = ({ onReset, lastOrder }) => {
const subtotal = lastOrder.items.reduce((sum: number, item: CartItem) => sum + calculateItemTotal(item), 0);
// FIX: Explicitly type the discount parameter in reduce to fix type inference issues with Object.values.
const totalDiscountAmount = Object.keys(lastOrder.discounts).reduce((sum: number, discountKey: string) => sum + lastOrder.discounts[discountKey].amount, 0);
const total = subtotal - totalDiscountAmount;
const orderMessage = useMemo(() => generateOrderMessage(lastOrder.items, lastOrder.discounts), [lastOrder]);
return (

🎉
¡Pedido generado con éxito!
Gracias por tu pedido. Nos pondremos en contacto a la brevedad para coordinar la entrega.
{lastOrder.items.length > 0 && (

Resumen de tu pedido

{lastOrder.items.map(item => (

{item.kit.name} de {item.product.name} {item.product.type !== 'combo' ? (x${item.quantity}) : ''}
{formatCurrency(calculateItemTotal(item))}

))}


Subtotal: {formatCurrency(subtotal)}
{totalDiscountAmount > 0 && Ahorro por cantidad: -{formatCurrency(totalDiscountAmount)}}
Total: {formatCurrency(total)}


)}
¿Necesitás reenviar el pedido?

Hacer un nuevo pedido


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
<div className={fixed bottom-0 left-0 right-0 bg-brand-background/90 backdrop-blur-md shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.1)] rounded-t-2xl z-40 transition-transform duration-300 ease-in-out border-t border-brand-secondary ${isExpanded ? 'translate-y-0' : 'translate-y-full'}}>

Tu Pedido ({itemCount})
<button onClick={() => setIsExpanded(false)} className="p-2 rounded-full hover:bg-brand-secondary transition-colors">




{cart.map(item => {
const isCombo = item.product.type === 'combo';
return (


{item.kit.name} de {item.product.name}
{formatCurrency(calculateItemTotal(item))}

{ !isCombo ? (

<button
onClick={() => onUpdateQuantity(item.timestamp, Math.max(1, Number(item.quantity) - 1))}
disabled={Number(item.quantity) <= 1}
className="text-brand-dark-blue rounded-full w-6 h-6 text-lg font-bold hover:bg-brand-secondary/50 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
>-
{item.quantity}
<button
onClick={() => onUpdateQuantity(item.timestamp, Math.min(5, Number(item.quantity) + 1))}
disabled={Number(item.quantity) >= 5}
className="text-brand-dark-blue rounded-full w-6 h-6 text-lg font-bold hover:bg-brand-secondary/50 flex items-center justify-center transition-transform active:scale-90 disabled:opacity-50"
>+

) :  }
<button onClick={() => onRemoveItem(item.timestamp)} className="text-red-400 hover:text-red-500 text-2xl font-light leading-none p-1 transition-transform active:scale-90 flex items-center justify-center">×

)
})}
Total Final:
{formatCurrency(total)}


Confirmar pedido


{/* Collapsed Button */}
<div
onClick={() => setIsExpanded(true)}
className={fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 cursor-pointer group transition-all duration-300 ease-in-out ${isExpanded ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'}}
>





{formatCurrency(total)}


Avanzar con el pedido →



</>
);
};
// --- Main App Component ---
function App() {
const [screen, setScreen] = useState('home');
const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
const [cart, setCart] = useState<CartItem[]>(() => {
try {
const savedCart = window.localStorage.getItem('barrilesYaCart');
if (savedCart) {
const parsedCart = JSON.parse(savedCart);
if (Array.isArray(parsedCart)) {
// FIX: Add type assertion to ensure the cart state is correctly typed as CartItem[]
// This resolves a cascading type issue where item.quantity was inferred as unknown.
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
const [automaticDiscounts, setAutomaticDiscounts] = useState({});
const [lastOrderInfo, setLastOrderInfo] = useState<{ items: CartItem[], discounts: AutomaticDiscounts }>({ items: [], discounts: {} });
const [productCategories, setProductCategories] = useState<ProductCategory[]>(PRODUCT_CATEGORIES);
const allLiveProducts = useMemo(() => productCategories.flatMap(c => c.products), [productCategories]);
const [priceLastUpdated, setPriceLastUpdated] = useState('');
const [isLoadingPrices, setIsLoadingPrices] = useState(true);
const [isInitialLoad, setIsInitialLoad] = useState(true);
const [isMiniCartExpanded, setIsMiniCartExpanded] = useState(false);
const [isCartShaking, setIsCartShaking] = useState(false);
const [feedbackMessage, setFeedbackMessage] = useState('');
const [isFeedbackVisible, setIsFeedbackVisible] = useState(false);
const feedbackTimers = useRef<{ visibility: number | null, clear: number | null }>({ visibility: null, clear: null });
const cartIconRef = useRef(null);
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
const GOOGLE_SHEET_URL = 'google.com';
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
const consumedVirtualTimestamps = new Set();
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
const oldCartSignature = cart.map(i => ${i.kit.id}x${i.quantity}).sort().join(',');
const newCartSignature = newCart.map(i => ${i.kit.id}x${i.quantity}).sort().join(',');
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
return selectedProduct && ;
case 'cart':
return ;
case 'confirmation':
return ;
case 'combos':
return ;
case 'home':
default:
return <HomeScreen categories={productCategories} onSelectProduct={handleSelectProduct} onSelectCombos={() => navigate('combos')} />;
}
};
const cartItemCount = cart.length;
return (

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
PUMP

Calculadora

<div ref={cartIconRef} onClick={goToCart} className={relative cursor-pointer p-2 ${isCartShaking ? 'animate-shake' : ''}}>



{cartItemCount > 0 && (

{cartItemCount}

)}





{isInitialLoad ? (


Buscando las mejores promos...
Un momento, por favor.
) : (
renderScreen()
)}


© {new Date().getFullYear()} BarrilesYA!. Todos los derechos reservados.
{priceLastUpdated && Precios actualizados por última vez: {priceLastUpdated}}

{feedbackMessage && (
<div className={fixed top-8 left-1/2 -translate-x-1/2 bg-green-500 text-white py-3 px-6 rounded-lg shadow-lg z-50 transition-all duration-300 ${isFeedbackVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'}}>
{feedbackMessage}

)}
{(screen === 'home' || screen === 'product' || screen === 'combos') && (

)}

);
}
export default App;

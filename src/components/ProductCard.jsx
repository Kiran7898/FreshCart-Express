import React from "react";
import { Plus, Minus, ShoppingCart, Calendar, Flame } from "lucide-react";
import { useApp } from "../contexts/AppContext.jsx";

export const ProductCard = ({ product }) => {
  const { addToCart, cart, updateCartQty } = useApp();

  const cartItem = cart.find((item) => item.product.id === product.id);
  const netPrice = Math.round(product.basePrice * (1 - product.discountPercentage / 100) * 100) / 100;

  // Visual Styling for Category
  const getCategoryStyles = (category) => {
    switch (category) {
      case "Produce":
        return "bg-green-50 text-green-700 border-green-100";
      case "Dairy & Eggs":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "Bakery":
        return "bg-orange-50 text-orange-700 border-orange-100";
      case "Meat & Seafood":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "Pantry Staples":
        return "bg-indigo-50 text-indigo-700 border-indigo-100";
      case "Frozen Foods":
        return "bg-sky-50 text-sky-700 border-sky-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  // Stock indicator color
  const getStockBadge = (stock) => {
    if (stock <= 0) {
      return { text: "Out of Stock", class: "bg-red-50 text-red-700 border-red-100" };
    }
    if (stock <= 10) {
      return { text: `Low stock: ${stock} left`, class: "bg-red-50 text-red-600 border-red-100 animate-pulse" };
    }
    if (stock <= 25) {
      return { text: `${stock} available`, class: "bg-amber-50 text-amber-700 border-amber-100" };
    }
    return { text: `${stock} in stock`, class: "bg-green-50 text-green-700 border-green-100" };
  };

  // Check if any batch in the product is expiring within 5 days to flag a clearance opportunity
  const hasSoonExpiringBatch = () => {
    if (!product.batches || product.batches.length === 0) return false;
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + 5);

    return product.batches.some(b => {
      const expDate = new Date(b.expiryDate);
      return expDate <= thresholdDate && b.quantity > 0;
    });
  };

  const stockInfo = getStockBadge(product.totalStock);

  return (
    <div className="flex flex-col bg-white rounded-xl border border-gray-150 shadow-xs hover:shadow-md transition-all duration-300 overflow-hidden relative group">
      {/* Discount Tag */}
      {product.discountPercentage > 0 && (
        <span className="absolute top-3 left-3 z-10 bg-red-500 text-white font-black text-xs px-2.5 py-1 rounded-md shadow-xs flex items-center gap-1">
          <Flame className="w-3.5 h-3.5" />
          <span>{product.discountPercentage}% Clearance</span>
        </span>
      )}

      {/* Expiry Alert Warning Indicator */}
      {hasSoonExpiringBatch() && product.totalStock > 0 && (
        <span className="absolute top-3 right-3 z-10 bg-amber-500 text-slate-950 font-extrabold text-[10px] px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1 uppercase tracking-wide">
          <Calendar className="w-3 h-3" />
          <span>Near Expiry</span>
        </span>
      )}

      {/* Colored Visual Placeholder Header */}
      <div className={`h-24 w-full flex items-center justify-center relative transition-all group-hover:opacity-90 ${
        product.category === "Produce" ? "bg-gradient-to-br from-green-50 to-emerald-100" :
        product.category === "Dairy & Eggs" ? "bg-gradient-to-br from-amber-50 to-orange-100" :
        product.category === "Bakery" ? "bg-gradient-to-br from-orange-50 to-amber-100" :
        product.category === "Meat & Seafood" ? "bg-gradient-to-br from-rose-50 to-red-100" :
        product.category === "Pantry Staples" ? "bg-gradient-to-br from-indigo-50 to-blue-100" :
        "bg-gradient-to-br from-sky-50 to-indigo-100"
      }`}>
        <span className="text-4xl select-none transform group-hover:scale-110 transition-transform duration-300">
          {product.category === "Produce" ? "🍎" :
           product.category === "Dairy & Eggs" ? "🥛" :
           product.category === "Bakery" ? "🍞" :
           product.category === "Meat & Seafood" ? "🥩" :
           product.category === "Pantry Staples" ? "🌾" :
           "🫐"}
        </span>
      </div>

      <div className="p-4 flex flex-col flex-grow">
        {/* Category Badge */}
        <div className="flex justify-between items-center mb-1">
          <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${getCategoryStyles(product.category)}`}>
            {product.category}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Unit: {product.unit}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="font-serif font-extrabold text-slate-800 text-base sm:text-lg leading-tight mb-1 group-hover:text-green-700 transition-colors">
          {product.title}
        </h3>
        <p className="text-xs text-gray-400 line-clamp-2 h-8 mb-4">
          {product.description}
        </p>

        <div className="mt-auto flex flex-col gap-3">
          {/* Stock Badge & Price */}
          <div className="flex justify-between items-end">
            <span className={`text-[11px] font-bold border px-2 py-0.5 rounded-lg ${stockInfo.class}`}>
              {stockInfo.text}
            </span>

            <div className="text-right">
              {product.discountPercentage > 0 && (
                <span className="text-xs text-slate-400 line-through mr-1.5 font-medium">
                  ₹{product.basePrice.toFixed(2)}
                </span>
              )}
              <span className="text-lg font-black text-slate-800">
                ₹{netPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Batches Sub-Drawer tooltip listing */}
          <div className="border-t border-gray-100 pt-2 flex flex-col gap-1 text-[10px] text-gray-400 bg-slate-50/50 p-2 rounded-lg">
            <div className="font-semibold text-gray-500">Tracked Shelf Batches:</div>
            {product.batches && product.batches.length > 0 ? (
              product.batches.filter(b => b.quantity > 0).map((b) => (
                <div key={b.batchNumber} className="flex justify-between font-mono">
                  <span>#{b.batchNumber} (exp: {b.expiryDate})</span>
                  <span className="font-semibold text-gray-600">{b.quantity} pcs</span>
                </div>
              ))
            ) : (
              <span className="italic">No active stock batches</span>
            )}
          </div>

          {/* Action Row */}
          <div className="pt-1">
            {product.totalStock <= 0 ? (
              <button
                disabled
                className="w-full bg-slate-100 text-slate-400 font-bold text-xs py-2 px-3 rounded-lg cursor-not-allowed border-0"
              >
                Sold Out
              </button>
            ) : cartItem ? (
              <div className="flex items-center justify-between border border-green-200 bg-green-50 rounded-lg p-1">
                <button
                  onClick={() => updateCartQty(product.id, cartItem.quantity - 1)}
                  className="p-1 text-green-700 hover:bg-green-100 rounded-md transition-colors bg-white border-0 cursor-pointer shadow-xs"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black text-green-800">{cartItem.quantity}</span>
                <button
                  onClick={() => updateCartQty(product.id, cartItem.quantity + 1)}
                  className="p-1 text-green-700 hover:bg-green-100 rounded-md transition-colors bg-white border-0 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => addToCart(product, 1)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 px-3 rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 border-0 cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Add to Cart</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProductCard;

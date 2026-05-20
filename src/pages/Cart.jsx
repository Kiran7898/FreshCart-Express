import React, { useState } from "react";
import { ShoppingCart, Trash2, ArrowRight, Home as HomeIcon, CheckCircle2, TicketPercent, Wallet, LogIn } from "lucide-react";
import { useApp } from "../contexts/AppContext.jsx";

export const Cart = ({ setView, setSelectedOrderId }) => {
  const { user, cart, token, updateCartQty, removeFromCart, clearCart, getAuthHeaders, showNotification } = useApp();
  const [deliveryAddress, setDeliveryAddress] = useState("Flat 302, Royal Residency, 12th Main Road, Indiranagar, Bengaluru - 560038");
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [createdOrderRef, setCreatedOrderRef] = useState(null);

  if (!user || !token) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-xs px-6 my-10">
        <LogIn className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-gray-700 mb-1 leading-tight">Authentication Required</h3>
        <p className="text-xs text-gray-400 mb-6">
          You must be logged in as a registered Customer to build a basket or proceed with order placement.
        </p>
        <button
          onClick={() => setView("auth")}
          className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-all border-0 cursor-pointer shadow-sm"
          id="cart-signin-btn"
        >
          Sign In / Create Account
        </button>
      </div>
    );
  }

  // Cost calculation
  const subtotal = cart.reduce((sum, item) => {
    return sum + item.product.basePrice * item.quantity;
  }, 0);

  const netTotal = cart.reduce((sum, item) => {
    const net = item.product.basePrice * (1 - item.product.discountPercentage / 100);
    return sum + net * item.quantity;
  }, 0);

  const discountSavings = subtotal - netTotal;
  const deliveryFee = netTotal > 30 ? 0 : 3.99; // Free delivery over ₹30
  const finalPrice = netTotal + deliveryFee;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!deliveryAddress.trim()) {
      showNotification("Please select or enter a valid shipping drop address.");
      return;
    }

    setCheckingOut(true);
    try {
      const itemsPayload = cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      }));

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          items: itemsPayload,
          deliveryAddress,
        }),
      });

      const output = await response.json();

      if (output.success) {
        setCreatedOrderRef(output.data);
        showNotification(`Order ${output.data.id} placed successfully!`);
        clearCart();
        setCheckoutComplete(true);
      } else {
        showNotification(output.message || "Failed to complete checkout.");
      }
    } catch (error) {
      console.error("Checkout submission error:", error);
      showNotification("A server error interrupted your checkout. Check stock levels and retry.");
    } finally {
      setCheckingOut(false);
    }
  };

  const handleViewTracker = () => {
    if (createdOrderRef) {
      setSelectedOrderId(createdOrderRef.id);
      setView("tracking");
    }
  };

  // Success Checkout Screen
  if (checkoutComplete && createdOrderRef) {
    return (
      <div className="max-w-lg mx-auto text-center py-12 px-6 bg-white border border-gray-150 rounded-2xl shadow-sm my-8">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2 leading-none">Order Fired Successfully!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Your payment was processed and stock allocated. Thank you for shopping with FreshCart!
        </p>

        {/* Info card */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-left font-sans space-y-2.5 mb-8">
          <div className="flex justify-between items-center text-xs">
            <span className="text-gray-400 font-semibold uppercase">Order Reference:</span>
            <span className="font-bold text-gray-800 font-mono text-sm">#{createdOrderRef.id}</span>
          </div>
          <div className="flex justify-between items-center text-xs border-t border-slate-100 pt-2.5">
            <span className="text-gray-400 font-semibold uppercase">Charged Amount:</span>
            <span className="font-bold text-green-700 text-sm">₹{createdOrderRef.totalPrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-start text-xs border-t border-slate-100 pt-2.5">
            <span className="text-gray-400 font-semibold uppercase flex-shrink-0 mr-4">Deliver To:</span>
            <span className="font-semibold text-gray-600 text-right">{createdOrderRef.deliveryAddress}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => setView("home")}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all border-0 cursor-pointer"
            id="success-shop-btn"
          >
            Keep Shopping
          </button>
          <button
            onClick={handleViewTracker}
            className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm flex items-center justify-center gap-1.5 border-0 cursor-pointer"
            id="success-track-btn"
          >
            <span>Live Order Tracker</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-slate-800 tracking-tight leading-none mb-1">Your Basket</h2>
          <p className="text-xs text-slate-400 font-semibold">Review your selected items and shipping details</p>
        </div>
        {cart.length > 0 && (
          <button
            onClick={() => {
              clearCart();
              showNotification("Cleared all items from cart.");
            }}
            className="text-xs font-bold text-red-500 bg-transparent hover:underline flex items-center gap-1 border-0 cursor-pointer"
            id="cart-clear-btn"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Empty Cart</span>
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <ShoppingCart className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-700 mb-1 leading-tight">Your Cart is Empty</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto mb-6">
            Explore our grocery catalogs to find delicious local produce, milk, dairy bread loaves, or succulent steak cuts.
          </p>
          <button
            onClick={() => setView("home")}
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-all border-0 cursor-pointer"
            id="cart-empty-shop-btn"
          >
            Explore Grocery Products
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Cart items list - Left Col */}
          <div className="lg:col-span-7 space-y-3.5" id="cart-items-list">
            {cart.map((item) => {
              const itemNet = item.product.basePrice * (1 - item.product.discountPercentage / 100);
              return (
                <div
                  key={item.product.id}
                  className="flex bg-white items-center p-4 border border-gray-150 rounded-xl shadow-xs justify-between gap-4 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-slate-50 border border-slate-100 rounded-lg">
                      {item.product.category === "Produce" ? "🍎" :
                       item.product.category === "Dairy & Eggs" ? "🥛" :
                       item.product.category === "Bakery" ? "🍞" :
                       item.product.category === "Meat & Seafood" ? "🥩" :
                       item.product.category === "Pantry Staples" ? "🌾" :
                       "🫐"}
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="font-bold text-gray-800 text-sm leading-tight">{item.product.title}</span>
                      <span className="text-[10px] text-slate-400 font-semibold mt-0.5">
                        Category: {item.product.category} | Unit: {item.product.unit}
                      </span>
                      {item.product.discountPercentage > 0 && (
                        <span className="text-[9px] bg-red-100 text-red-600 font-extrabold px-1.5 py-0.5 rounded-md mt-1 w-max">
                          {item.product.discountPercentage}% OFF applied
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Stepper */}
                    <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
                      <button
                        onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-slate-200 text-slate-500 rounded bg-white border border-gray-150 shadow-xs cursor-pointer animate-fade"
                      >
                        <Trash2 className="w-3 h-3 text-red-500" />
                      </button>
                      <span className="text-xs font-black min-w-5 text-center text-slate-800">{item.quantity}</span>
                      <button
                        onClick={() => updateCartQty(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-slate-200 text-slate-500 rounded bg-white border border-gray-150 shadow-xs cursor-pointer"
                      >
                        <span className="text-xs font-bold text-green-700 px-0.5">+</span>
                      </button>
                    </div>

                    {/* Cost */}
                    <div className="text-right">
                      <div className="font-black text-gray-800 text-sm">₹{(itemNet * item.quantity).toFixed(2)}</div>
                      {item.product.discountPercentage > 0 && (
                        <div className="text-[10px] text-slate-400 line-through">
                          ₹{(item.product.basePrice * item.quantity).toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pricing & Checkout - Right Col */}
          <div className="lg:col-span-5">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-6 space-y-5 sticky top-24">
              <h3 className="font-serif font-black text-slate-800 text-lg leading-none border-b border-slate-150 pb-4 flex items-center gap-2">
                <Wallet className="w-4.5 h-4.5 text-green-600" />
                <span>Order Summary</span>
              </h3>

              {/* Cost ledger list */}
              <div className="space-y-2.5 text-xs font-semibold text-gray-500">
                <div className="flex justify-between">
                  <span>Cart Items Base Subtotal</span>
                  <span className="font-bold text-gray-700">₹{subtotal.toFixed(2)}</span>
                </div>

                {discountSavings > 0 && (
                  <div className="flex justify-between text-green-600 font-bold bg-green-50/50 p-2 rounded-lg border border-dashed border-green-100">
                    <span className="flex items-center gap-1">
                      <TicketPercent className="w-3.5 h-3.5" />
                      Expiry Clearance Discounts
                    </span>
                    <span>-₹{discountSavings.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="flex flex-col">
                    <span>Local Carrier Dispatch Fee</span>
                    <span className="text-[10px] text-slate-400 font-medium">Free courier on orders over ₹30.00</span>
                  </span>
                  <span className="font-bold text-gray-700">
                    {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between text-sm text-gray-800 font-black">
                  <span>Total Cost Charged</span>
                  <span className="text-green-700 text-base font-extrabold">₹{finalPrice.toFixed(2)}</span>
                </div>
              </div>

              {/* Address Form */}
              <form onSubmit={handleCheckout} className="space-y-3 pt-3 border-t border-slate-50">
                <div className="flex flex-col text-left gap-1">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1 uppercase">
                    <HomeIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>Courier Address Drop-off Point</span>
                  </label>
                  <textarea
                    rows={2}
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your street name, apt unit level, and city code."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-green-500 focus:bg-white transition-all resize-none"
                    id="address-textarea"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={checkingOut}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-350 text-white font-extrabold text-sm py-3 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border-0 mt-3"
                  id="checkout-submit-btn"
                >
                  {checkingOut ? (
                    <span>Placing your order...</span>
                  ) : (
                    <>
                      <span>Complete Order</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;

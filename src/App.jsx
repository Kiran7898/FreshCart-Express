import React, { useState } from "react";
import { AppProvider, useApp } from "./contexts/AppContext.jsx";
import { Navbar } from "./components/Navbar.jsx";
import { Home } from "./pages/Home.jsx";
import { Cart } from "./pages/Cart.jsx";
import { OrderTracking } from "./pages/OrderTracking.jsx";
import { PartnerPanel } from "./pages/PartnerPanel.jsx";
import { AdminInventory } from "./pages/AdminInventory.jsx";
import { Auth } from "./pages/Auth.jsx";
import { Radio, ShoppingCart } from "lucide-react";

const MainAppContent = () => {
  const { user, notification, cart } = useApp();
  const [view, setView] = useState("home");
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Guard routing internally for high integrity
  const navigateToView = (targetView) => {
    if (targetView === "cart" && !user) {
      setView("auth");
      return;
    }
    if (targetView === "tracking" && !user) {
      setView("auth");
      return;
    }
    if (targetView === "partner" && (!user || user.role !== "partner")) {
      setView("home");
      return;
    }
    if (targetView === "admin" && (!user || user.role !== "admin")) {
      setView("home");
      return;
    }
    setView(targetView);
  };

  const renderActiveView = () => {
    switch (view) {
      case "home":
        return <Home />;
      case "cart":
        return <Cart setView={navigateToView} setSelectedOrderId={setSelectedOrderId} />;
      case "tracking":
        return <OrderTracking selectedOrderId={selectedOrderId} setSelectedOrderId={setSelectedOrderId} />;
      case "partner":
        return <PartnerPanel />;
      case "admin":
        return <AdminInventory />;
      case "auth":
        return <Auth setView={navigateToView} />;
      default:
        return <Home />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Dynamic Slide-Up Notification Toast */}
      {notification && (
        <div className="fixed bottom-24 md:bottom-6 right-6 z-50 bg-slate-900 text-white rounded-xl shadow-lg border border-slate-800 p-4 max-w-sm flex items-center gap-3 animate-bounce">
          <div className="p-1 px-1.5 bg-green-500 rounded-md text-slate-900 text-[10px] font-black uppercase tracking-wide">
            Notify
          </div>
          <span className="text-xs font-bold font-sans text-left leading-normal">{notification}</span>
        </div>
      )}

      {/* Floating Mobile Shopping Cart Button */}
      {cartCount > 0 && (
        <button
          onClick={() => navigateToView("cart")}
          className="fixed bottom-6 right-6 z-40 md:hidden bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-full shadow-lg transition-all duration-250 active:scale-95 flex items-center justify-center cursor-pointer border-0 w-12 h-12 hover:scale-105"
          id="floating-cart-btn"
          title="Go to Cart"
        >
          <ShoppingCart className="w-5 h-5 flex-shrink-0" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white ring-2 ring-white">
            {cartCount}
          </span>
        </button>
      )}

      {/* Main navigation header */}
      <Navbar currentView={view} setView={navigateToView} />

      {/* Sub-Header Live banner */}
      <div className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderActiveView()}
      </div>

      {/* Standard brand clean footer */}
      <footer className="bg-white border-t border-gray-100 py-6 mt-12 text-xs font-semibold text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span>© 2026 FreshCart Express. Full-stack FEFO Logistics Marketplace.</span>
          </div>
          <div className="flex gap-4 font-bold text-slate-500">
            <span>Duplex: Socket.IO Server protocol</span>
            <span>-</span>
            <span>Workspace: Sandboxed Cloud Run</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

import React, { useState } from "react";
import { ShoppingCart, LogOut, ShieldAlert, Truck, Home, User as UserIcon, Radio, Menu, X } from "lucide-react";
import { useApp } from "../contexts/AppContext.tsx";

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView }) => {
  const { user, logout, cart, socketConnected } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-xs backdrop-blur-md bg-white/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("home")}
              className="flex items-center gap-2.5 bg-transparent border-0 cursor-pointer p-0"
              id="nav-logo"
            >
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-serif font-black text-xl">
                F
              </div>
              <span className="text-2xl font-serif font-black text-slate-800 tracking-tight">
                FreshCart<span className="text-sm font-sans font-bold uppercase tracking-widest text-slate-400 ml-1">Express</span>
              </span>
            </button>
            
            {/* Live Socket Connection Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-[10px] font-bold text-slate-500">
              <span className={`w-2 h-2 rounded-full ${socketConnected ? "bg-green-500 animate-pulse" : "bg-slate-300"}`}></span>
              <span>{socketConnected ? "Live" : "Offline"}</span>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setView("home")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === "home"
                  ? "bg-green-50 text-green-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
              id="nav-home-btn"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Shop Catalogue</span>
            </button>

            {user && user.role === "customer" && (
              <button
                onClick={() => setView("cart")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  currentView === "cart"
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                id="nav-cart-btn"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Shopping Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button
                onClick={() => setView("tracking")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === "tracking"
                    ? "bg-green-50 text-green-700"
                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                }`}
                id="nav-orders-btn"
              >
                <Radio className="w-4 h-4" />
                <span>Track Orders</span>
              </button>
            )}

            {user && user.role === "partner" && (
              <button
                onClick={() => setView("partner")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === "partner"
                    ? "bg-orange-50 text-orange-700"
                    : "text-gray-500 hover:text-orange-600 hover:bg-gray-50"
                }`}
                id="nav-partner-btn"
              >
                <Truck className="w-4 h-4" />
                <span>Courier Portal</span>
              </button>
            )}

            {user && user.role === "admin" && (
              <button
                onClick={() => setView("admin")}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentView === "admin"
                    ? "bg-blue-50 text-blue-700"
                    : "text-gray-500 hover:text-blue-600 hover:bg-gray-50"
                }`}
                id="nav-admin-btn"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}

            {/* Auth section */}
            {user ? (
              <div className="flex items-center gap-2 ml-2 border-l border-gray-100 pl-2 sm:pl-4">
                <div className="hidden md:flex flex-col text-right">
                  <span className="text-xs font-bold text-gray-800">{user.name}</span>
                  <span className="text-[10px] capitalize text-slate-400 font-semibold">{user.role}</span>
                </div>
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <UserIcon className="w-4 h-4" />
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Sign Out"
                  id="nav-logout-btn"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setView("auth")}
                className="ml-2 bg-green-600 hover:bg-green-700 text-white font-bold text-sm px-4 py-2 rounded-lg transition-all shadow-sm"
                id="nav-signin-btn"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile Hamburg Toggle Button */}
          <div className="flex items-center md:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-slate-600 hover:text-green-700 hover:bg-slate-100 rounded-xl transition-all border-0 bg-transparent cursor-pointer"
              aria-label="Toggle navigation"
              id="mobile-hamburger-btn"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Collapsible Dropdown Panel */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white shadow-md animate-fade">
          <div className="px-4 py-3 space-y-2.5">
            <button
              onClick={() => {
                setView("home");
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer text-left ${
                currentView === "home"
                  ? "bg-green-50 text-green-700 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
              id="mobile-nav-home"
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              <span>Shop Catalogue</span>
            </button>

            {user && user.role === "customer" && (
              <button
                onClick={() => {
                  setView("cart");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer text-left ${
                  currentView === "cart"
                    ? "bg-green-50 text-green-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
                id="mobile-nav-cart"
              >
                <ShoppingCart className="w-5 h-5 flex-shrink-0" />
                <span>Shopping Cart</span>
                {cartCount > 0 && (
                  <span className="ml-auto bg-red-500 text-[10px] font-black text-white px-2 py-0.5 rounded-full">
                    {cartCount}
                  </span>
                )}
              </button>
            )}

            {user && (
              <button
                onClick={() => {
                  setView("tracking");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer text-left ${
                  currentView === "tracking"
                    ? "bg-green-50 text-green-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
                id="mobile-nav-tracking"
              >
                <Radio className="w-5 h-5 flex-shrink-0" />
                <span>Track Orders</span>
              </button>
            )}

            {user && user.role === "partner" && (
              <button
                onClick={() => {
                  setView("partner");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer text-left ${
                  currentView === "partner"
                    ? "bg-orange-50 text-orange-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
                id="mobile-nav-partner"
              >
                <Truck className="w-5 h-5 flex-shrink-0" />
                <span>Courier Portal</span>
              </button>
            )}

            {user && user.role === "admin" && (
              <button
                onClick={() => {
                  setView("admin");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all border-0 cursor-pointer text-left ${
                  currentView === "admin"
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
                id="mobile-nav-admin"
              >
                <ShieldAlert className="w-5 h-5 flex-shrink-0" />
                <span>Admin Panel</span>
              </button>
            )}

            {/* Auth / Profile Area inside mobile panel */}
            <div className="border-t border-slate-100 pt-3 mt-1.5">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-3.5 py-1">
                    <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-bold text-slate-800 leading-none mb-1">{user.name}</span>
                      <span className="text-[10px] capitalize text-slate-400 font-bold tracking-wide">{user.role}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 font-bold text-sm rounded-xl transition-all border-0 cursor-pointer"
                    id="mobile-nav-logout-btn"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setView("auth");
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-sm py-3 rounded-xl transition-all shadow-sm border-0 cursor-pointer flex items-center justify-center gap-2"
                  id="mobile-nav-login-btn"
                >
                  <span>Sign In / Create Account</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
export default Navbar;

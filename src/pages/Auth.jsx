import React, { useState } from "react";
import { LogIn, UserPlus, Mail, Lock, User, ClipboardCheck, Sparkles } from "lucide-react";
import { useApp } from "../contexts/AppContext.jsx";

export const Auth = ({ setView }) => {
  const { login, showNotification } = useApp();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (!isLoginMode && !name)) {
      showNotification("Please supply all required authentication fields.");
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLoginMode ? "/api/auth/signin" : "/api/auth/signup";
      const bodyPayload = isLoginMode
        ? { email, password }
        : { name, email, password, role };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
      });

      const output = await response.json();

      if (response.ok && output.token) {
        login(output.token, output.user);
        
        // Redirect based on role
        if (output.user.role === "admin") {
          setView("admin");
        } else if (output.user.role === "partner") {
          setView("partner");
        } else {
          setView("home");
        }
      } else {
        showNotification(output.message || "Authentication attempt rejected.");
      }
    } catch (err) {
      console.error("Auth submit error:", err);
      showNotification("Database connection failure. Check credential matches.");
    } finally {
      setLoading(false);
    }
  };

  // Helper tester pre-fill logins
  const prefillTestRole = (roleType) => {
    if (roleType === "admin") {
      setEmail("admin@grocery.com");
      setPassword("password123");
    } else if (roleType === "customer") {
      setEmail("customer@grocery.com");
      setPassword("password123");
    } else {
      setEmail("partner@grocery.com");
      setPassword("password123");
    }
    setIsLoginMode(true);
    showNotification(`Prefilled login credentials for tester ${roleType}! Click sign-in.`);
  };

  return (
    <div className="max-w-md mx-auto my-10 bg-white border border-gray-150 rounded-2xl p-6 shadow-sm flex flex-col gap-6 text-left animate-fade">
      <div className="text-center font-sans">
        <span className="p-3 bg-green-50 rounded-full inline-block text-2xl mb-3">🛒</span>
        <h2 className="text-2xl font-serif font-black text-slate-800 tracking-tight leading-none mb-1.5">
          {isLoginMode ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-xs text-slate-550 font-medium leading-normal">
          {isLoginMode
            ? "Sign in to compile your basket, view orders, or manage deliverable items"
            : "Sign up to shop fresh items, or deliver orders in your local area"}
        </p>
      </div>

      {/* Main Authentication Form */}
      <form onSubmit={handleSubmit} className="space-y-4 font-sans">
        {!isLoginMode && (
          <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
            <label className="uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-green-500 focus:bg-white"
              id="auth-name-input"
            />
          </div>
        )}

        <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
          <label className="uppercase tracking-wider flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-slate-400" />
            <span>Email Address</span>
          </label>
          <input
            type="email"
            required
            placeholder="tester@grocery.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-semibold focus:outline-none focus:border-green-500 focus:bg-white"
            id="auth-email-input"
          />
        </div>

        <div className="flex flex-col gap-1 text-[11px] font-bold text-slate-500">
          <label className="uppercase tracking-wider flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Password</span>
          </label>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-2 text-xs font-mono font-bold focus:outline-none focus:border-green-500 focus:bg-white"
            id="auth-password-input"
          />
        </div>

        {!isLoginMode && (
          <div className="flex flex-col gap-1.5 text-[11px] font-bold text-slate-500">
            <label className="uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>Choose System Role</span>
            </label>
            
            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setRole("customer")}
                className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                  role === "customer"
                    ? "bg-green-50 text-green-700 border-green-400 font-extrabold text-[#15803d]"
                    : "bg-white text-gray-500 border-gray-200"
                }`}
                id="role-customer-btn"
              >
                Customer shopper
              </button>
              <button
                type="button"
                onClick={() => setRole("partner")}
                className={`py-2 px-3 text-xs font-bold rounded-lg border cursor-pointer transition-all ${
                  role === "partner"
                    ? "bg-orange-50 text-orange-750 border-orange-400 font-extrabold text-[#c2410c]"
                    : "bg-white text-gray-500 border-gray-200"
                }`}
                id="role-partner-btn"
              >
                Delivery Courier
              </button>
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white font-extrabold text-sm py-2.5 rounded-lg transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer border-0 pt-2"
          id="auth-submit-btn"
        >
          {loading ? (
            <span>Signing in...</span>
          ) : isLoginMode ? (
            <>
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Register New Account</span>
            </>
          )}
        </button>
      </form>

      {/* Switch auth mode trigger */}
      <button
        onClick={() => setIsLoginMode(!isLoginMode)}
        className="text-xs font-bold text-slate-400 hover:text-green-650 transition-colors bg-transparent border-0 cursor-pointer text-center leading-none font-sans"
        id="auth-mode-toggle-btn"
      >
        {isLoginMode ? "Need an account? Sign up here" : "Already have an account? Sign in here"}
      </button>

      {/* Quick Tester accounts section */}
      <div className="border-t border-slate-200 pt-4 flex flex-col gap-2 font-sans">
        <div className="text-[10px] uppercase font-black text-slate-400 flex items-center gap-1.5 justify-center">
          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
          <span>Quick Access Profiles</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => prefillTestRole("customer")}
            className="py-1.5 px-2 bg-slate-50 hover:bg-green-50 text-[10px] font-black rounded-lg border border-slate-200 hover:border-green-200 text-slate-600 hover:text-green-700 transition-all cursor-pointer truncate"
            id="test-login-customer"
          >
            🛒 Customer
          </button>
          
          <button
            onClick={() => prefillTestRole("partner")}
            className="py-1.5 px-2 bg-slate-50 hover:bg-orange-50 text-[10px] font-black rounded-lg border border-slate-200 hover:border-orange-200 text-slate-600 hover:text-orange-700 transition-all cursor-pointer truncate"
            id="test-login-partner"
          >
            🚲 Courier Run
          </button>

          <button
            onClick={() => prefillTestRole("admin")}
            className="py-1.5 px-1 bg-slate-50 hover:bg-indigo-50 text-[10px] font-black rounded-lg border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 transition-all cursor-pointer truncate"
            id="test-login-admin"
          >
            🛡️ Admin Log
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;

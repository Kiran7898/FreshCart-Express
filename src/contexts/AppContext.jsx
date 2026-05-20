import React, { createContext, useContext, useState, useEffect } from "react";
import { io } from "socket.io-client";

const AppContext = createContext(undefined);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [cart, setCart] = useState([]);
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [notification, setNotification] = useState(null);
  const [catalogRefetchToken, setCatalogRefetchToken] = useState(0);

  // 1. Initial State Auto-Load from LocalStorage
  useEffect(() => {
    const savedToken = localStorage.getItem("grocery_jwt");
    const savedUser = localStorage.getItem("grocery_user");
    const savedCart = localStorage.getItem("grocery_cart");

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }

    if (savedCart) {
      setCart(JSON.parse(savedCart));
    }
  }, []);

  // Sync Cart with LocalStorage on mutation
  useEffect(() => {
    localStorage.setItem("grocery_cart", JSON.stringify(cart));
  }, [cart]);

  // 2. Establish persistent socket handshake on startup or change of login
  useEffect(() => {
    // We connect directly to current host origin on WebSocket protocol
    const socketInstance = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketInstance.on("connect", () => {
      console.log("WebSocket linked on client successfully:", socketInstance.id);
      setSocketConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("WebSocket disconnected from backend");
      setSocketConnected(false);
    });

    // Listen to store-wide live inventory changes
    socketInstance.on("inventoryUpdate", (data) => {
      console.log("Live inventory sync event received:", data);
      
      // Update our cart if stock drops below selected amount
      setCart((prevCart) => {
        const itemIndex = prevCart.findIndex((item) => item.product.id === data.productId);
        if (itemIndex >= 0) {
          const item = prevCart[itemIndex];
          if (data.deleted || data.totalStock <= 0) {
            showNotification(`Item '${item.product.title}' went out of stock and was removed from cart.`);
            return prevCart.filter((i) => i.product.id !== data.productId);
          } else if (data.totalStock < item.quantity) {
            showNotification(`Stock decreased for '${item.product.title}'. Quantity adjusted to match max available.`);
            const updated = [...prevCart];
            updated[itemIndex] = {
              ...item,
              quantity: data.totalStock,
              product: { ...item.product, totalStock: data.totalStock },
            };
            return updated;
          } else {
            // update stock metadata on the cart product reference
            const updated = [...prevCart];
            updated[itemIndex] = {
              ...item,
              product: { ...item.product, totalStock: data.totalStock },
            };
            return updated;
          }
        }
        return prevCart;
      });

      // Notify pages to fetch fresh catalog products
      triggerRefetchCatalog();
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const triggerRefetchCatalog = () => {
    setCatalogRefetchToken((prev) => prev + 1);
  };

  const showNotification = (msg) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification((curr) => (curr === msg ? null : curr));
    }, 4500);
  };

  const login = (jwtToken, userDetails) => {
    setToken(jwtToken);
    setUser(userDetails);
    localStorage.setItem("grocery_jwt", jwtToken);
    localStorage.setItem("grocery_user", JSON.stringify(userDetails));
    showNotification(`Welcome back, ${userDetails.name}! Registered as ${userDetails.role}.`);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setCart([]);
    localStorage.removeItem("grocery_jwt");
    localStorage.removeItem("grocery_user");
    localStorage.removeItem("grocery_cart");
    showNotification("You have been signed out successfully.");
  };

  const addToCart = (product, qty = 1) => {
    // If stock is zero, reject
    if (product.totalStock <= 0) {
      showNotification("This product is currently out of stock.");
      return;
    }

    setCart((prevCart) => {
      const existsIndex = prevCart.findIndex((item) => item.product.id === product.id);

      if (existsIndex >= 0) {
        const item = prevCart[existsIndex];
        const newQty = item.quantity + qty;
        
        if (newQty > product.totalStock) {
          showNotification(`Cannot add more. Maximum available stock limit is ${product.totalStock}.`);
          const updated = [...prevCart];
          updated[existsIndex] = { ...item, quantity: product.totalStock };
          return updated;
        }

        const updated = [...prevCart];
        updated[existsIndex] = { ...item, quantity: newQty };
        showNotification(`Updated item count for '${product.title}' to ${newQty}.`);
        return updated;
      } else {
        if (qty > product.totalStock) {
          showNotification(`Only ${product.totalStock} units available.`);
          return [...prevCart, { product, quantity: product.totalStock }];
        }
        showNotification(`Added '${product.title}' to shopping cart.`);
        return [...prevCart, { product, quantity: qty }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCart((prevCart) => {
      const target = prevCart.find((i) => i.product.id === productId);
      if (target) {
        showNotification(`Removed '${target.product.title}' from shopping cart.`);
      }
      return prevCart.filter((item) => item.product.id !== productId);
    });
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prevCart) => {
      const itemIndex = prevCart.findIndex((item) => item.product.id === productId);
      if (itemIndex >= 0) {
        const item = prevCart[itemIndex];
        const maxStock = item.product.totalStock;
        
        if (qty > maxStock) {
          showNotification(`Cannot exceed max stock limit of ${maxStock} units.`);
          const updated = [...prevCart];
          updated[itemIndex] = { ...item, quantity: maxStock };
          return updated;
        }

        const updated = [...prevCart];
        updated[itemIndex] = { ...item, quantity: qty };
        return updated;
      }
      return prevCart;
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const getAuthHeaders = () => {
    return {
      Authorization: `Bearer ${token || ""}`,
    };
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        cart,
        socket,
        socketConnected,
        notification,
        login,
        logout,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        showNotification,
        getAuthHeaders,
        triggerRefetchCatalog,
        catalogRefetchToken,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used inside an AppProvider context hierarchy");
  }
  return context;
};

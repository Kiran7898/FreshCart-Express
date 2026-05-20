import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Package, Truck, Compass, CheckCircle, Radio, Clock, AlertCircle, ShoppingBag, MapPin } from "lucide-react";
import { useApp } from "../contexts/AppContext.jsx";

export const OrderTracking = ({ selectedOrderId, setSelectedOrderId }) => {
  const { user, token, getAuthHeaders, showNotification } = useApp();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  // Status index helper
  const statusSteps = ["Pending", "Packed", "Shipped", "Out for Delivery", "Delivered"];

  // 1. Load all client orders
  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders", {
        headers: getAuthHeaders(),
      });
      const output = await response.json();
      if (output.success) {
        setOrders(output.data);
        // Highlight first order if none selected or if selected is missing
        if (output.data.length > 0) {
          if (selectedOrderId) {
            const matched = output.data.find((o) => o.id === selectedOrderId);
            if (matched) {
              setCurrentOrder(matched);
              setLogs(matched.logs.map((l) => `[Recorded] Order moved to status ${l.status} at ${new Date(l.timestamp).toLocaleTimeString()}`));
            } else {
              setCurrentOrder(output.data[0]);
              setLogs(output.data[0].logs.map((l) => `[Recorded] Order moved to status ${l.status} at ${new Date(l.timestamp).toLocaleTimeString()}`));
            }
          } else {
            setCurrentOrder(output.data[0]);
            setLogs(output.data[0].logs.map((l) => `[Recorded] Order moved to status ${l.status} at ${new Date(l.timestamp).toLocaleTimeString()}`));
          }
        }
      } else {
        setError(output.message || "Failed to load orders history.");
      }
    } catch (err) {
      console.error("Order tracking load error:", err);
      setError("Unable to connect to order feeds.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchOrders();
    }
  }, [user, token, selectedOrderId]);

  // 2. Setup Socket.IO subscription client handshake for currentOrder
  useEffect(() => {
    if (!currentOrder) return;

    // Build handshake to socket server origin
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log(`Socket connection aligned in tracker. Subscribing to order room: ${currentOrder.id}`);
      socket.emit("joinOrderRoom", currentOrder.id);
      
      setLogs((prev) => [
        ...prev,
        `[Sync Active] Listening to live Courier updates for Order #${currentOrder.id}...`,
      ]);
    });

    // Listen to real-time status changes
    socket.on("orderStatusChanged", (data) => {
      console.log("Real-time WS order status changed received:", data);
      
      if (data.orderId === currentOrder.id) {
        // Adjust current order status
        setCurrentOrder((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: data.status,
            location: data.location || prev.location,
          };
        });

        // Add to visible log timeline
        setLogs((prev) => [
          ...prev,
          `[LIVE UPDATE] ${new Date(data.updatedAt).toLocaleTimeString()}: Order status advanced to ${data.status}!`,
        ]);

        showNotification(`Order #${data.orderId} advanced to '${data.status}'!`);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [currentOrder?.id]);

  const selectOrder = (order) => {
    setSelectedOrderId(order.id);
    setCurrentOrder(order);
    setLogs(order.logs.map((l) => `[Recorded] Order moved to status ${l.status} at ${new Date(l.timestamp).toLocaleTimeString()}`));
  };

  const getStepIcon = (step) => {
    switch (step) {
      case "Pending":
        return <ShoppingBag className="w-5 h-5" />;
      case "Packed":
        return <Package className="w-5 h-5" />;
      case "Shipped":
        return <Truck className="w-5 h-5" />;
      case "Out for Delivery":
        return <Compass className="w-5 h-5" />;
      case "Delivered":
        return <CheckCircle className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const currentStepIndex = currentOrder ? statusSteps.indexOf(currentOrder.status) : 0;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <Radio className="w-8 h-8 text-green-600 animate-pulse" />
        <p className="text-sm font-semibold text-gray-400">Loading your delivery logs...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="max-w-md mx-auto text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-xs px-6 my-10 animate-fade">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="font-bold text-gray-700 mb-1 leading-tight">No Order Records Found</h3>
        <p className="text-xs text-gray-400 mb-6">
          You haven't checked out any baskets yet. Place an order in the catalog to initiate real-time delivery telemetry tracking!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-6">
      {/* Sidebar: Lists active deliveries - Left 4 Cols */}
      <div className="lg:col-span-4 space-y-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <span>Checkout History</span>
          <span className="bg-slate-200 text-slate-600 rounded-full px-2 py-0.5 text-[10px] font-black">{orders.length}</span>
        </h3>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-2" id="orders-history-list">
          {orders.map((o) => {
            const isSelected = currentOrder && currentOrder.id === o.id;
            return (
              <button
                key={o.id}
                onClick={() => selectOrder(o)}
                className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer block ${
                  isSelected
                    ? "bg-green-50 border-green-300 shadow-xs ring-2 ring-green-150"
                    : "bg-white border-gray-150 hover:bg-slate-50"
                }`}
                id={`order-select-${o.id}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-mono font-bold text-xs text-slate-800">#{o.id}</span>
                  <span className={`text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded ${
                    o.status === "Delivered" ? "bg-green-100 text-green-700" :
                    o.status === "Out for Delivery" ? "bg-orange-100 text-orange-700" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {o.status}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-600 truncate mb-1">
                  {o.items.map((it) => `${it.quantity}x ${it.title}`).join(", ")}
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100 mt-2">
                  <span>{new Date(o.createdAt).toLocaleDateString()}</span>
                  <span className="text-gray-700 font-bold">₹{o.totalPrice.toFixed(2)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tracker Body panel - Right 8 Cols */}
      <div className="lg:col-span-8">
        {currentOrder ? (
          <div className="bg-white border border-gray-150 rounded-2xl shadow-sm p-6 space-y-8 text-left animate-fade">
            
            {/* Header info bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-gray-50 pb-5">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Delivery Status</span>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-green-50 border border-green-200 rounded-full text-[9px] font-extrabold text-green-700 uppercase tracking-wider shadow-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-ping"></span>
                    <span>Broadcasting</span>
                  </div>
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-black text-slate-800 leading-tight">Order #{currentOrder.id.slice(0, 8)}</h2>
              </div>

              <div className="text-left sm:text-right text-xs">
                <div className="text-gray-400 font-semibold uppercase mb-1">Total Charges</div>
                <div className="text-slate-800 font-black text-xl leading-none">₹{currentOrder.totalPrice.toFixed(2)}</div>
              </div>
            </div>

            {/* Steps Timeline map progress bar */}
            <div className="space-y-4">
              <div className="grid grid-cols-5 gap-2 relative">
                {statusSteps.map((step, idx) => {
                  const isCompleted = idx <= currentStepIndex;
                  const isActive = idx === currentStepIndex;

                  return (
                    <div key={step} className="flex flex-col items-center relative z-10">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                        isActive
                          ? "bg-green-600 border-green-600 text-white ring-4 ring-green-100 scale-110"
                          : isCompleted
                          ? "bg-green-500 border-green-500 text-white"
                          : "bg-white border-gray-200 text-gray-400"
                      }`}>
                        {getStepIcon(step)}
                      </div>
                      <span className={`text-[9px] sm:text-xs font-extrabold mt-2.5 text-center leading-tight ${
                        isActive ? "text-green-700 font-black" : isCompleted ? "text-slate-700" : "text-gray-400"
                      }`}>
                        {step}
                      </span>
                    </div>
                  );
                })}

                {/* Tracking Connector Line */}
                <div className="absolute top-[20px] sm:top-[24px] left-[10%] right-[10%] h-[3px] bg-gray-100 -z-0">
                  <div
                    className="h-full bg-green-500 transition-all duration-500"
                    style={{ width: `${currentStepIndex >= 0 ? (currentStepIndex / 4) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Courier partner details and tracking map */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-slate-100">
              {/* Delivery dispatch info */}
              <div className="space-y-4 text-xs font-semibold text-gray-500">
                <h4 className="font-black text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-green-600" />
                  <span>Courier Manifest Parameters</span>
                </h4>

                <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl space-y-3">
                  <div>
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Recipient Drop Address</div>
                    <div className="font-bold text-gray-700 mt-0.5 leading-normal">{currentOrder.deliveryAddress}</div>
                  </div>

                  <div>
                    <div className="text-gray-400 text-[10px] uppercase font-bold">Assigned Courier Runner</div>
                    {currentOrder.deliveryPartnerId ? (
                      <div className="flex items-center gap-2 mt-1 bg-white border border-slate-150 rounded-lg p-2 w-max animate-fade">
                        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 text-xs font-extrabold">
                          🚲
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 text-xs leading-none">{currentOrder.deliveryPartnerName}</span>
                          <span className="text-[9px] text-slate-400">Claims Completed: 12 deliveries</span>
                        </div>
                      </div>
                    ) : (
                      <span className="italic text-gray-400 mt-1 block">Awaiting partner self-assignment in dashboard...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Order checkout breakdown list */}
              <div className="space-y-4 text-xs font-semibold text-gray-500">
                <h4 className="font-black text-gray-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-green-600" />
                  <span>Items Ledger</span>
                </h4>

                <div className="border border-gray-150 rounded-xl overflow-hidden bg-white">
                  <div className="max-h-[160px] overflow-y-auto divide-y divide-gray-100">
                    {currentOrder.items.map((item) => (
                      <div key={item.productId} className="flex justify-between items-center p-3 font-medium">
                        <div className="text-left">
                          <span className="text-gray-700 font-bold block">{item.title}</span>
                          <span className="text-[10px] text-slate-400">{item.quantity} {item.unit} x ₹{item.price.toFixed(2)}</span>
                        </div>
                        <span className="font-bold text-slate-700">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Elegant fulfillment updates feed */}
            <div className="border border-slate-200 rounded-2xl bg-slate-100/50 p-5 text-left font-sans shadow-xs">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2.5 mb-3.5">
                <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse inline-block"></span>
                  <span>Live Fulfillment Feed</span>
                </div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Updates Stream</span>
              </div>
              <div className="space-y-2 max-h-[120px] overflow-y-auto leading-normal text-slate-650 text-xs font-medium">
                {logs.length === 0 ? (
                  <div className="text-slate-450 text-xs italic">Waiting for initial courier updates...</div>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="flex gap-2 items-start border-l-2 border-green-600/60 pl-3 py-1">
                      <span className="text-slate-700">{log.replace(/\[LIVE UPDATE\]|\[Recorded\]|\[Sync Active\]/g, "").trim()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="text-center py-20 bg-white border border-gray-100 rounded-2xl shadow-xs">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-700 mb-1 leading-tight">No Active Order Selected</h3>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Choose an order from the list on the left to review its live fulfillment status.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;

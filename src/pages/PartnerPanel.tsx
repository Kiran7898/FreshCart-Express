import React, { useState, useEffect } from "react";
import { Truck, MapPin, PackageOpen, ClipboardCopy, Radio, Fuel, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";
import { useApp } from "../contexts/AppContext.tsx";
import { Order } from "../types.ts";

export const PartnerPanel: React.FC = () => {
  const { user, token, getAuthHeaders, socket, socketConnected, showNotification } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track simulate interval
  const [gpsInterval, setGpsInterval] = useState<NodeJS.Timeout | null>(null);
  const [trackingSimulatingId, setTrackingSimulatingId] = useState<string | null>(null);

  // 1. Fetch orders relevant for carrier delivery
  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/orders", {
        headers: getAuthHeaders(),
      });
      const output = await response.json();
      if (output.success) {
        setOrders(output.data);
        setError(null);
      } else {
        setError(output.message || "Failed to load partner orders.");
      }
    } catch (err) {
      console.error("Partner order download error:", err);
      setError("Unable to communicate with order dispatch databases.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchDeliveries();
    }
  }, [user, token]);

  // Clean simulation on unmount
  useEffect(() => {
    return () => {
      if (gpsInterval) clearInterval(gpsInterval);
    };
  }, [gpsInterval]);

  // 2. Claim open delivery parcel
  const handleClaimOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}/claim`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
      });
      const output = await response.json();
      if (output.success) {
        showNotification(`Order #${orderId} claimed! Status advanced to Shipped.`);
        fetchDeliveries();
      } else {
        showNotification(output.message || "Failed to claim order.");
      }
    } catch (error) {
      showNotification("Server error claiming this parcel.");
    }
  };

  // 3. Promote Status Transition
  const handleUpdateStatus = async (orderId: string, nextStatus: string, customCoords?: { lat: number; lng: number }) => {
    try {
      const bodyPayload: any = { status: nextStatus };
      if (customCoords) {
        bodyPayload.lat = customCoords.lat;
        bodyPayload.lng = customCoords.lng;
      }

      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(bodyPayload),
      });

      const output = await response.json();

      if (output.success) {
        showNotification(`Order #${orderId} moved to status '${nextStatus}'!`);
        
        // Emits Socket.IO update status manually if the backend didn't trigger
        if (socket && socketConnected) {
          socket.emit("updateOrderStatus", {
            orderId,
            updatedStatus: nextStatus,
            partnerLocation: customCoords || { lat: 12.9784, lng: 77.6408 },
          });
        }

        fetchDeliveries();
      } else {
        showNotification(output.message || "Failed to update status.");
      }
    } catch (err) {
      showNotification("Server error writing status transaction.");
    }
  };

  // 4. GPS Simulated Trip coordinates incrementor
  const startGpsSimulation = (order: Order) => {
    if (gpsInterval) {
      clearInterval(gpsInterval);
      setGpsInterval(null);
      setTrackingSimulatingId(null);
      showNotification("GPS simulator suspended.");
      return;
    }

    setTrackingSimulatingId(order.id);
    showNotification("Initiating GPS road dispatch mock simulation...");

    let stepsCount = 0;
    const initialLat = order.location?.lat || 12.9784;
    const initialLng = order.location?.lng || 77.6408;

    const interval = setInterval(() => {
      stepsCount++;
      const offsetLat = (Math.sin(stepsCount / 4) * 0.002);
      const offsetLng = (Math.cos(stepsCount / 4) * 0.002);

      const movingLat = initialLat + offsetLat;
      const movingLng = initialLng + offsetLng;

      // Broadcast new position via WS
      if (socket && socketConnected) {
        console.log(`Pulsing Simulated position step #${stepsCount} for Order ${order.id}: ${movingLat}, ${movingLng}`);
        socket.emit("updateOrderStatus", {
          orderId: order.id,
          updatedStatus: "Out for Delivery",
          partnerLocation: { lat: movingLat, lng: movingLng },
        });
      }

      if (stepsCount >= 8) {
        // Complete ride
        clearInterval(interval);
        setGpsInterval(null);
        setTrackingSimulatingId(null);
        handleUpdateStatus(order.id, "Delivered", { lat: movingLat, lng: movingLng });
        showNotification(`Fulfillment Completed! Order #${order.id} marked as Delivered.`);
      }
    }, 2800);

    setGpsInterval(interval);
  };

  // Compartmentalize claimed vs unassigned open orders
  const unassignedOrders = orders.filter((o) => !o.deliveryPartnerId);
  const myAssignedOrders = orders.filter((o) => o.deliveryPartnerId === user?.id && o.status !== "Delivered");

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
        <Truck className="w-8 h-8 text-green-600 animate-bounce" />
        <p className="text-sm font-semibold text-gray-400">Syncing order dispatcher cargo...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Overview header stats card */}
      <div className="relative rounded-3xl bg-amber-50 border border-amber-250 p-8 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-6 mb-2">
        <div className="text-left max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <ClipboardCopy className="w-3.5 h-3.5" />
            <span>Active Dispatch Runner Hub</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-slate-800 tracking-tight leading-tight mb-2">Courier Assignment Desk</h1>
          <p className="text-sm text-slate-600 font-medium">
            Review unclaimed grocery parcels prepared at central depots, assign them to your courier runs, and trigger simulated automated GPS routes.
          </p>
        </div>

        <button
          onClick={fetchDeliveries}
          className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 p-2.5 px-4.5 rounded-xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs font-bold cursor-pointer self-start sm:self-auto"
          id="partner-reload-btn"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh Cargo Feed</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Unassigned open orders feed - Left 6 Cols */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <PackageOpen className="w-4 h-4 text-orange-500" />
            <span>Unassigned Warehouse Parcels ({unassignedOrders.length})</span>
          </h3>

          {unassignedOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-150 p-5">
              <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-500 text-sm">No Unclaimed Packages</div>
              <p className="text-gray-400 text-xs">Our storage hubs currently have no unassigned Packed orders. Check back shortly.</p>
            </div>
          ) : (
            <div className="space-y-3" id="unassigned-parcels-list">
              {unassignedOrders.map((o) => (
                <div key={o.id} className="bg-white border border-gray-150 rounded-xl shadow-xs p-4 text-left space-y-3.5 hover:shadow-sm">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 font-mono">Order Ref: #{o.id}</span>
                    <span className="bg-amber-100 text-amber-800 font-extrabold px-1.5 py-0.5 rounded text-[10px] uppercase">
                      {o.status} Ready
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-600 line-clamp-2">
                    {o.items.map((it) => `${it.quantity}x ${it.title}`).join(", ")}
                  </div>

                  <div className="text-[11px] font-bold text-slate-500 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span>Deliver to: {o.deliveryAddress}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-50 flex-wrap gap-2">
                    <span className="text-xs font-black text-slate-800">Payout: ₹{(o.totalPrice * 0.15).toFixed(2)}</span>
                    <button
                      onClick={() => handleClaimOrder(o.id)}
                      className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-all border-0 shadow-xs"
                      id={`claim-btn-${o.id}`}
                    >
                      Self-Assign Parcel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Claimed Parcel Log Manager - Right 6 Cols */}
        <div className="lg:col-span-6 space-y-4">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-500" />
            <span>Your Assigned Deliveries Run ({myAssignedOrders.length})</span>
          </h3>

          {myAssignedOrders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-150 p-5 font-sans">
              <ClipboardCopy className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-500 text-sm">No Claims Currently</div>
              <p className="text-gray-400 text-xs">Self-assign parcels from the warehouse listing desk to populate your active delivery runs.</p>
            </div>
          ) : (
            <div className="space-y-4" id="assigned-runs-list">
              {myAssignedOrders.map((o) => {
                const isGpsSimulating = trackingSimulatingId === o.id;

                return (
                  <div key={o.id} className="bg-white border border-gray-150 rounded-xl shadow-xs p-5 text-left space-y-4 shadow-sm hover:shadow-md transition-shadow">
                    
                    {/* Header reference */}
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <span className="font-bold text-slate-800 font-mono text-sm block">Run #{o.id}</span>
                        <span className="text-[10px] text-slate-400 font-bold">Placed: {new Date(o.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-orange-700 text-sm font-black">₹{o.totalPrice.toFixed(2)}</span>
                        <span className="text-[9px] uppercase font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded mt-1">
                          Role: {o.status}
                        </span>
                      </div>
                    </div>

                    {/* Address target */}
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs font-semibold text-slate-600 space-y-1.5">
                      <div className="text-slate-400 text-[10px] uppercase font-bold">Despatch Destination Address</div>
                      <div className="font-extrabold text-slate-700">{o.deliveryAddress}</div>
                    </div>

                    {/* Items payload bullet */}
                    <div className="text-[11px] font-semibold text-gray-500">
                      <div className="text-[10px] text-slate-400 uppercase font-black mb-1">Cargo Loading list:</div>
                      <ul className="list-disc pl-4 space-y-1">
                        {o.items.map((it, idx) => (
                          <li key={idx}>
                            {it.quantity} {it.unit} x <span className="font-extrabold text-slate-700">{it.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Step Transitions trigger keys */}
                    <div className="flex flex-col gap-2 pt-3 border-t border-slate-100">
                      <div className="text-[10px] text-slate-400 uppercase font-black mb-1 leading-none">Dispatcher Controls:</div>
                      
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          disabled={o.status === "Shipped"}
                          onClick={() => handleUpdateStatus(o.id, "Shipped")}
                          className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                            o.status === "Shipped"
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                          id={`btn-shipped-${o.id}`}
                        >
                          Mark Shipped
                        </button>

                        <button
                          disabled={o.status === "Out for Delivery" && !isGpsSimulating}
                          onClick={() => handleUpdateStatus(o.id, "Out for Delivery")}
                          className={`text-[10px] font-black px-2.5 py-1.5 rounded-lg border cursor-pointer ${
                            o.status === "Out for Delivery"
                              ? "bg-amber-600 text-white border-amber-600 animate-pulse"
                              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                          }`}
                          id={`btn-out-${o.id}`}
                        >
                          Mark Out for Delivery
                        </button>

                        <button
                          disabled={isGpsSimulating}
                          onClick={() => handleUpdateStatus(o.id, "Delivered")}
                          className="text-[10px] font-black px-2.5 py-1.5 rounded-lg border bg-white hover:bg-green-50 text-green-700 border-green-200 cursor-pointer"
                          id={`btn-delv-${o.id}`}
                        >
                          Mark Delivered
                        </button>
                      </div>

                      {/* GPS Route movement mock simulation */}
                      {o.status === "Out for Delivery" && (
                        <div className="mt-3 bg-slate-100 border border-slate-200 rounded-2xl p-4 text-slate-700 text-xs flex justify-between items-center shadow-xs">
                          <div className="flex items-center gap-3">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-600"></span>
                            </span>
                            <div className="flex flex-col text-left">
                              <span className="text-[10px] text-slate-400 font-extrabold tracking-wider uppercase leading-none">GPS ROUTE SIMULATOR</span>
                              <span className="text-[9px] text-slate-500 font-semibold mt-1.5 leading-none truncate max-w-[120px] sm:max-w-[180px]">
                                Coords: {o.location?.lat?.toFixed(5) || 12.978}, {o.location?.lng?.toFixed(5) || 77.64}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={() => startGpsSimulation(o)}
                            className={`px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-extrabold text-[10px] rounded-lg border-0 cursor-pointer transition-all ${
                              isGpsSimulating ? "bg-red-605 hover:bg-red-700" : ""
                            }`}
                            id={`btn-sim-gps-${o.id}`}
                          >
                            {isGpsSimulating ? "Pause Run" : "Simulate Live Run"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
export default PartnerPanel;

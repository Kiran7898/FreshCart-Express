import React, { useState, useEffect } from "react";
import { Shield, Sparkles, TrendingUp, Users, ShoppingBag, Plus, Percent, AlertTriangle, Calendar, ClipboardList, Trash2, ArrowRight, RefreshCw } from "lucide-react";
import { useApp } from "../contexts/AppContext.tsx";
import { Product, ExpiryAuditItem, AdminMetrics } from "../types.ts";

export const AdminInventory: React.FC = () => {
  const { user, token, getAuthHeaders, showNotification, catalogRefetchToken, triggerRefetchCatalog } = useApp();
  const [activeTab, setActiveTab] = useState<"analytics" | "audit" | "add_product">("analytics");
  
  // Dashboard Metrics
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Expiry Audit Items
  const [auditItems, setAuditItems] = useState<ExpiryAuditItem[]>([]);
  const [loadingAudit, setLoadingAudit] = useState<boolean>(true);

  // Clearance discount modal state
  const [discountModal, setDiscountModal] = useState<{ open: boolean; productId: string; name: string } | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(50);

  // Create Product Form States
  const [newTitle, setNewTitle] = useState<string>("");
  const [newDescription, setNewDescription] = useState<string>("");
  const [newCategory, setNewCategory] = useState<"Produce" | "Dairy & Eggs" | "Bakery" | "Meat & Seafood" | "Pantry Staples" | "Frozen Foods">("Produce");
  const [newUnit, setNewUnit] = useState<"kg" | "g" | "L" | "ml" | "pcs" | "pack">("pcs");
  const [newPrice, setNewPrice] = useState<string>("");
  const [newDiscount, setNewDiscount] = useState<string>("0");
  
  // Add batch inputs
  const [batchCode, setBatchCode] = useState<string>("BAT-" + Math.random().toString(36).substr(2, 6).toUpperCase());
  const [batchQty, setBatchQty] = useState<string>("35");
  const [batchMfgDate, setBatchMfgDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [batchExpDate, setBatchExpDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15); // Default 15 days expiry
    return d.toISOString().split("T")[0];
  });
  const [batchesList, setBatchesList] = useState<Array<{ batchNumber: string; manufacturedDate: string; expiryDate: string; quantity: number }>>([]);

  // Fetch metrics data
  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const response = await fetch("/api/orders/metrics", {
        headers: getAuthHeaders(),
      });
      const output = await response.json();
      if (output.success) {
        setMetrics(output.metrics);
      }
    } catch (err) {
      console.error("Metrics load error:", err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fetch expiry audit list
  const fetchExpiryAudit = async () => {
    setLoadingAudit(true);
    try {
      const response = await fetch("/api/products/expiry-audit", {
        headers: getAuthHeaders(),
      });
      const output = await response.json();
      if (output.success) {
        setAuditItems(output.data);
      }
    } catch (err) {
      console.error("Audit load error:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      if (activeTab === "analytics") {
        fetchMetrics();
      } else if (activeTab === "audit") {
        fetchExpiryAudit();
      }
    }
  }, [user, token, activeTab, catalogRefetchToken]);

  // Handle batch adding in Product creation Form
  const handleAddBatchToForm = () => {
    if (!batchCode || !batchExpDate) {
      showNotification("Batch tracking code and expiry date are required inputs.");
      return;
    }
    const qtyInt = parseInt(batchQty) || 0;
    if (qtyInt < 0) {
      showNotification("Batch stock volume cannot be negative.");
      return;
    }

    setBatchesList((prev) => [
      ...prev,
      {
        batchNumber: batchCode,
        manufacturedDate: batchMfgDate,
        expiryDate: batchExpDate,
        quantity: qtyInt,
      },
    ]);

    // reset batch inputs to default for next entry
    setBatchCode("BAT-" + Math.random().toString(36).substr(2, 6).toUpperCase());
    setBatchQty("25");
    showNotification(`Batch #${batchCode} appended to staging buffer.`);
  };

  const removeBatchFromForm = (idx: number) => {
    setBatchesList((prev) => prev.filter((_, i) => i !== idx));
  };

  // Handle product creation submission
  const handleCreateProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDescription || !newPrice) {
      showNotification("Please provide title, description, and base price.");
      return;
    }

    if (batchesList.length === 0) {
      showNotification("You must specify at least one batch with its respective expiry parameters.");
      return;
    }

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDescription,
          category: newCategory,
          unit: newUnit,
          basePrice: parseFloat(newPrice),
          discountPercentage: parseFloat(newDiscount) || 0,
          batches: batchesList,
        }),
      });

      const output = await response.json();

      if (output.success) {
        showNotification(`Grocery product ${newTitle} provisioned successfully!`);
        // reset form fields
        setNewTitle("");
        setNewDescription("");
        setNewPrice("");
        setNewDiscount("0");
        setBatchesList([]);
        triggerRefetchCatalog();
        setActiveTab("analytics"); // Redirect to analytics
      } else {
        showNotification(output.message || "Failed to create product.");
      }
    } catch (err) {
      console.error("Product create error:", err);
      showNotification("A server error interrupted product creation. Ensure inputs match limits.");
    }
  };

  // Handle quick discount clearance action
  const handleApplyClearanceDiscount = async () => {
    if (!discountModal) return;

    try {
      const response = await fetch("/api/products/expiry-discount", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          productId: discountModal.productId,
          discountPercentage: discountPercent,
        }),
      });

      const output = await response.json();

      if (output.success) {
        showNotification(`Applied clearance discount of ${discountPercent}% to ${discountModal.name}!`);
        setDiscountModal(null);
        fetchExpiryAudit();
        triggerRefetchCatalog();
      } else {
        showNotification(output.message || "Failed to trigger discount.");
      }
    } catch (err) {
      showNotification("Server error applying targeted clearance price.");
    }
  };

  // Color coordinate help for ERF ranges
  const getErfColor = (erf: number) => {
    if (erf >= 10) return { text: "Critical Risk (FEFO)", bg: "bg-red-50 text-red-600 border-red-100 font-extrabold animate-pulse" };
    if (erf >= 4) return { text: "Medium Risk", bg: "bg-amber-50 text-amber-700 border-amber-100" };
    return { text: "Low Risk", bg: "bg-green-50 text-green-700 border-green-100" };
  };

  return (
    <div className="space-y-6">
      
      {/* Header Info area */}
      <div className="relative rounded-3xl bg-slate-100 border border-slate-200 p-8 shadow-xs flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-left max-w-xl">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-slate-600 border border-slate-200 text-xs font-bold uppercase tracking-wider mb-4 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Store Administrator</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-black text-slate-800 tracking-tight leading-tight mb-2">Administrative Control</h1>
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            Monitor product inventories, manage active stock batches, identify items near expiration to apply targeted clearance discounts, and expand catalog choices instantly.
          </p>
        </div>
        <div className="text-6xl select-none hidden md:block">📊</div>
      </div>

      {/* Nav Tabs Bar */}
      <div className="flex border-b border-gray-200 gap-1 flex-wrap">
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-3 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-colors ${
            activeTab === "analytics"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
          id="tab-analytics-btn"
        >
          <TrendingUp className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          <span>Fulfillment Analytics</span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-5 py-3 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-colors ${
            activeTab === "audit"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
          id="tab-audit-btn"
        >
          <AlertTriangle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          <span>Smart Expiry Auditing</span>
        </button>

        <button
          onClick={() => setActiveTab("add_product")}
          className={`px-5 py-3 text-xs font-bold border-b-2 tracking-wide cursor-pointer transition-colors ${
            activeTab === "add_product"
              ? "border-green-600 text-green-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
          id="tab-add-btn"
        >
          <Plus className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />
          <span>Provision New Product</span>
        </button>
      </div>

      {/* -------------------- 1. ANALYTICS TABS WINDOW -------------------- */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {loadingMetrics ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <RefreshCw className="w-7 h-7 text-green-600 animate-spin" />
              <p className="text-xs font-semibold text-gray-400">Aggregating backoffice statistics...</p>
            </div>
          ) : metrics ? (
            <div className="space-y-6">
              
              {/* KPI Cards cluster */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <div className="bg-white rounded-xl border border-gray-150 p-5 p-4 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-400 uppercase">Gross Complete Turnover</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">₹{metrics.totalSales.toFixed(2)}</h3>
                  </div>
                  <div className="p-3 bg-green-100 text-green-700 rounded-xl">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-150 p-5 p-4 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-400 uppercase">Registered Active Users</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">{metrics.activeUsers}</h3>
                  </div>
                  <div className="p-3 bg-blue-100 text-blue-700 rounded-xl">
                    <Users className="w-6 h-6" />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-150 p-5 p-4 flex items-center justify-between shadow-xs">
                  <div className="text-left">
                    <span className="text-xs font-bold text-gray-400 uppercase">Logistical Orders Book</span>
                    <h3 className="text-2xl font-black text-slate-800 mt-1">{metrics.ordersCount}</h3>
                  </div>
                  <div className="p-3 bg-orange-100 text-orange-700 rounded-xl">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                </div>
              </div>

              {/* Graphical Charts bento block */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* Categories sales chart - 4 Cols */}
                <div className="bg-white border border-gray-150 rounded-xl p-5 md:col-span-4 text-left shadow-xs">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5 mb-4">
                    <span>Department Sales Weight</span>
                  </h4>
                  
                  {/* Human-built CSS/SVG Bars chart */}
                  <div className="space-y-4">
                    {metrics.categorySales && metrics.categorySales.length > 0 ? (
                      metrics.categorySales.map((c) => {
                        const maxVal = Math.max(...metrics.categorySales.map((o) => o.sales), 1);
                        const weightPct = (c.sales / maxVal) * 100;
                        return (
                          <div key={c.name} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{c.name}</span>
                              <span className="text-slate-500">₹{c.sales.toFixed(2)}</span>
                            </div>
                            <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all duration-300"
                                style={{ width: `${weightPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-400 italic">No category sales recorded</span>
                    )}
                  </div>
                </div>

                {/* Top-Selling products - 5 Cols */}
                <div className="bg-white border border-gray-150 rounded-xl p-5 md:col-span-5 text-left shadow-xs">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5 mb-4">
                    <span>Top-Selling Grocery Products</span>
                  </h4>

                  <div className="divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
                    {metrics.topSellingProducts && metrics.topSellingProducts.length > 0 ? (
                      metrics.topSellingProducts.map((p, idx) => (
                        <div key={idx} className="flex justify-between items-center py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-400">0{idx + 1}.</span>
                            <span className="text-xs font-bold text-slate-700">{p.title}</span>
                          </div>
                          <div className="text-right flex flex-col font-mono text-[11px] leading-tight">
                            <span className="font-bold text-slate-800">{p.quantity} sold</span>
                            <span className="text-slate-400 font-semibold">₹{p.sales.toFixed(2)} rev</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-xs text-slate-400 italic py-10">Waiting for Delivered placements...</div>
                    )}
                  </div>
                </div>

                {/* Orders status count - 3 Cols */}
                <div className="bg-white border border-gray-150 rounded-xl p-5 md:col-span-3 text-left shadow-xs">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1.5 mb-4">
                    <span>Parcels Status Ledger</span>
                  </h4>

                  <div className="space-y-3 font-semibold text-xs text-slate-500">
                    {Object.entries(metrics.statusCounts || {}).map(([state, count]) => (
                      <div key={state} className="flex justify-between items-center bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                        <span>{state}</span>
                        <span className="font-black text-slate-800 font-mono text-xs">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div className="text-center py-10 bg-white border border-gray-100 rounded-xl text-xs text-slate-400 italic">No business turnover recorded.</div>
          )}
        </div>
      )}

      {/* -------------------- 2. SMART EXPIRY AUDITING TAB -------------------- */}
      {activeTab === "audit" && (
        <div className="space-y-4 text-left">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Edible Batch Expiration Ledger</h3>
              <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
                Evaluates active batches scheduled to expire in less than 30 days. Higher Expiry Risk Factor values demand immediate price reductions to clear.
              </p>
            </div>
            
            <button
              onClick={fetchExpiryAudit}
              className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-lg transition-all border border-slate-200 cursor-pointer"
              id="refresh-audit-btn"
            >
              Auditors Re-Audit
            </button>
          </div>

          {loadingAudit ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
              <RefreshCw className="w-7 h-7 text-green-600 animate-spin" />
              <p className="text-xs font-semibold text-gray-400">Recomputing risk coefficients...</p>
            </div>
          ) : auditItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-150 p-5">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-500 text-sm">Pruned Shelves Clean!</div>
              <p className="text-gray-400 text-xs text-center max-w-sm mx-auto mt-1">
                Zero products have edible batches scheduled to expire in under 30 days. High warehouse shelf efficiency score.
              </p>
            </div>
          ) : (
            <div className="border border-gray-150 rounded-xl overflow-hidden bg-white shadow-xs">
              <table className="min-w-full divide-y divide-gray-150" id="audit-table">
                <thead className="bg-[#f9fafb]">
                  <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    <th scope="col" className="px-4 py-3">Gross Item Name</th>
                    <th scope="col" className="px-4 py-3">Deptartment</th>
                    <th scope="col" className="px-4 py-3 text-center">Batch ID</th>
                    <th scope="col" className="px-4 py-3 text-center">Remaining Quantity</th>
                    <th scope="col" className="px-4 py-3 text-center">Edible Expiry Date</th>
                    <th scope="col" className="px-4 py-3 text-center">Days left</th>
                    <th scope="col" className="px-4 py-3 text-center">Calculated ERF</th>
                    <th scope="col" className="px-4 py-3 text-right">Clearance Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100 text-xs font-medium text-slate-600 font-mono">
                  {auditItems.map((item, idx) => {
                    const risk = getErfColor(item.expiryRiskFactor);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3.5 text-left font-sans font-bold text-slate-800">{item.productName}</td>
                        <td className="px-4 py-3.5 text-left font-sans">{item.category}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-500">#{item.batchNumber}</td>
                        <td className="px-4 py-3.5 text-center font-extrabold text-slate-700">{item.quantity} units</td>
                        <td className="px-4 py-3.5 text-center">{item.expiryDate}</td>
                        <td className="px-4 py-3.5 text-center font-bold text-slate-700">{item.daysRemaining} days</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`px-2 py-0.5 rounded-md border text-[10px] ${risk.bg}`}>
                            {item.expiryRiskFactor} ({risk.text})
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-sans">
                          <button
                            onClick={() =>
                              setDiscountModal({
                                open: true,
                                productId: item.productId,
                                name: item.productName,
                              })
                            }
                            className="bg-red-50 hover:bg-red-500 hover:text-white border border-red-200 text-red-600 text-[10px] font-extrabold px-2 py-1 rounded transition-colors cursor-pointer"
                            id={`clear-discount-btn-${item.productId}`}
                          >
                            Set Discount
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* -------------------- 3. ADD / PROVISION NEW GROCERY CATALOG TAB -------------------- */}
      {activeTab === "add_product" && (
        <form onSubmit={handleCreateProductSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-8 text-left bg-white border border-gray-150 rounded-2xl p-6 shadow-sm">
          
          {/* Main Item details - Left 7 Cols */}
          <div className="md:col-span-7 space-y-5">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <ClipboardList className="w-4 h-4 text-green-600" />
              <span>Core Produce Attributes</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Item Name / Produce Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Crisp Fuji Apples, Sourdough Loaf"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                  id="new-title-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Store Department Category</label>
                <select
                  required
                  value={newCategory}
                  onChange={(e: any) => setNewCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500 focus:bg-white transition-all cursor-pointer"
                  id="new-category-select"
                >
                  <option value="Produce">Produce</option>
                  <option value="Dairy & Eggs">Dairy & Eggs</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Meat & Seafood">Meat & Seafood</option>
                  <option value="Pantry Staples">Pantry Staples</option>
                  <option value="Frozen Foods">Frozen Foods</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase">Item Description</label>
              <textarea
                required
                rows={3}
                placeholder="Give consumers notes about taste, marblings, wheat source, pastures, etc."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500 focus:bg-white transition-all resize-none"
                id="new-description-textarea"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Measurement Unit</label>
                <select
                  required
                  value={newUnit}
                  onChange={(e: any) => setNewUnit(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-green-500 focus:bg-white transition-all cursor-pointer"
                  id="new-unit-select"
                >
                  <option value="pcs">Pieces (pcs)</option>
                  <option value="kg">Kilograms (kg)</option>
                  <option value="g">Grams (g)</option>
                  <option value="L">Liters (L)</option>
                  <option value="ml">Milliliters (ml)</option>
                  <option value="pack">Pack / Box</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Base Unit Price (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="e.g. 3.49"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                  id="new-price-input"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase">Starting Discount (%)</label>
                <input
                  type="number"
                  placeholder="e.g. 10 (optional)"
                  value={newDiscount}
                  onChange={(e) => setNewDiscount(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-green-500 focus:bg-white transition-all"
                  id="new-discount-input"
                />
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs px-6 py-3 rounded-lg cursor-pointer transition-all border-0 shadow-sm flex items-center justify-center gap-1.5"
                id="submit-product-btn"
              >
                <span>Provision Product to Catalog</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Batch Codes builder - Right 5 Cols */}
          <div className="md:col-span-5 bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 leading-none">
              <Calendar className="w-4 h-4 text-green-600" />
              <span>Batch FEFO Ingest Code</span>
            </h3>

            <div className="space-y-3 p-3 bg-white border border-slate-200/50 rounded-lg">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Batch Code</span>
                  <input
                    type="text"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                    id="batch-code-input"
                  />
                </div>

                <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Quantity Ingest</span>
                  <input
                    type="number"
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold focus:outline-none"
                    id="batch-qty-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Mfg Date</span>
                  <input
                    type="date"
                    value={batchMfgDate}
                    onChange={(e) => setBatchMfgDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold focus:outline-none focus:bg-white cursor-pointer"
                    id="batch-mfg-input"
                  />
                </div>

                <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500">
                  <span className="text-[9px] font-black text-slate-400 uppercase">Expiration Date</span>
                  <input
                    type="date"
                    value={batchExpDate}
                    onChange={(e) => setBatchExpDate(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px] font-bold focus:outline-none focus:bg-white cursor-pointer"
                    id="batch-exp-input"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddBatchToForm}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2 rounded font-bold cursor-pointer transition-colors border-0"
                id="add-batch-btn"
              >
                Ingest Shelf Batch
              </button>
            </div>

            {/* List of staged batches */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block leading-none">Staged Ingest Batches ({batchesList.length})</span>
              
              <div className="space-y-1.5 max-h-[150px] overflow-y-auto" id="payload-batches-shelf-list">
                {batchesList.length === 0 ? (
                  <span className="text-xs text-slate-400 italic block py-4 text-center">Batch shelf listing empty. Build at least one batch above.</span>
                ) : (
                  batchesList.map((b, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white border border-slate-150 rounded px-3 py-1.5 text-xs font-mono font-semibold text-slate-600">
                      <div className="text-left font-mono">
                        <div className="font-bold text-slate-800 text-[11px]">#{b.batchNumber}</div>
                        <div className="text-[9px] text-slate-400">Exp: {b.expiryDate} | Qty: {b.quantity}</div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeBatchFromForm(idx)}
                        className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded cursor-pointer border-0 bg-transparent"
                        title="Remove batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            
          </div>
        </form>
      )}

      {/* -------------------- DYNAMIC MODAL DISCOUNT DIALOG -------------------- */}
      {discountModal && discountModal.open && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fade">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-left shadow-xl space-y-4 relative border border-slate-100">
            <div>
              <span className="text-[10px] font-black text-red-600 uppercase tracking-wider flex items-center gap-1">
                <Percent className="w-3.5 h-3.5" />
                <span>Auto Clearance Action</span>
              </span>
              <h3 className="text-base font-bold text-slate-800 mt-1">Clearance Price Reduction: {discountModal.name}</h3>
              <p className="text-xs text-slate-400 leading-normal mt-1.5">
                Set an intense discount rate to clear expiring stock immediately. The new unit cost will propagates globally to customer carts instantly on submission.
              </p>
            </div>

            <div className="flex flex-col gap-1.5 bg-slate-50 rounded-xl p-4 border border-slate-150">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Set Product Discount %</label>
              
              <div className="flex items-center gap-1.5">
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(parseInt(e.target.value))}
                  className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 focus:outline-none"
                  id="discount-range-slider"
                />
                <span className="font-mono text-sm font-black text-slate-800 w-12 text-right">{discountPercent}%</span>
              </div>

              <div className="flex justify-between font-bold text-[9px] text-slate-400 mt-1 uppercase">
                <span>5% Min Clearance</span>
                <span>95% Max Discount</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setDiscountModal(null)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors border-0"
                id="discount-cancel-btn"
              >
                Keep Default
              </button>
              <button
                onClick={handleApplyClearanceDiscount}
                className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-5 py-2 rounded-lg cursor-pointer transition-all border-0 shadow-xs"
                id="discount-confirm-btn"
              >
                Promote Discount Clear
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default AdminInventory;

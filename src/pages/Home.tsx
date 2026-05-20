import React, { useState, useEffect } from "react";
import { Search, SlidersHorizontal, RefreshCw, AlertCircle, Sparkles } from "lucide-react";
import { useApp } from "../contexts/AppContext.tsx";
import { Product } from "../types.ts";
import { ProductCard } from "../components/ProductCard.tsx";

export const Home: React.FC = () => {
  const { catalogRefetchToken, showNotification } = useApp();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search, filter, sorting controls state
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("recent");
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const categories = ["All", "Produce", "Dairy & Eggs", "Bakery", "Meat & Seafood", "Pantry Staples", "Frozen Foods"];

  // Fetch products from server matching constraints
  const fetchProducts = async () => {
    setLoading(true);
    try {
      let queryUrl = `/api/products?page=1&limit=50`;

      if (searchTerm) queryUrl += `&search=${encodeURIComponent(searchTerm)}`;
      if (selectedCategory && selectedCategory !== "All") queryUrl += `&category=${encodeURIComponent(selectedCategory)}`;
      if (minPrice) queryUrl += `&minPrice=${minPrice}`;
      if (maxPrice) queryUrl += `&maxPrice=${maxPrice}`;

      if (sortBy === "price_asc") {
        queryUrl += `&sortBy=price&order=asc`;
      } else if (sortBy === "price_desc") {
        queryUrl += `&sortBy=price&order=desc`;
      } else if (sortBy === "discount") {
        queryUrl += `&sortBy=discount&order=desc`;
      } else if (sortBy === "stock") {
        queryUrl += `&sortBy=stock&order=desc`;
      }

      const res = await fetch(queryUrl);
      const output = await res.json();

      if (output.success) {
        setProducts(output.data);
        setError(null);
      } else {
        setError(output.message || "Failed to load catalog products.");
      }
    } catch (err: any) {
      console.error("Home fetch error:", err);
      setError("Unable to connect to service registry.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger loading when filters, searching, or live inventory updates change
  useEffect(() => {
    // Debounce search a little
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm, selectedCategory, sortBy, minPrice, maxPrice, catalogRefetchToken]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("All");
    setSortBy("recent");
    setMinPrice("");
    setMaxPrice("");
    showNotification("Reset all filters to defaults.");
  };

  return (
    <div className="space-y-6">
      {/* Banner segment in Natural Tones design language */}
      <div className="relative rounded-3xl bg-green-100 border border-green-200/60 p-8 sm:p-12 overflow-hidden flex flex-col md:flex-row justify-between items-center gap-8 mb-4">
        <div className="relative z-10 max-w-xl text-center md:text-left">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-green-700 border border-green-200/50 text-xs font-bold tracking-wide uppercase shadow-xs mb-6">
            <Sparkles className="w-3.5 h-3.5 text-green-600" />
            <span>Smart Shelf-Life Operations</span>
          </span>
          <h1 className="text-3.5xl sm:text-4.5xl font-serif font-black text-slate-800 tracking-tight leading-tight mb-4">
            Freshly Sourced Groceries,<br />Delivered in Real-Time.
          </h1>
          <p className="text-base text-slate-700 font-medium leading-relaxed">
            Browse our hand-selected local items. Observe batch stock levels, expiry indicators, and automated clearance discounts dynamically adjustments as orders are placed and delivered.
          </p>
        </div>
        <div className="text-8xl select-none animate-pulse transition-transform duration-1000 hidden md:block">
          🥑
        </div>
      </div>

      {/* Control ribbon */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-xs p-4 space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-grow">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-4.5 h-4.5" />
            <input
              type="text"
              placeholder="Search crisp apples, sourdough, ribeye, premium whole milk..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-10 pr-4 py-2.5 text-sm font-medium text-gray-700 placeholder-gray-400 focus:outline-none focus:border-green-500 focus:bg-white transition-all"
              id="search-input"
            />
          </div>

          {/* Sorter */}
          <div className="flex gap-2 min-w-[180px]">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:border-green-500 transition-all cursor-pointer"
              id="sort-select"
            >
              <option value="recent">Sort: New Listings</option>
              <option value="price_asc">Sort: Price: Low to High</option>
              <option value="price_desc">Sort: Price: High to Low</option>
              <option value="discount">Sort: High Discounts</option>
              <option value="stock">Sort: Heavy Stock Quantities</option>
            </select>
          </div>
        </div>

        {/* Categories Ribbon bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-50">
          <span className="text-xs font-bold text-gray-400 mr-2 flex items-center gap-1 uppercase">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Departments:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                selectedCategory === cat
                  ? "bg-green-600 text-white border-green-600 shadow-xs"
                  : "bg-white text-gray-500 border-gray-200 hover:text-gray-800 hover:bg-gray-50"
              }`}
              id={`cat-btn-${cat.replace(/\s+/g, "-")}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Pricing Boundaries and Resets */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase">Net Price Bounds (₹):</span>
            <input
              type="number"
              placeholder="Min Price"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-24 bg-gray-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-green-500"
              id="min-price-input"
            />
            <span className="text-gray-300">-</span>
            <input
              type="number"
              placeholder="Max Price"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-24 bg-gray-50 border border-slate-200 rounded px-2 py-1 text-xs font-semibold focus:outline-none focus:border-green-500"
              id="max-price-input"
            />
          </div>

          <button
            onClick={handleClearFilters}
            className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors bg-transparent border-0 cursor-pointer flex items-center gap-1"
            id="clear-filters-btn"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset Selections</span>
          </button>
        </div>
      </div>

      {/* Grid Display Catalog */}
      {loading && products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
          <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
          <p className="text-sm font-semibold text-gray-400">Updating active store catalogs...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl border border-red-100 text-red-600 max-w-md mx-auto my-10">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-semibold">{error}</span>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-700 mb-1 leading-tight">No Products Found</h3>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Try adjusting your department category filter, prices bounds, or search words to reveal stock.
          </p>
          <button
            onClick={handleClearFilters}
            className="mt-4 bg-green-50 text-green-700 font-bold text-xs px-4 py-2 border border-green-200 rounded-lg hover:bg-green-100 transition-all cursor-pointer"
            id="notfound-reset-btn"
          >
            Clear Selected Parameters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" id="product-grid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
export default Home;

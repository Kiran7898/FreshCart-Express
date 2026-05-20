import { Request, Response } from "express";
import { dbStore, Product, Batch } from "../config/db.ts";

// Utility to calculate Expiry Risk Factor (ERF)
export const calculateERF = (quantity: number, expiryDateStr: string): { daysRemaining: number; erf: number } => {
  const today = new Date();
  const expiry = new Date(expiryDateStr);
  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  const erf = parseFloat((quantity / daysRemaining).toFixed(2));
  return { daysRemaining, erf };
};

// 1. Browse & filter products with pagination, search, category, pricing limits, sorting
export const getProducts = async (req: Request, res: Response) => {
  try {
    const { search, category, minPrice, maxPrice, sortBy, order, page = "1", limit = "12" } = req.query;

    let products = dbStore.getProducts();

    // Word search filtering
    if (search) {
      const kw = String(search).toLowerCase();
      products = products.filter(
        (p) =>
          p.title.toLowerCase().includes(kw) ||
          p.description.toLowerCase().includes(kw)
      );
    }

    // Category filtering
    if (category && category !== "All") {
      products = products.filter((p) => p.category === category);
    }

    // Dynamic price calculation helper (net price after discount)
    const getNetPrice = (p: Product) => {
      return p.basePrice * (1 - p.discountPercentage / 100);
    };

    // Pricing range filter
    if (minPrice) {
      products = products.filter((p) => getNetPrice(p) >= parseFloat(String(minPrice)));
    }
    if (maxPrice) {
      products = products.filter((p) => getNetPrice(p) <= parseFloat(String(maxPrice)));
    }

    // Sorting options: price, discount, title, stock, createdAt
    if (sortBy) {
      const isAsc = order === "asc" ? 1 : -1;
      products.sort((a, b) => {
        if (sortBy === "price") {
          return (getNetPrice(a) - getNetPrice(b)) * isAsc;
        } else if (sortBy === "discount") {
          return (a.discountPercentage - b.discountPercentage) * isAsc;
        } else if (sortBy === "stock") {
          return (a.totalStock - b.totalStock) * isAsc;
        } else {
          // Default by title
          return a.title.localeCompare(b.title) * isAsc;
        }
      });
    } else {
      // Default: sort latest products first
      products.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    // Server-side Pagination
    const pageNum = parseInt(String(page)) || 1;
    const limitNum = parseInt(String(limit)) || 12;
    const totalItems = products.length;
    const totalPages = Math.ceil(totalItems / limitNum);
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = products.slice(startIndex, startIndex + limitNum);

    res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalItems,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Server error fetching list of products" });
  }
};

// 2. Fetch unique product information
export const getProductById = async (req: Request, res: Response) => {
  try {
    const products = dbStore.getProducts();
    const product = products.find((p) => p.id === req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: "Server error retrieving product details" });
  }
};

// 3. Admin: Create product with batches
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { title, description, category, unit, basePrice, discountPercentage, batches } = req.body;

    if (!title || !description || !category || !unit || isNaN(basePrice)) {
      res.status(400).json({ message: "Please enter all standard fields (title, description, category, unit, basePrice)" });
      return;
    }

    const sanitizedBatches = Array.isArray(batches)
      ? batches.map((b: any) => ({
          batchNumber: String(b.batchNumber || "BAT-" + Math.random().toString(36).substr(2, 6).toUpperCase()),
          manufacturedDate: String(b.manufacturedDate || new Date().toISOString().split("T")[0]),
          expiryDate: String(b.expiryDate),
          quantity: Math.max(0, parseInt(b.quantity) || 0),
        }))
      : [];

    const newProduct: Product = {
      id: "p-" + Math.random().toString(36).substr(2, 9),
      title,
      description,
      category,
      unit,
      basePrice: parseFloat(basePrice),
      discountPercentage: Math.max(0, parseFloat(discountPercentage) || 0),
      batches: sanitizedBatches,
      totalStock: 0, // Calculated dynamically by dbStore.saveProduct
      isAvailable: true,
      createdAt: new Date().toISOString(),
    };

    dbStore.saveProduct(newProduct);

    // Call any global Socket.IO updater if assigned in app (we will trigger via req.app.get("io"))
    const io = req.app.get("io");
    if (io) {
      io.emit("inventoryUpdate", { productId: newProduct.id, totalStock: newProduct.totalStock });
    }

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ message: "Server error creating product" });
  }
};

// 4. Admin: Update product fields and batches
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const products = dbStore.getProducts();
    const product = products.find((p) => p.id === req.params.id);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    const { title, description, category, unit, basePrice, discountPercentage, batches } = req.body;

    if (title !== undefined) product.title = title;
    if (description !== undefined) product.description = description;
    if (category !== undefined) product.category = category;
    if (unit !== undefined) product.unit = unit;
    if (basePrice !== undefined) product.basePrice = parseFloat(basePrice);
    if (discountPercentage !== undefined) product.discountPercentage = parseFloat(discountPercentage);
    if (batches !== undefined && Array.isArray(batches)) {
      product.batches = batches.map((b: any) => ({
        batchNumber: String(b.batchNumber),
        manufacturedDate: String(b.manufacturedDate),
        expiryDate: String(b.expiryDate),
        quantity: Math.max(0, parseInt(b.quantity) || 0),
      }));
    }

    dbStore.saveProduct(product);

    // Emit live inventory updates
    const io = req.app.get("io");
    if (io) {
      io.emit("inventoryUpdate", { productId: product.id, totalStock: product.totalStock });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({ message: "Server error updating product" });
  }
};

// 5. Admin: Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const success = dbStore.deleteProduct(req.params.id);
    if (!success) {
      res.status(404).json({ message: "Product not found or already deleted" });
      return;
    }

    const io = req.app.get("io");
    if (io) {
      io.emit("inventoryUpdate", { productId: req.params.id, totalStock: 0, deleted: true });
    }

    res.json({ success: true, message: "Product deleted from database successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error deleting product" });
  }
};

// 6. Admin Inventory Audit (Filtering batches expiring within 30 days and sorting by Expiry Risk Factor)
export const getExpiryAudit = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);

    const products = dbStore.getProducts();
    const auditResults: any[] = [];

    products.forEach((product) => {
      product.batches.forEach((batch) => {
        const expiryDate = new Date(batch.expiryDate);

        // Evaluate active batches expiring soon with active stock remaining
        if (expiryDate <= thirtyDaysFromNow && batch.quantity > 0) {
          const { daysRemaining, erf } = calculateERF(batch.quantity, batch.expiryDate);

          auditResults.push({
            productId: product.id,
            productName: product.title,
            category: product.category,
            basePrice: product.basePrice,
            discountPercentage: product.discountPercentage,
            batchNumber: batch.batchNumber,
            quantity: batch.quantity,
            expiryDate: batch.expiryDate,
            daysRemaining,
            expiryRiskFactor: erf, // Higher ERF is high Risk (sell immediately!)
          });
        }
      });
    });

    // Sort audit results by calculated Expiry Risk Factor in descending order
    auditResults.sort((a, b) => b.expiryRiskFactor - a.expiryRiskFactor);

    res.json({
      success: true,
      count: auditResults.length,
      data: auditResults,
    });
  } catch (error) {
    console.error("Expiry Audit Error:", error);
    res.status(500).json({ message: "Server error running inventory audit" });
  }
};

// 7. Admin Quick Clearance Discount: apply automated/set discount rate to clear expiring stock
export const applyExpiryDiscount = async (req: Request, res: Response) => {
  try {
    const { productId, discountPercentage } = req.body;

    if (!productId || isNaN(discountPercentage)) {
      res.status(400).json({ message: "Required inputs missing: productId, discountPercentage" });
      return;
    }

    const products = dbStore.getProducts();
    const product = products.find((p) => p.id === productId);

    if (!product) {
      res.status(404).json({ message: "Product not found" });
      return;
    }

    product.discountPercentage = parseFloat(discountPercentage);
    dbStore.saveProduct(product);

    // Emit change notifications to active shoppers
    const io = req.app.get("io");
    if (io) {
      io.emit("inventoryUpdate", { productId: product.id, totalStock: product.totalStock });
    }

    res.json({
      success: true,
      message: `Successfully applied clearance discount of ${discountPercentage}% to ${product.title}`,
      data: product,
    });
  } catch (error) {
    res.status(500).json({ message: "Server failed to initiate target discount" });
  }
};

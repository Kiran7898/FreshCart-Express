import { dbStore } from "../config/db.js";

// 1. Customer Checkout (FEFO - First Expired, First Out Stock Allocation)
export const createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress } = req.body; // items = [{ productId, quantity }]

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ message: "Cart cannot be empty for checkout" });
      return;
    }

    if (!deliveryAddress) {
      res.status(400).json({ message: "Please provide a delivery address" });
      return;
    }

    const products = dbStore.getProducts();
    const orderItems = [];
    let totalPrice = 0;

    // We keep a temporary log of edits we need to make to the products
    // to avoid partial stock deduction if checkout fails halfway.
    const productUpdates = [];

    // First Pass: Validate stock availability and calculate prices
    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) {
        res.status(404).json({ message: `Grocery product not found: ID ${item.productId}` });
        return;
      }

      if (prod.totalStock < item.quantity) {
        res.status(400).json({
          message: `Insufficient stock for '${prod.title}'. Available: ${prod.totalStock} ${prod.unit}, requested: ${item.quantity}`,
        });
        return;
      }

      productUpdates.push({ product: prod, quantityRequested: item.quantity });
    }

    // Second Pass: Deduce stock using FEFO (First-Expired, First-Out)
    for (const update of productUpdates) {
      const prod = update.product;
      let needed = update.quantityRequested;

      // Sort batches: oldest expiration date first (active batches)
      // Filter out non-expired, positive-quantity batches if needed, but since we are seeding valid ones,
      // we sort all positive quantity batches by expiryDate ascending
      const sortedBatches = [...prod.batches]
        .filter((b) => b.quantity > 0)
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

      for (const batch of sortedBatches) {
        if (needed <= 0) break;

        const originalBatch = prod.batches.find((b) => b.batchNumber === batch.batchNumber);
        if (!originalBatch) continue;

        if (originalBatch.quantity >= needed) {
          originalBatch.quantity -= needed;
          needed = 0;
        } else {
          needed -= originalBatch.quantity;
          originalBatch.quantity = 0;
        }
      }

      // Re-save product (triggers recalculations for totalStock and availability)
      dbStore.saveProduct(prod);

      // Add to checkout list
      const finalPrice = Math.round(prod.basePrice * (1 - prod.discountPercentage / 100) * 100) / 100;
      orderItems.push({
        productId: prod.id,
        title: prod.title,
        unit: prod.unit,
        quantity: update.quantityRequested,
        price: finalPrice,
      });

      totalPrice += finalPrice * update.quantityRequested;
    }

    totalPrice = Math.round(totalPrice * 100) / 100;

    const newOrder = {
      id: "ORD-" + Math.floor(10000 + Math.random() * 90000), // Standard 5-digit order identifier
      customerId: req.user.id,
      customerName: req.user.name,
      items: orderItems,
      totalPrice,
      deliveryAddress,
      status: "Pending",
      logs: [{ status: "Pending", timestamp: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
      location: { lat: 12.9784 + (Math.random() - 0.5) * 0.01, lng: 77.6408 + (Math.random() - 0.5) * 0.01 }, // random Bengaluru address offset
    };

    dbStore.saveOrder(newOrder);

    // Emit live inventory update on WS
    const io = req.app.get("io");
    if (io) {
      // Broadcast to everyone that stock amounts changed
      products.forEach((p) => {
        io.emit("inventoryUpdate", { productId: p.id, totalStock: p.totalStock });
      });
      // Notify admin about orders count
      io.emit("orderCreated", newOrder);
    }

    res.status(201).json({ success: true, data: newOrder });
  } catch (error) {
    console.error("Checkout order error:", error);
    res.status(500).json({ message: "Server error finalizing order checkout" });
  }
};

// 2. Fetch Orders (Role-based isolation)
export const getOrders = async (req, res) => {
  try {
    const role = req.user.role;
    const orders = dbStore.getOrders();

    if (role === "customer") {
      // Customers look at their own active placements
      const userOrders = orders.filter((o) => o.customerId === req.user.id);
      res.json({ success: true, data: userOrders });
      return;
    }

    if (role === "partner") {
      // Delivery partners look at:
      // - Orders claimed by them
      // - Pending/Packed/Shipped orders that they can claim
      const partnerOrders = orders.filter(
        (o) =>
          o.deliveryPartnerId === req.user.id ||
          ["Packed", "Shipped"].includes(o.status)
      );
      res.json({ success: true, data: partnerOrders });
      return;
    }

    if (role === "admin") {
      // Admins look at all telemetry
      res.json({ success: true, data: orders });
      return;
    }

    res.status(403).json({ message: "Invalid system role" });
  } catch (error) {
    res.status(500).json({ message: "Server error loading orders" });
  }
};

// 3. Delivery Partner: Claim Order Cargo
export const claimOrder = async (req, res) => {
  try {
    const orders = dbStore.getOrders();
    const order = orders.find((o) => o.id === req.params.orderId);

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    if (order.deliveryPartnerId) {
      res.status(400).json({ message: "Order claimed by another delivery partner." });
      return;
    }

    if (!["Packed", "Shipped"].includes(order.status)) {
      res.status(400).json({ message: "Only orders marked as Packed or Shipped can be claimed" });
      return;
    }

    order.deliveryPartnerId = req.user.id;
    order.deliveryPartnerName = req.user.name;
    order.status = "Shipped"; // Promoted to Shipped upon partner claim
    order.logs.push({ status: "Shipped", timestamp: new Date().toISOString() });

    dbStore.saveOrder(order);

    const io = req.app.get("io");
    if (io) {
      // Direct room broadcast to waiting customer
      io.to(order.id).emit("orderStatusChanged", {
        orderId: order.id,
        status: "Shipped",
        location: order.location,
        updatedAt: new Date().toISOString(),
      });
      // Synchronize overall dashboard timelines
      io.emit("globalOrderUpdate", order);
    }

    res.json({ success: true, message: "Order claimed has been registered successfully", data: order });
  } catch (error) {
    res.status(500).json({ message: "Server error claiming delivery order" });
  }
};

// 4. Update Order Progress (packed -> shipped -> out for delivery -> delivered)
export const updateOrderStatus = async (req, res) => {
  try {
    const { status, lat, lng } = req.body;
    const orders = dbStore.getOrders();
    const order = orders.find((o) => o.id === req.params.orderId);

    if (!order) {
      res.status(404).json({ message: "Order not found" });
      return;
    }

    // Role verification guards: Customers cannot change status
    const role = req.user.role;
    if (role === "customer") {
      res.status(403).json({ message: "Customers cannot change order shipment statuses" });
      return;
    }

    // If partner, verify they claimed this order, or allow admins to modify
    if (role === "partner" && order.deliveryPartnerId !== req.user.id) {
      // If order is unassigned, allowed to claim first. If claimed by someone else, block.
      if (order.deliveryPartnerId) {
        res.status(403).json({ message: "Cannot edit an order assigned to a separate delivery agent" });
        return;
      }
    }

    order.status = status;
    order.logs.push({ status, timestamp: new Date().toISOString() });

    if (lat !== undefined && lng !== undefined) {
      order.location = { lat: parseFloat(lat), lng: parseFloat(lng) };
    }

    dbStore.saveOrder(order);

    const io = req.app.get("io");
    if (io) {
      // Broadcast to matching order room so waiting customer gets real-time notification
      io.to(order.id).emit("orderStatusChanged", {
        orderId: order.id,
        status,
        location: order.location,
        updatedAt: new Date().toISOString(),
      });

      // Synchronize dashboard panels
      io.emit("globalOrderUpdate", order);
    }

    res.json({ success: true, message: "Order status modified successfully", data: order });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({ message: "Server error writing status transaction" });
  }
};

// 5. Admin Panel Stats & Analytics
export const getAdminMetrics = async (req, res) => {
  try {
    const orders = dbStore.getOrders();
    const products = dbStore.getProducts();
    const users = dbStore.getUsers();

    const totalSales = orders
      .filter((o) => o.status === "Delivered")
      .reduce((sum, o) => sum + o.totalPrice, 0);

    const activeUsers = users.length;
    const ordersCount = orders.length;

    // Top-selling products calculator
    const productSalesMap = {};
    orders.forEach((o) => {
      o.items.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { title: item.title, quantity: 0, sales: 0 };
        }
        productSalesMap[item.productId].quantity += item.quantity;
        productSalesMap[item.productId].sales += item.price * item.quantity;
      });
    });

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Sales by Category
    const categorySalesMap = {};
    products.forEach((p) => {
      categorySalesMap[p.category] = 0;
    });

    orders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod ? prod.category : "Others";
        if (!categorySalesMap[cat]) categorySalesMap[cat] = 0;
        categorySalesMap[cat] += item.price * item.quantity;
      });
    });

    const categoriesList = Object.entries(categorySalesMap).map(([name, sales]) => ({
      name,
      sales: Math.round(sales * 100) / 100,
    }));

    // Orders status distribution
    const statusCounts = {
      Pending: orders.filter((o) => o.status === "Pending").length,
      Packed: orders.filter((o) => o.status === "Packed").length,
      Shipped: orders.filter((o) => o.status === "Shipped").length,
      "Out for Delivery": orders.filter((o) => o.status === "Out for Delivery").length,
      Delivered: orders.filter((o) => o.status === "Delivered").length,
    };

    res.json({
      success: true,
      metrics: {
        totalSales: Math.round(totalSales * 100) / 100,
        activeUsers,
        ordersCount,
        topSellingProducts,
        categorySales: categoriesList,
        statusCounts,
      },
    });
  } catch (error) {
    console.error("Error retrieving admin stats:", error);
    res.status(500).json({ message: "Server error running business intelligence summary" });
  }
};

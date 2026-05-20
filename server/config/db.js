import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

const DATA_DIR = path.join(process.cwd(), "server", "data");
const STORE_FILE = path.join(DATA_DIR, "db_store.json");

const defaultStore = {
  users: [],
  products: [],
  orders: [],
};

class LocalDatabase {
  data = { ...defaultStore };

  constructor() {
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORE_FILE)) {
        const fileContent = fs.readFileSync(STORE_FILE, "utf-8");
        this.data = JSON.parse(fileContent);
      }

      let modified = false;

      // Seed Users if empty
      if (!this.data.users || this.data.users.length === 0) {
        console.log("Seeding default database users...");
        const salt = bcrypt.genSaltSync(10);
        const passwordHash = bcrypt.hashSync("password123", salt);

        this.data.users = [
          {
            id: "user-admin",
            name: "System Administrator",
            email: "admin@grocery.com",
            passwordHash,
            role: "admin",
            createdAt: new Date().toISOString(),
          },
          {
            id: "user-customer",
            name: "John Doe",
            email: "customer@grocery.com",
            passwordHash,
            role: "customer",
            createdAt: new Date().toISOString(),
          },
          {
            id: "user-partner",
            name: "Alex Rider",
            email: "partner@grocery.com",
            passwordHash,
            role: "partner",
            createdAt: new Date().toISOString(),
          },
        ];
        modified = true;
      }

      // Seed Products if empty
      if (!this.data.products || this.data.products.length === 0) {
        console.log("Seeding default grocery catalog with multi-batch expirations...");
        
        const makeDate = (daysOffset) => {
          const d = new Date();
          d.setDate(d.getDate() + daysOffset);
          return d.toISOString().split("T")[0]; // YYYY-MM-DD
        };

        this.data.products = [
          {
            id: "p1",
            title: "Crisp Fuji Apples",
            description: "Fresh premium Washington apples, handpicked and crisp.",
            category: "Produce",
            unit: "kg",
            basePrice: 2.99,
            discountPercentage: 10,
            batches: [
              {
                batchNumber: "BAT-APP-01",
                manufacturedDate: makeDate(-4),
                expiryDate: makeDate(5), // 5 days from now
                quantity: 25,
              },
              {
                batchNumber: "BAT-APP-02",
                manufacturedDate: makeDate(-1),
                expiryDate: makeDate(25), // 25 days from now
                quantity: 60,
              }
            ],
            totalStock: 85,
            isAvailable: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: "p2",
            title: "Organic Whole Milk",
            description: "100% pasture-raised whole milk, high-temp pasteurized.",
            category: "Dairy & Eggs",
            unit: "pcs",
            basePrice: 3.89,
            discountPercentage: 0,
            batches: [
              {
                batchNumber: "BAT-MIL-01",
                manufacturedDate: makeDate(-5),
                expiryDate: makeDate(2), // 2 days from now (high expiry risk!)
                quantity: 15,
              },
              {
                batchNumber: "BAT-MIL-02",
                manufacturedDate: makeDate(-1),
                expiryDate: makeDate(14), // 14 days from now
                quantity: 40,
              }
            ],
            totalStock: 55,
            isAvailable: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: "p3",
            title: "Fresh Sourdough Bread",
            description: "Classic bakery-fresh crusty sourdough sliced bread loaf.",
            category: "Bakery",
            unit: "pcs",
            basePrice: 4.50,
            discountPercentage: 20,
            batches: [
              {
                batchNumber: "BAT-ROU-01",
                manufacturedDate: makeDate(-2),
                expiryDate: makeDate(1), // 1 day from now
                quantity: 8,
              },
              {
                batchNumber: "BAT-ROU-02",
                manufacturedDate: makeDate(0),
                expiryDate: makeDate(6), // 6 days from now
                quantity: 15,
              }
            ],
            totalStock: 23,
            isAvailable: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: "p4",
            title: "Premium Ribeye Beef Steak",
            description: "USDA Prime grade marbling, juicy and tender cut.",
            category: "Meat & Seafood",
            unit: "kg",
            basePrice: 24.99,
            discountPercentage: 0,
            batches: [
              {
                batchNumber: "BAT-STE-01",
                manufacturedDate: makeDate(-3),
                expiryDate: makeDate(4), // 4 days from now
                quantity: 6,
              },
              {
                batchNumber: "BAT-STE-02",
                manufacturedDate: makeDate(-1),
                expiryDate: makeDate(11), // 11 days from now
                quantity: 14,
              }
            ],
            totalStock: 20,
            isAvailable: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: "p5",
            title: "Basmati Premium Rice",
            description: "Aromatic extra long grain aged Basmati rice.",
            category: "Pantry Staples",
            unit: "pack",
            basePrice: 12.99,
            discountPercentage: 5,
            batches: [
              {
                batchNumber: "BAT-RIC-01",
                manufacturedDate: makeDate(-30),
                expiryDate: makeDate(200), // Far expiry
                quantity: 100,
              }
            ],
            totalStock: 100,
            isAvailable: true,
            createdAt: new Date().toISOString(),
          },
          {
            id: "p6",
            title: "Organic Frozen Wild Berries",
            description: "Individually quick-frozen mix of sweet blueberries, blackberries, and raspberries.",
            category: "Frozen Foods",
            unit: "pack",
            basePrice: 6.49,
            discountPercentage: 15,
            batches: [
              {
                batchNumber: "BAT-FRZ-01",
                manufacturedDate: makeDate(-15),
                expiryDate: makeDate(120), // Far expiry
                quantity: 80,
              }
            ],
            totalStock: 80,
            isAvailable: true,
            createdAt: new Date().toISOString(),
          }
        ];
        modified = true;
      }

      // Seed Orders if empty
      if (!this.data.orders || this.data.orders.length === 0) {
        console.log("Seeding default completed and active grocery orders...");
        this.data.orders = [
          {
            id: "ORD-98231",
            customerId: "user-customer",
            customerName: "John Doe",
            items: [
              {
                productId: "p1",
                title: "Crisp Fuji Apples",
                unit: "kg",
                quantity: 2,
                price: 2.69,
              },
              {
                productId: "p2",
                title: "Organic Whole Milk",
                unit: "pcs",
                quantity: 1,
                price: 3.89,
              }
            ],
            totalPrice: 9.27,
            deliveryAddress: "Flat 302, Royal Residency, 12th Main Road, Indiranagar, Bengaluru - 560038",
            status: "Delivered",
            logs: [
              { status: "Pending", timestamp: new Date(Date.now() - 3600000 * 3).toISOString() },
              { status: "Packed", timestamp: new Date(Date.now() - 3600000 * 2.5).toISOString() },
              { status: "Shipped", timestamp: new Date(Date.now() - 3600000 * 2).toISOString() },
              { status: "Out for Delivery", timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString() },
              { status: "Delivered", timestamp: new Date(Date.now() - 3600000 * 1).toISOString() }
            ],
            createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
          },
          {
            id: "ORD-44910",
            customerId: "user-customer",
            customerName: "John Doe",
            items: [
              {
                productId: "p3",
                title: "Fresh Sourdough Bread",
                unit: "pcs",
                quantity: 1,
                price: 3.60,
              },
              {
                productId: "p4",
                title: "Premium Ribeye Beef Steak",
                unit: "kg",
                quantity: 1,
                price: 24.99,
              }
            ],
            totalPrice: 28.59,
            deliveryAddress: "Flat 302, Royal Residency, 12th Main Road, Indiranagar, Bengaluru - 560038",
            deliveryPartnerId: "user-partner",
            deliveryPartnerName: "Alex Rider",
            status: "Packed",
            logs: [
              { status: "Pending", timestamp: new Date(Date.now() - 1200000).toISOString() },
              { status: "Packed", timestamp: new Date(Date.now() - 60000).toISOString() }
            ],
            createdAt: new Date(Date.now() - 1200000).toISOString()
          }
        ];
        modified = true;
      }

      if (modified || !fs.existsSync(STORE_FILE)) {
        this.saveToDisk();
      }
    } catch (error) {
      console.error("Failed to initialize database:", error);
      this.data = { ...defaultStore };
    }
  }

  saveToDisk() {
    try {
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.data, null, 2), "utf-8");
    } catch (error) {
      console.error("Failed to write database to disk:", error);
    }
  }

  // --- Collection Queries & Mutators ---

  getUsers() {
    return this.data.users;
  }

  saveUser(user) {
    const existsIndex = this.data.users.findIndex((u) => u.id === user.id);
    if (existsIndex >= 0) {
      this.data.users[existsIndex] = user;
    } else {
      this.data.users.push(user);
    }
    this.saveToDisk();
  }

  getProducts() {
    return this.data.products;
  }

  saveProduct(product) {
    // Sync calculations
    product.totalStock = product.batches.reduce((sum, b) => sum + b.quantity, 0);
    product.isAvailable = product.totalStock > 0;

    const existsIndex = this.data.products.findIndex((p) => p.id === product.id);
    if (existsIndex >= 0) {
      this.data.products[existsIndex] = product;
    } else {
      this.data.products.push(product);
    }
    this.saveToDisk();
  }

  deleteProduct(productId) {
    const lenBefore = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== productId);
    this.saveToDisk();
    return this.data.products.length < lenBefore;
  }

  getOrders() {
    return this.data.orders;
  }

  saveOrder(order) {
    const existsIndex = this.data.orders.findIndex((o) => o.id === order.id);
    if (existsIndex >= 0) {
      this.data.orders[existsIndex] = order;
    } else {
      this.data.orders.push(order);
    }
    this.saveToDisk();
  }
}

export const dbStore = new LocalDatabase();

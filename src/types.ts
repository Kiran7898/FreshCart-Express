export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "partner" | "admin";
}

export interface Batch {
  batchNumber: string;
  manufacturedDate: string;
  expiryDate: string;
  quantity: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: "Produce" | "Dairy & Eggs" | "Bakery" | "Meat & Seafood" | "Pantry Staples" | "Frozen Foods";
  unit: "kg" | "g" | "L" | "ml" | "pcs" | "pack";
  basePrice: number;
  discountPercentage: number;
  batches: Batch[];
  totalStock: number;
  isAvailable: boolean;
  createdAt: string;
}

export interface OrderItem {
  productId: string;
  title: string;
  unit: string;
  quantity: number;
  price: number;
}

export interface OrderLog {
  status: string;
  timestamp: string;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  items: OrderItem[];
  totalPrice: number;
  deliveryAddress: string;
  deliveryPartnerId?: string;
  deliveryPartnerName?: string;
  status: "Pending" | "Packed" | "Shipped" | "Out for Delivery" | "Delivered";
  logs: OrderLog[];
  location?: { lat: number; lng: number };
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ExpiryAuditItem {
  productId: string;
  productName: string;
  category: string;
  batchNumber: string;
  quantity: number;
  expiryDate: string;
  daysRemaining: number;
  expiryRiskFactor: number;
}

export interface AdminMetrics {
  totalSales: number;
  activeUsers: number;
  ordersCount: number;
  topSellingProducts: Array<{ title: string; quantity: number; sales: number }>;
  categorySales: Array<{ name: string; sales: number }>;
  statusCounts: {
    Pending: number;
    Packed: number;
    Shipped: number;
    "Out for Delivery": number;
    Delivered: number;
  };
}

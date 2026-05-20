# FreshCart Express 🛒

**FreshCart Express** is a real-time, full-stack grocery checkout system and FEFO (First Expired, First Out) delivery tracker. Powered by a seamless integration of **React**, **Node.js/Express**, and **Socket.IO-based real-time coordination**, this application allows shoppers, administrators, and delivery partners to interact in a tightly coordinated logistics workspace.

---

## 🌟 Key Capabilities

### 1. 🛒 Shopper Experience (Customer Workspace)
*   **Fresh Grocery Catalog**: Browse available produce, dairy, bakery, meats, and pantry items with live stock updates.
*   **Intuitive Checkout**: Build baskets and define drop coordinates or physical addresses.
*   **Live Status Progress Bar (`OrderTracking.jsx`)**: Follow real-time deliveries through a 5-step progress tracker (*Pending* ➡️ *Packed* ➡️ *Shipped* ➡️ *Out for Delivery* ➡️ *Delivered*).
*   **Dynamic Logs Stream**: Socket.IO connects directly to the courier's route, piping live longitude/latitude shifts and status advancements straight into the shopper's viewport.

### 2. 🛡️ Backoffice Administrative Desk (`AdminInventory.jsx`)
*   **Analytics Dashboard**: Track key metrics in real time (Gross Complete Turnover, Active Shoppers, and Logistical Orders Book), visualized with beautiful, responsive SVG/CSS category distribution charts.
*   **Smart Expiry Auditing**: Automatically isolates perishable grocery batches expiring in under 30 days. Uses a calculated **Expiry Risk Factor (ERF)** to flag high-risk stock.
*   **FEFO Batch Provisions**: Create new catalog listings pre-packaged with distinct inventory codes, manufacturing histories, and expiration schedules.
*   **Targeted Clearance Discounts**: Instantly adjust and apply global percentage-based markdowns to clear critical-risk batches.

### 3. 🚲 Active Dispatch Courier Hub (`PartnerPanel.jsx`)
*   **Self-Assign Deliveries**: Couriers see unclaimed, freshly packed store parcels, claiming them for transit runs.
*   **Command Terminal Controls**: Toggle package state changes manually to trigger live consumer broadcasts.
*   **GPS Route Micro-Simulator**: While *Out for Delivery*, couriers can launch a simulated route. This program generates walking/riding paths, emitting live GPS coordinate telemetries across the WebSocket network back to the designated customer's dashboard tracker.

---

## 🏗️ Architecture & Technology Stack

The application is engineered as a robust, single-port full-stack layout:

*   **Frontend**: Built with **React 19**, **Vite**, **TypeScript**, and styled using high-contrast **Tailwind CSS**. Custom icons are sourced from `lucide-react`, and layout transitions leverage `motion/react`.
*   **Backend Services**: A lightweight **Express.js API** (built with NodeJS) handles secure endpoint requests.
*   **Real-time Communication**: Handshakes, room registrations, and position coordinate updates are synced bidirectionally via **Socket.IO** (utilizing native WebSockets and polling fallbacks).
*   **Database Schema**: A mock JSON file-based storage layer (`db_store.json`) persists customer baskets, administrative catalogs, order statuses, and time-stamped log feeds securely.

---

## 📁 Directory Blueprints

```text
├── server/
│   ├── config/          # Database configuration and connection scripts
│   ├── controllers/     # Express controllers (Auth, Products, Orders)
│   ├── data/            # Local JSON database (db_store.json)
│   ├── middleware/      # JSON Web Token (JWT) verification middleware
│   ├── routes/          # Express API endpoints
│   └── sockets/         # Socket.IO room logic and real-time updates
├── src/
│   ├── components/      # Reusable UI elements (Navbar, ProductCard)
│   ├── contexts/        # Core state engines (AppContext for authentication)
│   ├── pages/           # Screen views (Home, Cart, Auth, OrderTracking, PartnerPanel, AdminInventory)
│   ├── App.jsx          # Root page routes router
│   ├── index.css        # Tailwind config entry point
│   └── main.jsx         # Development rendering bootstrap
├── package.json         # Dependency manifest and esbuild bundlers
└── metadata.json        # Cloud frame authorizations and app parameters
```

---

## 🚀 Local Operations Guide

Follow these simple procedures to test or extend the application:

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   npm (pre-packaged with Node)

### Installation
1. Install project dependencies:
   ```bash
   npm install
   ```

2. Run the Node.js Express server in dev mode:
   ```bash
   npm run dev
   ```
   *The client-side single-page application and backend API will automatically bind to `http://localhost:3000` via our integrated Vite engine.*

### Building for Production
To bundle the frontend resources into high-performance static files and compile the backend services into CJS targets:
```bash
npm run build
```
Start the compiled build:
```bash
npm run start
```

---

## 🧪 Simulation Walkthrough
To experience the entire real-time lifecycle:
1.  **Open two browser sessions** (or one standard window and one private/incognito window).
2.  **Auth Page**: Choose the **Customer profile** on the first window, and the **Courier profile** on the second window.
3.  **Order Placement**: As the Customer, build your grocery basket in the *Products Catalog*, click checkout on the *Cart* page, and enter your destination.
4.  **Order Tracking**: Jump to the *Orders Tracking* tab as the Customer. You will see your order listed as *Pending*.
5.  **Claim & Transit**: In the Courier window, reload your dispatch console. Your order will appear under *Unassigned Warehouse Parcels*. Select **Self-Assign Parcel** to claim the cargo.
6.  **Progress Tracking**: Mark the order as *Shipped*, then progress it to *Out for Delivery*.
7.  **Live Dispatch Playback**: Select **Simulate Live Run** in the Courier hub. Watch the real-time fulfillment logs scroll automatically on the Customer window as simulated GPS coordinates stream across the WebSocket connection, concluding with a final *Delivered* flag!

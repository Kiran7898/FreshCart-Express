import express from "express";
import path from "path";
import { createServer as createHttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import dotenv from "dotenv";

// Load environment configurations
dotenv.config();

import authRoutes from "./server/routes/authRoutes.ts";
import productRoutes from "./server/routes/productRoutes.ts";
import orderRoutes from "./server/routes/orderRoutes.ts";
import registerSocketHandler from "./server/sockets/socketHandler.ts";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middlewares
  app.use(express.json());

  // Attach HTTP listener
  const httpServer = createHttpServer(app);

  // Initialize Socket.IO engine
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
    transports: ["websocket", "polling"],
  });

  // Expose Socket.IO client references as express properties for controllers
  app.set("io", io);

  // Handle handshakes and connections
  registerSocketHandler(io);

  // --- API Routes Setup ---
  app.use("/api/auth", authRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/orders", orderRoutes);

  // Health endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // --- Vite Frontend asset handling middleware ---
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Joined Vite development middleware layer.");
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving compiled production client assets.");
  }

  // Bind to 0.0.0.0 on standard port 3000
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`===================================================`);
    console.log(`🛒 GROCERY Marketplace engine is LIVE on Port ${PORT}`);
    console.log(`💻 Local Sandbox: http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

startServer().catch((error) => {
  console.error("Critical error starting the server:", error);
});

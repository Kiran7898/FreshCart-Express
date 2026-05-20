import { Router } from "express";
import {
  createOrder,
  getOrders,
  claimOrder,
  updateOrderStatus,
  getAdminMetrics,
} from "../controllers/orderController.ts";
import { protect, authorize } from "../middleware/authMiddleware.ts";

const router = Router();

// Protect all order paths
router.use(protect as any);

router.post("/", authorize("customer") as any, createOrder as any);
router.get("/", getOrders as any);
router.get("/metrics", authorize("admin") as any, getAdminMetrics as any);
router.put("/:orderId/claim", authorize("partner") as any, claimOrder as any);
router.put("/:orderId/status", updateOrderStatus as any);

export default router;

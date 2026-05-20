import { Router } from "express";
import {
  createOrder,
  getOrders,
  claimOrder,
  updateOrderStatus,
  getAdminMetrics,
} from "../controllers/orderController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

// Protect all order paths
router.use(protect);

router.post("/", authorize("customer"), createOrder);
router.get("/", getOrders);
router.get("/metrics", authorize("admin"), getAdminMetrics);
router.put("/:orderId/claim", authorize("partner"), claimOrder);
router.put("/:orderId/status", updateOrderStatus);

export default router;

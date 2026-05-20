import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getExpiryAudit,
  applyExpiryDiscount,
} from "../controllers/productController.ts";
import { protect, authorize } from "../middleware/authMiddleware.ts";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/detail/:id", getProductById); // Avoid clash with expiry-audit path

// Admin inventory audits
router.get("/expiry-audit", protect as any, authorize("admin") as any, getExpiryAudit as any);
router.post("/expiry-discount", protect as any, authorize("admin") as any, applyExpiryDiscount as any);

// Admin standard CRUD
router.post("/", protect as any, authorize("admin") as any, createProduct as any);
router.put("/:id", protect as any, authorize("admin") as any, updateProduct as any);
router.delete("/:id", protect as any, authorize("admin") as any, deleteProduct as any);

export default router;

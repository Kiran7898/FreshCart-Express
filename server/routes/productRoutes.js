import { Router } from "express";
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getExpiryAudit,
  applyExpiryDiscount,
} from "../controllers/productController.js";
import { protect, authorize } from "../middleware/authMiddleware.js";

const router = Router();

// Public routes
router.get("/", getProducts);
router.get("/detail/:id", getProductById); // Avoid clash with expiry-audit path

// Admin inventory audits
router.get("/expiry-audit", protect, authorize("admin"), getExpiryAudit);
router.post("/expiry-discount", protect, authorize("admin"), applyExpiryDiscount);

// Admin standard CRUD
router.post("/", protect, authorize("admin"), createProduct);
router.put("/:id", protect, authorize("admin"), updateProduct);
router.delete("/:id", protect, authorize("admin"), deleteProduct);

export default router;

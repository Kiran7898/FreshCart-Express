import { Router } from "express";
import { signup, signin, getProfile } from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/profile", protect, getProfile);

export default router;

import { Router } from "express";
import { signup, signin, getProfile } from "../controllers/authController.ts";
import { protect } from "../middleware/authMiddleware.ts";

const router = Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/profile", protect as any, getProfile as any);

export default router;

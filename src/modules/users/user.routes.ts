import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  getMe,
  updateMe,
  changeUserPassword,
  search,
} from "./user.controller.js";

const router = Router();

router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);
router.put("/change-password", authenticate, changeUserPassword);
router.get("/search", authenticate, search);

export default router;

import { Router } from "express";
import {
    register,
    login,
    getMe,
    forgotPassword,
    resetPassword,
} from "./auth.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticate, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
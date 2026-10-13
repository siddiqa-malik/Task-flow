import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { get, update } from "./userSettings.controller.js";

const router = Router();

router.get("/", authenticate, get);
router.patch("/", authenticate, update);

export default router;

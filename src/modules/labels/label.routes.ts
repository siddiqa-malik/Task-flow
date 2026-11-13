import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getAll, create, update, remove } from "./label.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getAll);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;

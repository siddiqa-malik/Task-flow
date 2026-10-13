import { Router } from "express";
import {
    create,
    getAll,
    getOne,
    update,
    remove,
} from "./project.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";

const router = Router();

router.post("/", authenticate, create);
router.get("/", authenticate, getAll);
router.get("/:id", authenticate, getOne);
router.patch("/:id", authenticate, update);
router.delete("/:id", authenticate, remove);

export default router;

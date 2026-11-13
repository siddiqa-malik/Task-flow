import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  getByTeam,
  getOne,
  create,
  update,
  remove,
} from "./cycle.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getByTeam);
router.get("/:id", getOne);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;

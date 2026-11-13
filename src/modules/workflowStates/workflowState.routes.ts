import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  getStates,
  create,
  update,
  remove,
} from "./workflowState.controller.js";

const router = Router();

router.use(authenticate);

router.get("/", getStates);
router.post("/", create);
router.patch("/:id", update);
router.delete("/:id", remove);

export default router;

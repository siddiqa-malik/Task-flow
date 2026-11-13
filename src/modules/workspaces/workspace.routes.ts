import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  create,
  getMyWorkspaces,
  getOne,
  update,
  invite,
  getInviteDetails,
  acceptInvite,
  leave,
} from "./workspace.controller.js";

const router = Router();

// Public invitation inspection (so invite recipient can see workspace name before logging in)
router.get("/invitations/:token", getInviteDetails);

// Authenticated routes
router.use(authenticate);

router.post("/", create);
router.get("/", getMyWorkspaces);
router.post("/invite", invite);
router.post("/invitations/:token/accept", acceptInvite);
router.get("/:id", getOne);
router.patch("/:id", update);
router.post("/:id/leave", leave);

export default router;

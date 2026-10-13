import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  addMember,
  getMembers,
  getMember,
  removeMember,
  updateRole,
} from "./projectMember.controller.js";

const router = Router();

router.post("/:projectId/members", authenticate, addMember);
router.get("/:projectId/members", authenticate, getMembers);
router.get("/:projectId/members/:memberId", authenticate, getMember);
router.patch("/:projectId/members/:memberId", authenticate, updateRole);
router.delete("/:projectId/members/:memberId", authenticate, removeMember);

export default router;
import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  createTeam,
  getWorkspaceTeams,
  getTeamById,
  updateTeam,
  deleteTeam,
  addTeamMember,
  removeTeamMember,
} from "./team.controller.js";

const router = Router();

router.use(authenticate);

router.post("/", createTeam);
router.get("/", getWorkspaceTeams);
router.get("/:id", getTeamById);
router.patch("/:id", updateTeam);
router.delete("/:id", deleteTeam);
router.post("/:id/members", addTeamMember);
router.delete("/:id/members/:memberId", removeTeamMember);

export default router;

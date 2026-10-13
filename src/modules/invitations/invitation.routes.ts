import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  send,
  getAllForProject,
  getMy,
  accept,
  reject,
  cancel,
} from "./invitation.controller.js";

// Project-scoped invitations (e.g. /api/projects/:projectId/invitations)
const projectInvitationRouter = Router();

projectInvitationRouter.post("/:projectId/invitations", authenticate, send);
projectInvitationRouter.get(
  "/:projectId/invitations",
  authenticate,
  getAllForProject
);

// General invitations routes (e.g. /api/invitations)
const invitationRouter = Router();

invitationRouter.get("/me", authenticate, getMy);
invitationRouter.post("/:token/accept", authenticate, accept);
invitationRouter.post("/:token/reject", authenticate, reject);
invitationRouter.delete("/:invitationId", authenticate, cancel);

export { projectInvitationRouter, invitationRouter };
export default invitationRouter;

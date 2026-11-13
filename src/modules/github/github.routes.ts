import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { getRepos, getIssues, importIssues } from "./github.controller.js";

const router = Router();

// Public / Token-based repository issues lookup
router.get("/issues", getIssues);
router.get("/issues/:owner/:repo", getIssues);

// Authenticated GitHub actions
router.get("/repos", authenticate, getRepos);
router.post("/import", authenticate, importIssues);

export default router;


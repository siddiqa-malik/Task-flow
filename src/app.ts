import workspaceRoutes from "./modules/workspaces/workspace.routes.js";
import teamRoutes from "./modules/teams/team.routes.js";
import express from "express";
import cors from "cors";
import authRoutes from "./modules/auth/auth.routes.js";
import { authenticate } from "./middleware/auth.middleware.js";
import { AuthenticatedRequest } from "./types/auth.types.js";
import { authorizeRoles } from "./middleware/role.middleware.js";
import projectRoutes from "./modules/projects/project.routes.js";
import projectMemberRoutes from "./modules/projectMembers/projectMember.routes.js";
import { issueCommentRouter, taskCommentRouter, commentRouter } from "./modules/comments/comment.routes.js";
import { projectInvitationRouter, invitationRouter } from "./modules/invitations/invitation.routes.js";
import userRoutes from "./modules/users/user.routes.js";
import notificationRoutes from "./modules/notifications/notification.routes.js";
import settingsRoutes from "./modules/userSettings/userSettings.routes.js";
import issueRoutes from "./modules/issues/issue.routes.js";
import workflowStateRoutes from "./modules/workflowStates/workflowState.routes.js";
import labelRoutes from "./modules/labels/label.routes.js";
import cycleRoutes from "./modules/cycles/cycle.routes.js";
import githubRoutes from "./modules/github/github.routes.js";
import { notFoundHandler, errorHandler } from "./middleware/error.middleware.js";
import { connectDatabase } from "./config/database.js";

const app = express();

/*
 * Enable CORS for all origins (including Vercel production & preview URLs)
 * and allow credentials/authorization headers for preflight OPTIONS requests.
 */
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json());

// Sanitize URL (removes accidental newline %0A or trailing spaces from Postman)
app.use((req, _res, next) => {
  req.url = req.url.replace(/%0A|[\r\n]+/gi, "").trim();
  next();
});

/*
 * Ensure MongoDB is connected on every serverless invocation before hitting routes.
 */
app.use(async (_req, _res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "TaskFlow API is running",
  });
});

app.use("/api/auth", authRoutes);

// Protected test routes (supports both GET and POST, and both /api and /api/auth paths)
const protectedHandler = (req: AuthenticatedRequest, res: express.Response) => {
  res.json({
    success: true,
    message: "You accessed a protected route",
    user: req.user,
  });
};

app.all("/api/test-protected", authenticate, protectedHandler);
app.all("/api/auth/test-protected", authenticate, protectedHandler);

app.get(
  "/api/admin-test",
  authenticate,
  authorizeRoles("admin"),
  (req, res) => {
    res.json({
      success: true,
      message: "Welcome Admin",
    });
  }
);

// Module Routes
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/projects", projectMemberRoutes);
app.use("/api/projects", projectInvitationRouter);
app.use("/api/issues", issueRoutes);
app.use("/api/issues", issueCommentRouter);

// Compatibility aliases for legacy frontend endpoints
app.use("/api/tasks", issueRoutes);
app.use("/api/tasks", taskCommentRouter);

app.use("/api/comments", commentRouter);
app.use("/api/invitations", invitationRouter);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/workflow-states", workflowStateRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/github", githubRoutes);

// 404 Handler for undefined routes
app.use(notFoundHandler);

// Global Central Error Handler
app.use(errorHandler);

export default app;

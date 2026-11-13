import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  create,
  getAllForTask,
  getOne,
  update,
  remove,
} from "./comment.controller.js";

// Routes under /api/tasks
const taskCommentRouter = Router();

taskCommentRouter.post("/:taskId/comments", authenticate, create);
taskCommentRouter.get("/:taskId/comments", authenticate, getAllForTask);

// Routes under /api/issues
const issueCommentRouter = Router();

issueCommentRouter.post("/:issueId/comments", authenticate, create);
issueCommentRouter.get("/:issueId/comments", authenticate, getAllForTask);

// Routes under /api/comments
const commentRouter = Router();

commentRouter.get("/:commentId", authenticate, getOne);
commentRouter.patch("/:commentId", authenticate, update);
commentRouter.delete("/:commentId", authenticate, remove);

export { issueCommentRouter, taskCommentRouter, commentRouter };
export default commentRouter;

import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import {
  create,
  getAllForProject,
  getOne,
  update,
  remove,
} from "./task.controller.js";

// Routes under /api/projects
const projectTaskRouter = Router();

projectTaskRouter.post("/:projectId/tasks", authenticate, create);
projectTaskRouter.get("/:projectId/tasks", authenticate, getAllForProject);

// Routes under /api/tasks
const taskRouter = Router();

taskRouter.get("/:taskId", authenticate, getOne);
taskRouter.patch("/:taskId", authenticate, update);
taskRouter.delete("/:taskId", authenticate, remove);

export { projectTaskRouter, projectTaskRouter as projectTaskRoutes, taskRouter };
export default taskRouter;

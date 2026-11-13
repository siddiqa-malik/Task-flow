import mongoose from "mongoose";
import { WorkflowState, IWorkflowState, WorkflowStateType } from "./workflowState.model.js";

export const DEFAULT_WORKFLOW_STATES: Array<{
  name: string;
  color: string;
  type: WorkflowStateType;
  position: number;
}> = [
  { name: "Backlog", color: "#bec2c8", type: "backlog", position: 1 },
  { name: "Todo", color: "#e2b340", type: "unstarted", position: 2 },
  { name: "In Progress", color: "#f2994a", type: "started", position: 3 },
  { name: "In Review", color: "#5e6ad2", type: "started", position: 4 },
  { name: "Done", color: "#0cbb52", type: "completed", position: 5 },
  { name: "Canceled", color: "#95a5a6", type: "canceled", position: 6 },
];

export const ensureTeamWorkflowStates = async (
  teamId: string | mongoose.Types.ObjectId,
  workspaceId: string | mongoose.Types.ObjectId
): Promise<IWorkflowState[]> => {
  const tId = new mongoose.Types.ObjectId(teamId);
  const wId = new mongoose.Types.ObjectId(workspaceId);

  let states = await WorkflowState.find({ teamId: tId }).sort({ position: 1 });

  if (states.length === 0) {
    const toInsert = DEFAULT_WORKFLOW_STATES.map((s) => ({
      ...s,
      teamId: tId,
      workspaceId: wId,
    }));
    states = await WorkflowState.insertMany(toInsert);
  }

  return states;
};

export const getWorkflowStatesByTeam = async (
  teamId: string,
  workspaceId?: string
): Promise<IWorkflowState[]> => {
  const tId = new mongoose.Types.ObjectId(teamId);
  let states: IWorkflowState[] = await WorkflowState.find({ teamId: tId }).sort({ position: 1 });

  if (states.length === 0 && workspaceId) {
    states = await ensureTeamWorkflowStates(teamId, workspaceId);
  }

  return states;
};

export const createWorkflowState = async (data: {
  teamId: string;
  workspaceId: string;
  name: string;
  color?: string;
  type: WorkflowStateType;
  position?: number;
  description?: string;
}) => {
  const { teamId, workspaceId, name, color, type, position, description } = data;

  const count = await WorkflowState.countDocuments({
    teamId: new mongoose.Types.ObjectId(teamId),
  });

  const state = await WorkflowState.create({
    teamId: new mongoose.Types.ObjectId(teamId),
    workspaceId: new mongoose.Types.ObjectId(workspaceId),
    name: name.trim(),
    color: color || "#bec2c8",
    type,
    position: position ?? count + 1,
    description: description?.trim(),
  });

  return state;
};

export const updateWorkflowState = async (
  id: string,
  updates: Partial<{
    name: string;
    color: string;
    type: WorkflowStateType;
    position: number;
    description: string;
  }>
) => {
  const state = await WorkflowState.findByIdAndUpdate(id, updates, {
    new: true,
  });
  return state;
};

export const deleteWorkflowState = async (id: string) => {
  return await WorkflowState.findByIdAndDelete(id);
};

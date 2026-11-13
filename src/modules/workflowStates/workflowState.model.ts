import mongoose, { Schema, Document } from "mongoose";

export type WorkflowStateType =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled";

export interface IWorkflowState extends Document {
  name: string;
  color: string;
  type: WorkflowStateType;
  teamId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  position: number;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const workflowStateSchema = new Schema<IWorkflowState>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      default: "#bec2c8",
    },
    type: {
      type: String,
      enum: ["triage", "backlog", "unstarted", "started", "completed", "canceled"],
      required: true,
      default: "unstarted",
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    position: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

workflowStateSchema.index({ teamId: 1, position: 1 });
workflowStateSchema.index({ workspaceId: 1 });

export const WorkflowState = mongoose.model<IWorkflowState>(
  "WorkflowState",
  workflowStateSchema
);

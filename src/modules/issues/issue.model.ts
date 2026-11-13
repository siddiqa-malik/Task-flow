import mongoose, { Schema, Document } from "mongoose";

export type IssueStatus =
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled";

export type IssuePriority = "none" | "urgent" | "high" | "medium" | "low";

export interface IIssue extends Document {
  workspaceId: mongoose.Types.ObjectId;
  teamId: mongoose.Types.ObjectId;
  projectId?: mongoose.Types.ObjectId;
  cycleId?: mongoose.Types.ObjectId;
  parentId?: mongoose.Types.ObjectId;

  number: number;
  identifier: string; // e.g. "ENG-1"
  title: string;
  description?: string;

  status: IssueStatus;
  stateId?: mongoose.Types.ObjectId;
  priority: IssuePriority;
  estimate?: number;

  createdBy: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  dueDate?: Date;
  labels: mongoose.Types.ObjectId[];

  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const issueSchema = new Schema<IIssue>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
      required: true,
    },
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
    },
    cycleId: {
      type: Schema.Types.ObjectId,
      ref: "Cycle",
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
    },
    number: {
      type: Number,
      required: true,
    },
    identifier: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["backlog", "unstarted", "started", "completed", "canceled"],
      default: "unstarted",
    },
    stateId: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowState",
    },
    priority: {
      type: String,
      enum: ["none", "urgent", "high", "medium", "low"],
      default: "none",
    },
    estimate: {
      type: Number,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    dueDate: {
      type: Date,
    },
    labels: [
      {
        type: Schema.Types.ObjectId,
        ref: "Label",
      },
    ],
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

issueSchema.index({ workspaceId: 1, identifier: 1 }, { unique: true });
issueSchema.index({ workspaceId: 1, sortOrder: 1, createdAt: -1 });
issueSchema.index({ teamId: 1, sortOrder: 1, createdAt: -1 });
issueSchema.index({ projectId: 1, sortOrder: 1, createdAt: -1 });
issueSchema.index({ teamId: 1, number: 1 });
issueSchema.index({ teamId: 1, status: 1 });
issueSchema.index({ assignedTo: 1 });
issueSchema.index({ projectId: 1 });
issueSchema.index({ cycleId: 1 });
issueSchema.index({ parentId: 1 });

export const Issue = mongoose.model<IIssue>("Issue", issueSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface IWorkspaceMember {
  userId: mongoose.Types.ObjectId;
  role: "owner" | "admin" | "manager" | "member";
  joinedAt: Date;
}

export interface IWorkspaceInvitation {
  email: string;
  token: string;
  role: "admin" | "manager" | "member";
  status: "pending" | "accepted" | "expired";
  senderName?: string;
  invitedBy?: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

export interface IWorkspace extends Document {
  name: string;
  slug: string;
  ownerId: mongoose.Types.ObjectId;
  companySize?: string;
  role?: string;
  members: IWorkspaceMember[];
  invitations: IWorkspaceInvitation[];
  createdAt: Date;
  updatedAt: Date;
}

const workspaceMemberSchema = new Schema<IWorkspaceMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "manager", "member"],
      default: "member",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const workspaceInvitationSchema = new Schema<IWorkspaceInvitation>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    token: { type: String, required: true },
    role: { type: String, enum: ["admin", "manager", "member"], default: "member" },
    status: { type: String, enum: ["pending", "accepted", "expired"], default: "pending" },
    senderName: { type: String },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const workspaceSchema = new Schema<IWorkspace>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    companySize: {
      type: String,
      trim: true,
      default: "1-10",
    },
    role: {
      type: String,
      trim: true,
      default: "Other",
    },
    members: [workspaceMemberSchema],
    invitations: [workspaceInvitationSchema],
  },
  {
    timestamps: true,
  }
);

workspaceSchema.index({ ownerId: 1 });
workspaceSchema.index({ "members.userId": 1 });

export const Workspace = mongoose.model<IWorkspace>("Workspace", workspaceSchema);
export const workspace = Workspace;

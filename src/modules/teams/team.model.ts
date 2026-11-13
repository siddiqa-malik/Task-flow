import mongoose, { Schema, Document } from "mongoose";

export interface ITeamInvitation {
  email: string;
  role: "lead" | "member";
  status: "pending" | "accepted";
  createdAt: Date;
}

export interface ITeamMember {
  userId?: mongoose.Types.ObjectId;
  email?: string;
  role: "lead" | "member";
  status?: "active" | "invited" | "pending";
  joinedAt: Date;
}

export interface ITeam extends Document {
  name: string;
  key: string;
  description?: string;
  status: "active" | "retired" | "deleted";
  workspaceId: mongoose.Types.ObjectId;
  icon?: string;
  color?: string;
  isPrivate: boolean;
  copiedFrom?: string;
  createdBy: mongoose.Types.ObjectId;
  members: ITeamMember[];
  invitations: ITeamInvitation[];
  issueCounter?: number;
  createdAt: Date;
  updatedAt: Date;
}

const teamInvitationSchema = new Schema<ITeamInvitation>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ["lead", "member"], default: "member" },
    status: { type: String, enum: ["pending", "accepted"], default: "pending" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const teamMemberSchema = new Schema<ITeamMember>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      default: "member",
    },
    status: {
      type: String,
      enum: ["active", "invited", "pending"],
      default: "active",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "retired", "deleted"],
      default: "active",
    },
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    icon: {
      type: String,
      default: "FolderKanban",
    },
    color: {
      type: String,
      default: "#5e6ad2",
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    copiedFrom: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [teamMemberSchema],
    invitations: [teamInvitationSchema],
    issueCounter: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

teamSchema.index({ workspaceId: 1, key: 1 });
teamSchema.index({ workspaceId: 1, status: 1 });
teamSchema.index({ "members.userId": 1 });

export const Team = mongoose.model<ITeam>("Team", teamSchema);
export const team = Team;

import mongoose, { Schema, Document } from "mongoose";

export interface IProjectMember extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: "owner" | "manager" | "member";
  joinedAt: Date;
}

const projectMemberSchema = new Schema<IProjectMember>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    role: {
      type: String,
      enum: ["owner", "manager", "member"],
      required: true,
      default: "member",
    },

    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

projectMemberSchema.index(
  { projectId: 1, userId: 1 },
  { unique: true }
);

export const ProjectMember = mongoose.model<IProjectMember>(
  "ProjectMember",
  projectMemberSchema
);
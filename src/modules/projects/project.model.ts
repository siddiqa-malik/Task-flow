import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  status: "active" | "archived";
  projectStatus?: string;
  priority?: string;
  lead?: { name?: string; email?: string; initials?: string };
  teamId?: string;
  teamName?: string;
  startDate?: Date;
  dueDate?: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
    },

    projectStatus: {
      type: String,
      default: "planned",
    },

    priority: {
      type: String,
      default: "none",
    },

    teamId: { type: String, trim: true },
    teamName: { type: String, trim: true },
    lead: {
      name: { type: String },
      email: { type: String },
      initials: { type: String },
    },

    startDate: {
      type: Date,
    },

    dueDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const Project = mongoose.model<IProject>(
  "Project",
  projectSchema
);

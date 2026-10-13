import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description?: string;
  ownerId: mongoose.Types.ObjectId;
  status: "active" | "archived";
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
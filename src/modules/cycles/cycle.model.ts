import mongoose, { Schema, Document } from "mongoose";

export interface ICycle extends Document {
  teamId: mongoose.Types.ObjectId;
  workspaceId: mongoose.Types.ObjectId;
  number: number;
  name?: string;
  description?: string;
  startsAt: Date;
  endsAt: Date;
  status: "upcoming" | "active" | "completed";
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const cycleSchema = new Schema<ICycle>(
  {
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
    number: {
      type: Number,
      required: true,
    },
    name: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    startsAt: {
      type: Date,
      required: true,
    },
    endsAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["upcoming", "active", "completed"],
      default: "upcoming",
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

cycleSchema.index({ teamId: 1, number: 1 });
cycleSchema.index({ workspaceId: 1 });

export const Cycle = mongoose.model<ICycle>("Cycle", cycleSchema);

import mongoose, { Schema, Document } from "mongoose";

export interface ILabel extends Document {
  workspaceId: mongoose.Types.ObjectId;
  teamId?: mongoose.Types.ObjectId;
  name: string;
  color: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const labelSchema = new Schema<ILabel>(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },
    teamId: {
      type: Schema.Types.ObjectId,
      ref: "Team",
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    color: {
      type: String,
      required: true,
      default: "#bb87fc",
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

labelSchema.index({ workspaceId: 1, name: 1 });
labelSchema.index({ teamId: 1 });

export const Label = mongoose.model<ILabel>("Label", labelSchema);

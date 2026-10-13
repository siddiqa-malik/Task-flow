import mongoose, { Schema, Document } from "mongoose";

export interface IInvitation extends Document {
  projectId: mongoose.Types.ObjectId;
  invitedBy: mongoose.Types.ObjectId;
  email: string;
  role: "manager" | "member";
  status: "pending" | "accepted" | "rejected" | "expired";
  token: string;
  expiresAt: Date;
}

const invitationSchema = new Schema<IInvitation>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    role: {
      type: String,
      enum: ["manager", "member"],
      required: true,
      default: "member",
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "expired"],
      required: true,
      default: "pending",
    },

    token: {
      type: String,
      required: true,
      unique: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

invitationSchema.index({
  projectId: 1,
  email: 1,
});

export const Invitation = mongoose.model<IInvitation>(
  "Invitation",
  invitationSchema
);
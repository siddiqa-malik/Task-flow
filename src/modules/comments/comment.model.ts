import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  taskId?: mongoose.Types.ObjectId;
  issueId?: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
}

const commentSchema = new Schema<IComment>(
  {
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
    },

    taskId: {
      type: Schema.Types.ObjectId,
    },

    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.index({ taskId: 1 });
commentSchema.index({ issueId: 1 });

export const Comment = mongoose.model<IComment>(
  "Comment",
  commentSchema
);
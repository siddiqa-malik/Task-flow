import mongoose, { Schema, Document } from "mongoose";

export interface IComment extends Document {
  taskId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
}

const commentSchema = new Schema<IComment>(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Task",
      required: true,
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

export const Comment = mongoose.model<IComment>(
  "Comment",
  commentSchema
);
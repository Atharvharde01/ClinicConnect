import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Review owner is required"],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [100, "First name cannot exceed 100 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [100, "Last name cannot exceed 100 characters"],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
      validate: {
        validator: Number.isInteger,
        message: "Rating must be an integer between 1 and 5",
      },
    },
    message: {
      type: String,
      required: [true, "Review message is required"],
      trim: true,
      maxlength: [1000, "Review message cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true,
  }
);

reviewSchema.index({ createdAt: -1 });

export default mongoose.model("Review", reviewSchema);

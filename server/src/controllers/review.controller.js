import mongoose from "mongoose";
import Review from "../models/Review.js";
import { validateReview } from "../validators/review.validator.js";

// Lightweight in-memory rate limiter for review submissions
const submissionTracker = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 10;

const cleanupRateLimiter = () => {
  const now = Date.now();
  for (const [ip, timestamps] of submissionTracker.entries()) {
    const validTimestamps = timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (validTimestamps.length === 0) {
      submissionTracker.delete(ip);
    } else {
      submissionTracker.set(ip, validTimestamps);
    }
  }
};

const isRateLimited = (clientIp) => {
  const now = Date.now();
  cleanupRateLimiter();

  const timestamps = submissionTracker.get(clientIp) || [];
  const recentTimestamps = timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (recentTimestamps.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return true;
  }

  recentTimestamps.push(now);
  submissionTracker.set(clientIp, recentTimestamps);
  return false;
};

/**
 * Public endpoint: Get list of patient reviews
 * Safe projection: never exposes email, password, or sensitive details
 */
export const getPublicReviews = async (req, res) => {
  try {
    const reviews = await Review.find({})
      .select("_id firstName lastName rating message user createdAt")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      reviews,
    });
  } catch (error) {
    console.error("Failed to fetch reviews:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while fetching reviews.",
      reviews: [],
    });
  }
};

/**
 * Protected endpoint: Submit a new patient review
 * Requires authentication; ownership derived strictly from req.user._id
 */
export const createReview = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to submit a review.",
      });
    }

    const clientIp =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown-ip";

    if (isRateLimited(clientIp)) {
      return res.status(429).json({
        success: false,
        message:
          "Too many reviews submitted from this connection. Please try again later.",
      });
    }

    const validation = validateReview(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const { firstName, lastName, rating, message } = validation.data;

    // Critical security: Ownership derived strictly from verified token (req.user._id)
    // Never trust req.body.user, req.body.owner, or createdBy
    const review = new Review({
      firstName,
      lastName,
      rating,
      message,
      user: req.user._id,
    });

    const savedReview = await review.save();

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      review: {
        _id: savedReview._id,
        firstName: savedReview.firstName,
        lastName: savedReview.lastName,
        rating: savedReview.rating,
        message: savedReview.message,
        user: savedReview.user,
        createdAt: savedReview.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to create review:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while saving your review. Please try again.",
    });
  }
};

/**
 * Protected endpoint: Update an existing review
 * Requires authentication; verifies both review ID and authenticated owner ID
 */
export const updateReview = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to edit a review.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format.",
      });
    }

    const validation = validateReview(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const { firstName, lastName, rating, message } = validation.data;

    // Database query enforcing ownership directly at the DB level
    const updatedReview = await Review.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { firstName, lastName, rating, message },
      { returnDocument: "after", runValidators: true }
    ).select("_id firstName lastName rating message user createdAt updatedAt");

    if (!updatedReview) {
      // Check whether review exists at all
      const existing = await Review.findById(id).select("_id user");
      if (existing) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to edit this review.",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review updated successfully.",
      review: updatedReview,
    });
  } catch (error) {
    console.error("Failed to update review:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while updating your review. Please try again.",
    });
  }
};

/**
 * Protected endpoint: Delete an existing review
 * Requires authentication; verifies both review ID and authenticated owner ID
 */
export const deleteReview = async (req, res) => {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to delete a review.",
      });
    }

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID format.",
      });
    }

    // Database query enforcing ownership directly at the DB level
    const deletedReview = await Review.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!deletedReview) {
      // Check whether review exists at all
      const existing = await Review.findById(id).select("_id user");
      if (existing) {
        return res.status(403).json({
          success: false,
          message: "You are not authorized to delete this review.",
        });
      }

      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
      reviewId: id,
    });
  } catch (error) {
    console.error("Failed to delete review:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting your review. Please try again.",
    });
  }
};

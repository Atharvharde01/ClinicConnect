import express from "express";
import {
  createReview,
  getPublicReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public: view all reviews
router.get("/", getPublicReviews);

// Protected: create, update, delete
router.post("/", authenticate, createReview);
router.put("/:id", authenticate, updateReview);
router.delete("/:id", authenticate, deleteReview);

export default router;

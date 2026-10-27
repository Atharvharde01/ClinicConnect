import express from "express";
import {
  getPublicDepartments,
  getPublicDoctorsByDepartment,
} from "../controllers/public.controller.js";
import {
  createReview,
  getPublicReviews,
  updateReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/departments", getPublicDepartments);
router.get("/doctors/:departmentId", getPublicDoctorsByDepartment);

// Review routes mirror
router.get("/reviews", getPublicReviews);
router.post("/reviews", authenticate, createReview);
router.put("/reviews/:id", authenticate, updateReview);
router.delete("/reviews/:id", authenticate, deleteReview);

export default router;

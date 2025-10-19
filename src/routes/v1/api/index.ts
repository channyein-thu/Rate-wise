import express from "express";
import {
  getCourseByPagination,
  getCourseWithId,
  getTotalCourses,
} from "../../../controllers/api/courseController";
import { auth } from "../../../middlewares/auth";
import {
  getProfessorByPagination,
  getProfessorWithId,
  getTotalProfessors,
} from "../../../controllers/api/professorController";
import {
  createReview,
  deleteReview,
  getAllUserReviews,
  updateReview,
  getUserCourseReviews,
  getUserProfessorReviews,
  getTotalReviews,
} from "../../../controllers/api/reviewController";

const router = express.Router();

router.get("/courses/:id", auth, getCourseWithId);
router.get("/courses", auth, getCourseByPagination);

router.get("/professors/:id", auth, getProfessorWithId);
router.get("/professors", auth, getProfessorByPagination);

router.post("/reviews", auth, createReview);
router.patch("/reviews", auth, updateReview);
router.delete("/reviews", auth, deleteReview);

router.get("/reviews", auth, getAllUserReviews);
router.get("/reviews/courses", auth, getUserCourseReviews);
router.get("/reviews/professors", auth, getUserProfessorReviews);

router.get("/total-professors", auth, getTotalProfessors);
router.get("/total-courses", auth, getTotalCourses);
router.get("/total-reviews", auth, getTotalReviews);

export default router;

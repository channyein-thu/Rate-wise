import express from "express";
import {
  createCourse,
  deleteCourse,
  getCourseByPagination,
  updateCourse,
} from "../../../controllers/admin/courseController";
import { get } from "http";
const router = express.Router();

router.post("/courses", createCourse);
router.get("/courses", getCourseByPagination);
router.patch("/courses", updateCourse);
router.delete("/courses", deleteCourse);

export default router;

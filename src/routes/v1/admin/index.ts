import express from "express";
import {
  createCourse,
  deleteCourse,
  getCourseByPagination,
  updateCourse,
  getCourseWithId,
} from "../../../controllers/admin/courseController";
import { get } from "http";
import upload from "../../../middlewares/upload";
import {
  createProfessor,
  deleteProfessor,
  getProfessorByPagination,
  updateProfessor,
  updateProfessorImage,
} from "../../../controllers/admin/professorController";
const router = express.Router();

router.get("/courses/:id", getCourseWithId);
router.post("/courses", createCourse);
router.get("/courses", getCourseByPagination);
router.patch("/courses", updateCourse);
router.delete("/courses", deleteCourse);

router.post("/professors", upload.single("image"), createProfessor);
router.get("/professors", getProfessorByPagination);
router.patch("/professors", updateProfessor);
router.patch("/professors/image", upload.single("image"), updateProfessorImage);
router.delete("/professors", deleteProfessor);

export default router;

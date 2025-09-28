import express from "express";
import {
  getCourseByPagination,
  getCourseWithId,
} from "../../../controllers/api/courseController";
import { auth } from "../../../middlewares/auth";
import {
  getProfessorByPagination,
  getProfessorWithId,
} from "../../../controllers/api/professorController";

const router = express.Router();

router.get("/courses/:id", auth, getCourseWithId);
router.get("/courses", auth, getCourseByPagination);

router.get("/professors/:id", auth, getProfessorWithId);
router.get("/professors", auth, getProfessorByPagination);

export default router;

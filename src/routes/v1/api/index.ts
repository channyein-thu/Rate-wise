import express from "express";
import { getCourseByPagination } from "../../../controllers/api/courseController";
import { auth } from "../../../middlewares/auth";
import { getProfessorByPagination } from "../../../controllers/api/professorController";

const router = express.Router();

router.get("/courses", auth, getCourseByPagination);
router.get("/professors", auth, getProfessorByPagination);

export default router;

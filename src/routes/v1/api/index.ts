import express from "express";
import { getCourseByPagination } from "../../../controllers/api/courseController";
import { auth } from "../../../middlewares/auth";

const router = express.Router();

router.get("/courses", auth, getCourseByPagination);

export default router;

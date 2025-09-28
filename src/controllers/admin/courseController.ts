import e, { Request, Response, NextFunction } from "express";
import { body, validationResult, query, param } from "express-validator";
import { createError } from "../../utils/error";
import { errorCode } from "../../../config/errorCode";

import { getOrSetCache } from "../../utils/cache";
import cacheQueue from "../../jobs/queues/cacheQueue";
import { Faculty } from "../../../generated/prisma";
import {
  createOneCourse,
  deleteOneCourse,
  getCourseById,
  getCourseByTitle,
  getCourseList,
  updateOneCourse,
} from "../../services/courseService";

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}

export const getCourseWithId = [
  param("courseId", "Course ID must be a positive integer").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const courseId = parseInt(req.params.courseId, 10);
    const cacheKey = `courses:${courseId}`;
    const course = await getOrSetCache(cacheKey, async () => {
      return await getCourseById(courseId);
    });

    if (!course) {
      return next(createError("Course not found.", 404, errorCode.invalid));
    }

    res.status(200).json({
      success: true,
      message: "Course fetched successfully",
      data: course,
    });
  },
];

export const createCourse = [
  body("title", "Course title is required").trim().notEmpty().escape(),
  body("code", "Course code is required")
    .trim()
    .notEmpty()
    .withMessage("Course code is required")
    .isLength({ min: 7, max: 7 })
    .withMessage("Course code must be 7 digits")
    .isNumeric()
    .withMessage("Course code must contain only numbers"),
  body("credits", "Credits are required")
    .isInt({ min: 1, max: 4 })
    .withMessage("Credits must be an integer between 1 and 4"),
  body("description").optional().trim().escape(),
  body("faculty", "Faculty is required")
    .notEmpty()
    .isIn(Object.values(Faculty))
    .withMessage("Invalid faculty value"),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { title, code, credits, description, faculty } = req.body;

    const course = await getCourseByTitle(title);
    if (course) {
      return next(
        createError("This course title already exists.", 409, errorCode.invalid)
      );
    }

    const CourseData = {
      title,
      code,
      credits: Number(credits),
      description: description || "",
      faculty: faculty as Faculty,
    };

    const newCourse = await createOneCourse(CourseData);
    if (!newCourse) {
      return next(
        createError("Failed to create course.", 500, errorCode.severError)
      );
    }

    // Invalidate cache
    await cacheQueue.add(
      "invalidate-course-cache",
      {
        pattern: "courses:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(201).json({
      success: true,
      message: "Course created successfully",
      data: newCourse.id,
    });
  },
];

export const getCourseByPagination = [
  // Validation
  query("cursor", "Cursor must be Course ID.").isInt({ gt: 0 }).optional(),
  query("limit", "Limit must be an integer greater than 0.")
    .isInt({ gt: 0 })
    .optional(),
  query("averageRate", "averageRate must be a number")
    .isFloat({ min: 0 })
    .optional(),
  query("faculty", "Faculty must be string").optional().isString(),
  query("title", "Title must be string").optional().isString(),

  // Controller
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, "INVALID_INPUT"));
    }

    const lastCursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const faculty = req.query.faculty as string | undefined;
    const averageRate = req.query.averageRate
      ? Number(req.query.averageRate)
      : undefined;
    const searchTerm = req.query.title as string | undefined;

    const where: any = {
      AND: [
        faculty && { faculty: { in: faculty.split(",") } },
        averageRate !== undefined && {
          averageRate: { gte: averageRate },
        },
        searchTerm && {
          OR: [
            { title: { contains: searchTerm } },
            { description: { contains: searchTerm } },
            { code: { contains: searchTerm } },
          ],
        },
      ].filter(Boolean),
    };

    const options = {
      where,
      take: limit + 1, // fetch one extra to check hasNextPage
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: lastCursor } : undefined,
      select: {
        id: true,
        title: true,
        description: true,
        credits: true,
        faculty: true,
        totalReviews: true,
        averageRate: true,
      },
      orderBy: {
        id: "desc",
      },
    };

    const cacheKey = `courses:${JSON.stringify(req.query)}`;
    const courses = await getOrSetCache(cacheKey, async () => {
      return await getCourseList(options);
    });

    const hasNextPage = courses.length > limit;
    if (hasNextPage) {
      courses.pop(); // remove extra record
    }

    const nextCursor =
      courses.length > 0 ? courses[courses.length - 1].id : null;

    res.status(200).json({
      message: "Get All infinite courses",
      hasNextPage,
      nextCursor,
      prevCursor: lastCursor || null,
      courses,
    });
  },
];

export const updateCourse = [
  body("courseId", "Course ID is required").isInt({ gt: 0 }),
  body("title", "Course title is required").trim().notEmpty().escape(),
  body("code", "Course code is required")
    .trim()
    .notEmpty()
    .withMessage("Course code is required")
    .isLength({ min: 7, max: 7 })
    .withMessage("Course code must be 7 digits")
    .isNumeric()
    .withMessage("Course code must contain only numbers"),
  body("credits", "Credits are required")
    .isInt({ min: 1, max: 4 })
    .withMessage("Credits must be an integer between 1 and 4"),
  body("description").optional().trim().escape(),
  body("faculty", "Faculty is required")
    .notEmpty()
    .isIn(Object.values(Faculty))
    .withMessage("Invalid faculty value"),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { courseId, title, code, credits, description, faculty } = req.body;

    const existingCourse = await getCourseById(+courseId);
    if (!existingCourse) {
      return next(createError("Course not found.", 404, errorCode.invalid));
    }

    let updateData: any = {};

    updateData.code = code;
    updateData.credits = Number(credits);
    updateData.description = description || "";
    updateData.faculty = faculty as Faculty;

    if (existingCourse.title !== title) {
      const course = await getCourseByTitle(title);
      if (course) {
        return next(
          createError(
            "This course title already exists.",
            409,
            errorCode.invalid
          )
        );
      }
      updateData.title = title;
    }

    const updatedCourse = await updateOneCourse(existingCourse.id, updateData);
    if (!updatedCourse) {
      return next(
        createError("Failed to update course.", 500, errorCode.severError)
      );
    }

    // Invalidate cache
    await cacheQueue.add(
      "invalidate-course-cache",
      {
        pattern: "courses:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      success: true,
      message: "Course updated successfully",
      updatedCourseId: updatedCourse.id,
    });
  },
];

export const deleteCourse = [
  body("courseId", "Course ID is required").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { courseId } = req.body;

    const existingCourse = await getCourseById(+courseId);
    if (!existingCourse) {
      return next(createError("Course not found.", 404, errorCode.invalid));
    }

    const deletedCourse = await deleteOneCourse(+courseId);
    if (!deletedCourse) {
      return next(
        createError("Failed to delete course.", 500, errorCode.severError)
      );
    }

    // Invalidate cache
    await cacheQueue.add(
      "invalidate-course-cache",
      {
        pattern: "courses:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    res.status(200).json({
      success: true,
      message: "Course deleted successfully",
      deletedCourseId: deletedCourse.id,
    });
  },
];

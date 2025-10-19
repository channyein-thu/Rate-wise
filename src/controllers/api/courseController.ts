import { Request, Response, NextFunction } from "express";
import { body, validationResult, query, param } from "express-validator";
import { createError } from "../../utils/error";
import { errorCode } from "../../../config/errorCode";
import { getOrSetCache } from "../../utils/cache";
import { getCourseById, getCourseList } from "../../services/courseService";
import { getUserById } from "../../services/authService";

interface CustomRequest extends Request {
  userId?: number;
}

export const getTotalCourses = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const cacheKey = "courses:total";
  const totalCourses = await getOrSetCache(cacheKey, async () => {
    return await getCourseList({ select: { id: true } });
  });

  res.status(200).json({
    success: true,
    message: "total courses fetched successfully",
    total: totalCourses.length,
  });
};

export const getCourseWithId = [
  param("id", "Course ID must be a positive integer").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const user = await getUserById(req.userId!);
    if (!user) {
      return next(
        createError(
          "This account has not registered!",
          401,
          errorCode.unauthenticated
        )
      );
    }
    const courseId = parseInt(req.params.id, 10);
    const cacheKey = `courses:${courseId}`;
    const course = await getOrSetCache(cacheKey, async () => {
      return await getCourseById(+courseId);
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
export const getCourseByPagination = [
  // Validation
  //for pagination
  // query("cursor", "Cursor must be Course ID.").isInt({ gt: 0 }).optional(),
  // query("limit", "Limit must be an integer greater than 0.")
  //   .isInt({ gt: 0 })
  //   .optional(),
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

    const user = await getUserById(req.userId!);
    if (!user) {
      return next(
        createError(
          "This account has not registered!",
          401,
          errorCode.unauthenticated
        )
      );
    }

    // const lastCursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    // const limit = req.query.limit ? Number(req.query.limit) : 6;
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
      // where,
      // take: limit + 1, // fetch one extra to check hasNextPage
      // skip: lastCursor ? 1 : 0,
      // cursor: lastCursor ? { id: lastCursor } : undefined,
      select: {
        id: true,
        title: true,
        description: true,
        credits: true,
        code: true,
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

    // const hasNextPage = courses.length > limit;
    // if (hasNextPage) {
    //   courses.pop(); // remove extra record
    // }

    const nextCursor =
      courses.length > 0 ? courses[courses.length - 1].id : null;

    res.status(200).json({
      message: "Get All infinite courses",
      // hasNextPage,
      // nextCursor,
      // prevCursor: lastCursor || null,
      courses,
    });
  },
];

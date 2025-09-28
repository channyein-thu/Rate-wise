import { Request, Response, NextFunction } from "express";
import { body, validationResult, query } from "express-validator";
import { createError } from "../../utils/error";
import { errorCode } from "../../../config/errorCode";
import { getOrSetCache } from "../../utils/cache";
import { getUserById } from "../../services/authService";
import { getProfessorList } from "../../services/professorService";

interface CustomRequest extends Request {
  userId?: number;
}

export const getProfessorByPagination = [
  // Validation
  query("cursor", "Cursor must be Professor ID.").isInt({ gt: 0 }).optional(),
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
        name: true,
        email: true,
        faculty: true,
        image: true,
        totalReviews: true,
        averageRate: true,
      },
      orderBy: {
        id: "desc",
      },
    };

    const cacheKey = `professors:${JSON.stringify(req.query)}`;
    const professors = await getOrSetCache(cacheKey, async () => {
      return await getProfessorList(options);
    });

    const hasNextPage = professors.length > limit;
    if (hasNextPage) {
      professors.pop(); // remove extra record
    }

    const nextCursor =
      professors.length > 0 ? professors[professors.length - 1].id : null;

    res.status(200).json({
      message: "Get All infinite professors",
      hasNextPage,
      nextCursor,
      prevCursor: lastCursor || null,
      professors,
    });
  },
];

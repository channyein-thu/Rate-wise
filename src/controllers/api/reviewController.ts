import e, { Request, Response, NextFunction } from "express";
import { body, validationResult, query, param } from "express-validator";

import { createError } from "../../utils/error";
import { errorCode } from "../../../config/errorCode";
import { getOrSetCache } from "../../utils/cache";
import { getUserById } from "../../services/authService";
import {
  createOneReview,
  deleteOneReview,
  getOneReviewById,
  getReviewList,
  updateOneReview,
} from "../../services/reviewService";
import { recalcReviewStats } from "../../utils/reviewHelper";
import cacheQueue from "../../jobs/queues/cacheQueue";

interface CustomRequest extends Request {
  userId?: number;
}

export const getTotalReviews = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const cacheKey = "reviews:total";
  const totalReviews = await getOrSetCache(cacheKey, async () => {
    return await getReviewList({ select: { id: true, rating: true } });
  });

  res.status(200).json({
    success: true,
    message: "total reviews fetched successfully",
    total: totalReviews.length,
    ratings: totalReviews.map((r: any) => r.rating),
  });
};

export const createReview = [
  body("courseId")
    .optional({ checkFalsy: true })
    .isInt({ gt: 0 })
    .withMessage("Course ID must be a positive integer")
    .toInt(),
  body("professorId")
    .optional({ checkFalsy: true })
    .isInt({ gt: 0 })
    .withMessage("Professor ID must be a positive integer")
    .toInt(),
  body("rating")
    .exists()
    .withMessage("Rating is required")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5")
    .toInt(),
  body("comment")
    .optional()
    .isString()
    .withMessage("Comment must be a string")
    .trim(),
  body().custom((value) => {
    if (!value.courseId && !value.professorId) {
      throw new Error("Either courseId or professorId is required");
    }
    if (value.courseId && value.professorId) {
      throw new Error("Cannot provide both courseId and professorId");
    }
    return true;
  }),

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

    try {
      const { courseId, professorId, rating, comment } = req.body;
      const authorId = user.id;

      const data = {
        rating,
        comment: comment || "",
        authorId,
        courseId: courseId || null,
        professorId: professorId || null,
      };
      // Create the review
      const review = await createOneReview(data);

      // Update target’s stats
      await recalcReviewStats({ courseId, professorId });

      const invalidatePatterns = ["courses:*", "professors:*", "reviews:*"];

      for (const pattern of invalidatePatterns) {
        await cacheQueue.add(
          "invalidate-cache",
          { pattern },
          {
            jobId: `invalidate-${pattern.replace(/:/g, "_")}-${Date.now()}`,
            priority: 1,
          }
        );
      }

      res.status(201).json({
        success: true,
        message: "Review created successfully",
        data: review,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        return next(
          createError(
            "You have already reviewed this course or professor.",
            400,
            errorCode.duplicate
          )
        );
      }

      next(
        createError(
          error.message || "Failed to create review",
          500,
          errorCode.serverError
        )
      );
    }
  },
];

export const updateReview = [
  body("reviewId")
    .isInt({ gt: 0 })
    .withMessage("Review ID must be a positive integer")
    .toInt(),
  body("rating")
    .isInt({ min: 1, max: 5 })
    .withMessage("Rating must be an integer between 1 and 5")
    .toInt(),
  body("comment").isString().withMessage("Comment must be a string").trim(),

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
    try {
      const { reviewId, rating, comment } = req.body;
      const existingReview = await getOneReviewById(+reviewId);
      if (!existingReview) {
        return next(createError("Review not found", 404, errorCode.notFound));
      }

      const data = { rating, comment };
      // Update the review
      const updatedReview = await updateOneReview(+reviewId, data);

      await recalcReviewStats(existingReview);

      const invalidatePatterns = ["courses:*", "professors:*", "reviews:*"];

      for (const pattern of invalidatePatterns) {
        await cacheQueue.add(
          "invalidate-cache",
          { pattern },
          {
            jobId: `invalidate-${pattern.replace(/:/g, "_")}-${Date.now()}`,
            priority: 1,
          }
        );
      }

      res.status(200).json({
        success: true,
        message: "Review updated successfully",
        data: updatedReview.id,
      });
    } catch (error: any) {
      next(
        createError(
          error.message || "Failed to update review",
          500,
          errorCode.serverError
        )
      );
    }
  },
];

export const deleteReview = [
  body("reviewId")
    .isInt({ gt: 0 })
    .withMessage("Review ID must be a positive integer"),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    try {
      const { reviewId } = req.body;

      const existing = await getOneReviewById(+reviewId);
      if (!existing) {
        return next(createError("Review not found", 404, errorCode.notFound));
      }

      // await prisma.review.delete({ where: { id: reviewId } });
      const deleted = await deleteOneReview(+reviewId);

      //  Recalculate stats
      await recalcReviewStats(existing);

      const invalidatePatterns = ["courses:*", "professors:*", "reviews:*"];

      for (const pattern of invalidatePatterns) {
        await cacheQueue.add(
          "invalidate-cache",
          { pattern },
          {
            jobId: `invalidate-${pattern.replace(/:/g, "_")}-${Date.now()}`,
            priority: 1,
          }
        );
      }

      res.json({
        success: true,
        message: "Review deleted successfully",
        deletedReviewId: deleted.id,
      });
    } catch (error: any) {
      next(
        createError(
          error.message || "Failed to delete review",
          500,
          errorCode.serverError
        )
      );
    }
  },
];

export const getAllUserReviews = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      return next(
        createError("Unauthorized user", 401, errorCode.unauthenticated)
      );
    }

    const options: any = {
      where: { authorId: user.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            faculty: true,
            averageRate: true,
            totalReviews: true,
          },
        },
        professor: {
          select: {
            id: true,
            name: true,
            faculty: true,
            averageRate: true,
            totalReviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };
    const cacheKey = `reviews:user:${user.id}`;
    const reviews = await getOrSetCache(cacheKey, async () => {
      return await getReviewList(options);
    });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error: any) {
    next(createError(error.message, 500, errorCode.serverError));
  }
};

export const getUserCourseReviews = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      return next(
        createError("Unauthorized user", 401, errorCode.unauthenticated)
      );
    }

    const options: any = {
      where: {
        authorId: user.id,
        courseId: { not: null },
      },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            code: true,
            faculty: true,
            averageRate: true,
            totalReviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };

    const cacheKey = `reviews:user:${user.id}:courses`;

    const reviews = await getOrSetCache(cacheKey, async () => {
      return await getReviewList(options);
    });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error: any) {
    next(createError(error.message, 500, errorCode.serverError));
  }
};

export const getUserProfessorReviews = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await getUserById(req.userId!);
    if (!user) {
      return next(
        createError("Unauthorized user", 401, errorCode.unauthenticated)
      );
    }

    const options: any = {
      where: {
        authorId: user.id,
        professorId: { not: null },
      },
      include: {
        professor: {
          select: {
            id: true,
            name: true,
            faculty: true,
            averageRate: true,
            totalReviews: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    };

    const cacheKey = `reviews:user:${user.id}:professors`;

    const reviews = await getOrSetCache(cacheKey, async () => {
      return await getReviewList(options);
    });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error: any) {
    next(createError(error.message, 500, errorCode.serverError));
  }
};

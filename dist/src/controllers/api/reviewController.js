"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProfessorReviews = exports.getUserCourseReviews = exports.getAllUserReviews = exports.deleteReview = exports.updateReview = exports.createReview = void 0;
const express_validator_1 = require("express-validator");
const error_1 = require("../../utils/error");
const errorCode_1 = require("../../../config/errorCode");
const cache_1 = require("../../utils/cache");
const authService_1 = require("../../services/authService");
const reviewService_1 = require("../../services/reviewService");
const reviewHelper_1 = require("../../utils/reviewHelper");
const cacheQueue_1 = __importDefault(require("../../jobs/queues/cacheQueue"));
exports.createReview = [
    (0, express_validator_1.body)("courseId")
        .optional({ checkFalsy: true })
        .isInt({ gt: 0 })
        .withMessage("Course ID must be a positive integer")
        .toInt(),
    (0, express_validator_1.body)("professorId")
        .optional({ checkFalsy: true })
        .isInt({ gt: 0 })
        .withMessage("Professor ID must be a positive integer")
        .toInt(),
    (0, express_validator_1.body)("rating")
        .exists()
        .withMessage("Rating is required")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be an integer between 1 and 5")
        .toInt(),
    (0, express_validator_1.body)("comment")
        .optional()
        .isString()
        .withMessage("Comment must be a string")
        .trim(),
    (0, express_validator_1.body)().custom((value) => {
        if (!value.courseId && !value.professorId) {
            throw new Error("Either courseId or professorId is required");
        }
        if (value.courseId && value.professorId) {
            throw new Error("Cannot provide both courseId and professorId");
        }
        return true;
    }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("This account has not registered!", 401, errorCode_1.errorCode.unauthenticated));
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
            const review = await (0, reviewService_1.createOneReview)(data);
            await (0, reviewHelper_1.recalcReviewStats)({ courseId, professorId });
            const invalidatePatterns = ["courses:*", "professors:*", "reviews:*"];
            for (const pattern of invalidatePatterns) {
                await cacheQueue_1.default.add("invalidate-cache", { pattern }, {
                    jobId: `invalidate-${pattern.replace(/:/g, "_")}-${Date.now()}`,
                    priority: 1,
                });
            }
            res.status(201).json({
                success: true,
                message: "Review created successfully",
                data: review,
            });
        }
        catch (error) {
            if (error.code === "P2002") {
                return next((0, error_1.createError)("You have already reviewed this course or professor.", 400, errorCode_1.errorCode.duplicate));
            }
            next((0, error_1.createError)(error.message || "Failed to create review", 500, errorCode_1.errorCode.serverError));
        }
    },
];
exports.updateReview = [
    (0, express_validator_1.body)("reviewId")
        .isInt({ gt: 0 })
        .withMessage("Review ID must be a positive integer")
        .toInt(),
    (0, express_validator_1.body)("rating")
        .isInt({ min: 1, max: 5 })
        .withMessage("Rating must be an integer between 1 and 5")
        .toInt(),
    (0, express_validator_1.body)("comment").isString().withMessage("Comment must be a string").trim(),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("This account has not registered!", 401, errorCode_1.errorCode.unauthenticated));
        }
        try {
            const { reviewId, rating, comment } = req.body;
            const existingReview = await (0, reviewService_1.getOneReviewById)(+reviewId);
            console.log("Existing Review:", existingReview);
            if (!existingReview) {
                return next((0, error_1.createError)("Review not found", 404, errorCode_1.errorCode.notFound));
            }
            if (existingReview.authorId !== user.id) {
                return next((0, error_1.createError)("You are not authorized to update this review", 403, errorCode_1.errorCode.invalid));
            }
            const data = { rating, comment };
            const updatedReview = await (0, reviewService_1.updateOneReview)(+reviewId, data);
            await (0, reviewHelper_1.recalcReviewStats)(existingReview);
            const invalidatePatterns = ["courses:*", "professors:*", "reviews:*"];
            for (const pattern of invalidatePatterns) {
                await cacheQueue_1.default.add("invalidate-cache", { pattern }, {
                    jobId: `invalidate-${pattern.replace(/:/g, "_")}-${Date.now()}`,
                    priority: 1,
                });
            }
            res.status(200).json({
                success: true,
                message: "Review updated successfully",
                data: updatedReview.id,
            });
        }
        catch (error) {
            next((0, error_1.createError)(error.message || "Failed to update review", 500, errorCode_1.errorCode.serverError));
        }
    },
];
exports.deleteReview = [
    (0, express_validator_1.body)("reviewId")
        .isInt({ gt: 0 })
        .withMessage("Review ID must be a positive integer"),
    async (req, res, next) => {
        try {
            const { reviewId } = req.body;
            const existing = await (0, reviewService_1.getOneReviewById)(+reviewId);
            if (!existing) {
                return next((0, error_1.createError)("Review not found", 404, errorCode_1.errorCode.notFound));
            }
            const deleted = await (0, reviewService_1.deleteOneReview)(+reviewId);
            await (0, reviewHelper_1.recalcReviewStats)(existing);
            const invalidatePatterns = ["courses:*", "professors:*", "reviews:*"];
            for (const pattern of invalidatePatterns) {
                await cacheQueue_1.default.add("invalidate-cache", { pattern }, {
                    jobId: `invalidate-${pattern.replace(/:/g, "_")}-${Date.now()}`,
                    priority: 1,
                });
            }
            res.json({
                success: true,
                message: "Review deleted successfully",
                deletedReviewId: deleted.id,
            });
        }
        catch (error) {
            next((0, error_1.createError)(error.message || "Failed to delete review", 500, errorCode_1.errorCode.serverError));
        }
    },
];
const getAllUserReviews = async (req, res, next) => {
    try {
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("Unauthorized user", 401, errorCode_1.errorCode.unauthenticated));
        }
        const options = {
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
        const reviews = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, reviewService_1.getReviewList)(options);
        });
        res.json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    }
    catch (error) {
        next((0, error_1.createError)(error.message, 500, errorCode_1.errorCode.serverError));
    }
};
exports.getAllUserReviews = getAllUserReviews;
const getUserCourseReviews = async (req, res, next) => {
    try {
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("Unauthorized user", 401, errorCode_1.errorCode.unauthenticated));
        }
        const options = {
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
        const reviews = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, reviewService_1.getReviewList)(options);
        });
        res.json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    }
    catch (error) {
        next((0, error_1.createError)(error.message, 500, errorCode_1.errorCode.serverError));
    }
};
exports.getUserCourseReviews = getUserCourseReviews;
const getUserProfessorReviews = async (req, res, next) => {
    try {
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("Unauthorized user", 401, errorCode_1.errorCode.unauthenticated));
        }
        const options = {
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
        const reviews = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, reviewService_1.getReviewList)(options);
        });
        res.json({
            success: true,
            count: reviews.length,
            data: reviews,
        });
    }
    catch (error) {
        next((0, error_1.createError)(error.message, 500, errorCode_1.errorCode.serverError));
    }
};
exports.getUserProfessorReviews = getUserProfessorReviews;

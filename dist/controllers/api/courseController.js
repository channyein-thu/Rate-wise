"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCourseByPagination = exports.getCourseWithId = exports.getTotals = void 0;
const express_validator_1 = require("express-validator");
const error_1 = require("../../utils/error");
const errorCode_1 = require("../../config/errorCode");
const cache_1 = require("../../utils/cache");
const courseService_1 = require("../../services/courseService");
const authService_1 = require("../../services/authService");
const getTotals = async (req, res, next) => {
    try {
        const cacheKey = "courses:professors:reviews:total";
        const { courses, professors, reviews } = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, courseService_1.getTotalOfEverything)();
        });
        res.status(200).json({
            success: true,
            message: "totals fetched successfully",
            courses: courses,
            professors: professors,
            reviews: reviews,
        });
    }
    catch (error) {
        return next((0, error_1.createError)("Failed to fetch totals.", 500, errorCode_1.errorCode.serverError));
    }
};
exports.getTotals = getTotals;
exports.getCourseWithId = [
    (0, express_validator_1.param)("id", "Course ID must be a positive integer").isInt({ gt: 0 }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("This account has not registered!", 401, errorCode_1.errorCode.unauthenticated));
        }
        const courseId = parseInt(req.params.id, 10);
        const cacheKey = `courses:${courseId}`;
        const course = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, courseService_1.getCourseById)(+courseId);
        });
        if (!course) {
            return next((0, error_1.createError)("Course not found.", 404, errorCode_1.errorCode.invalid));
        }
        res.status(200).json({
            success: true,
            message: "Course fetched successfully",
            data: course,
        });
    },
];
exports.getCourseByPagination = [
    (0, express_validator_1.query)("averageRate", "averageRate must be a number")
        .isFloat({ min: 0 })
        .optional(),
    (0, express_validator_1.query)("faculty", "Faculty must be string").optional().isString(),
    (0, express_validator_1.query)("title", "Title must be string").optional().isString(),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, "INVALID_INPUT"));
        }
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("This account has not registered!", 401, errorCode_1.errorCode.unauthenticated));
        }
        const faculty = req.query.faculty;
        const averageRate = req.query.averageRate
            ? Number(req.query.averageRate)
            : undefined;
        const searchTerm = req.query.title;
        const where = {
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
        const courses = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, courseService_1.getCourseList)(options);
        });
        const nextCursor = courses.length > 0 ? courses[courses.length - 1].id : null;
        res.status(200).json({
            message: "Get All infinite courses",
            courses,
        });
    },
];

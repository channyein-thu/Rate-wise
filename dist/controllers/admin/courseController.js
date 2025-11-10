"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourse = exports.updateCourse = exports.getCourseByPagination = exports.createCourse = exports.getCourseWithId = void 0;
const express_validator_1 = require("express-validator");
const error_1 = require("../../utils/error");
const errorCode_1 = require("../../config/errorCode");
const cache_1 = require("../../utils/cache");
const cacheQueue_1 = __importDefault(require("../../jobs/queues/cacheQueue"));
const prisma_1 = require("../../../generated/prisma");
const courseService_1 = require("../../services/courseService");
exports.getCourseWithId = [
    (0, express_validator_1.param)("id", "Course ID must be a positive integer").isInt({ gt: 0 }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
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
exports.createCourse = [
    (0, express_validator_1.body)("title", "Course title is required").trim().notEmpty().escape(),
    (0, express_validator_1.body)("code", "Course code is required")
        .trim()
        .notEmpty()
        .withMessage("Course code is required")
        .isLength({ min: 7, max: 7 })
        .withMessage("Course code must be 7 digits")
        .isNumeric()
        .withMessage("Course code must contain only numbers"),
    (0, express_validator_1.body)("credits", "Credits are required")
        .isInt({ min: 1, max: 4 })
        .withMessage("Credits must be an integer between 1 and 4"),
    (0, express_validator_1.body)("description").optional().trim().escape(),
    (0, express_validator_1.body)("faculty", "Faculty is required")
        .notEmpty()
        .isIn(Object.values(prisma_1.Faculty))
        .withMessage("Invalid faculty value"),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { title, code, credits, description, faculty } = req.body;
        const course = await (0, courseService_1.getCourseByTitle)(title);
        if (course) {
            return next((0, error_1.createError)("This course title already exists.", 409, errorCode_1.errorCode.invalid));
        }
        const CourseData = {
            title,
            code,
            credits: Number(credits),
            description: description || "",
            faculty: faculty,
        };
        const newCourse = await (0, courseService_1.createOneCourse)(CourseData);
        if (!newCourse) {
            return next((0, error_1.createError)("Failed to create course.", 500, errorCode_1.errorCode.serverError));
        }
        await cacheQueue_1.default.add("invalidate-course-cache", {
            pattern: "courses:*",
        }, {
            jobId: `invalidate-${Date.now()}`,
            priority: 1,
        });
        res.status(201).json({
            success: true,
            message: "Course created successfully",
            data: newCourse.id,
        });
    },
];
exports.getCourseByPagination = [
    (0, express_validator_1.query)("cursor", "Cursor must be Course ID.").isInt({ gt: 0 }).optional(),
    (0, express_validator_1.query)("limit", "Limit must be an integer greater than 0.")
        .isInt({ gt: 0 })
        .optional(),
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
        const lastCursor = req.query.cursor ? Number(req.query.cursor) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : 6;
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
            where,
            take: limit + 1,
            skip: lastCursor ? 1 : 0,
            cursor: lastCursor ? { id: lastCursor } : undefined,
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
        const hasNextPage = courses.length > limit;
        if (hasNextPage) {
            courses.pop();
        }
        const nextCursor = courses.length > 0 ? courses[courses.length - 1].id : null;
        res.status(200).json({
            message: "Get All infinite courses",
            hasNextPage,
            nextCursor,
            prevCursor: lastCursor || null,
            courses,
        });
    },
];
exports.updateCourse = [
    (0, express_validator_1.body)("courseId", "Course ID is required").isInt({ gt: 0 }),
    (0, express_validator_1.body)("title", "Course title is required").trim().notEmpty().escape(),
    (0, express_validator_1.body)("code", "Course code is required")
        .trim()
        .notEmpty()
        .withMessage("Course code is required")
        .isLength({ min: 7, max: 7 })
        .withMessage("Course code must be 7 digits")
        .isNumeric()
        .withMessage("Course code must contain only numbers"),
    (0, express_validator_1.body)("credits", "Credits are required")
        .isInt({ min: 1, max: 4 })
        .withMessage("Credits must be an integer between 1 and 4"),
    (0, express_validator_1.body)("description").optional().trim().escape(),
    (0, express_validator_1.body)("faculty", "Faculty is required")
        .notEmpty()
        .isIn(Object.values(prisma_1.Faculty))
        .withMessage("Invalid faculty value"),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { courseId, title, code, credits, description, faculty } = req.body;
        const existingCourse = await (0, courseService_1.getCourseById)(+courseId);
        if (!existingCourse) {
            return next((0, error_1.createError)("Course not found.", 404, errorCode_1.errorCode.invalid));
        }
        let updateData = {};
        updateData.code = code;
        updateData.credits = Number(credits);
        updateData.description = description || "";
        updateData.faculty = faculty;
        if (existingCourse.title !== title) {
            const course = await (0, courseService_1.getCourseByTitle)(title);
            if (course) {
                return next((0, error_1.createError)("This course title already exists.", 409, errorCode_1.errorCode.invalid));
            }
            updateData.title = title;
        }
        const updatedCourse = await (0, courseService_1.updateOneCourse)(existingCourse.id, updateData);
        if (!updatedCourse) {
            return next((0, error_1.createError)("Failed to update course.", 500, errorCode_1.errorCode.serverError));
        }
        await cacheQueue_1.default.add("invalidate-course-cache", {
            pattern: "courses:*",
        }, {
            jobId: `invalidate-${Date.now()}`,
            priority: 1,
        });
        res.status(200).json({
            success: true,
            message: "Course updated successfully",
            updatedCourseId: updatedCourse.id,
        });
    },
];
exports.deleteCourse = [
    (0, express_validator_1.body)("courseId", "Course ID is required").isInt({ gt: 0 }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { courseId } = req.body;
        const existingCourse = await (0, courseService_1.getCourseById)(+courseId);
        if (!existingCourse) {
            return next((0, error_1.createError)("Course not found.", 404, errorCode_1.errorCode.invalid));
        }
        const deletedCourse = await (0, courseService_1.deleteOneCourse)(+courseId);
        if (!deletedCourse) {
            return next((0, error_1.createError)("Failed to delete course.", 500, errorCode_1.errorCode.serverError));
        }
        await cacheQueue_1.default.add("invalidate-course-cache", {
            pattern: "courses:*",
        }, {
            jobId: `invalidate-${Date.now()}`,
            priority: 1,
        });
        res.status(200).json({
            success: true,
            message: "Course deleted successfully",
            deletedCourseId: deletedCourse.id,
        });
    },
];

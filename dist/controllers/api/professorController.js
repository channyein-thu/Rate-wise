"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfessorWithId = exports.getProfessorByPagination = void 0;
const express_validator_1 = require("express-validator");
const error_1 = require("../../utils/error");
const errorCode_1 = require("../../config/errorCode");
const cache_1 = require("../../utils/cache");
const authService_1 = require("../../services/authService");
const professorService_1 = require("../../services/professorService");
exports.getProfessorByPagination = [
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
                name: true,
                email: true,
                faculty: true,
                education: { select: { id: true, degree: true } },
                image: true,
                totalReviews: true,
                averageRate: true,
            },
            orderBy: {
                id: "desc",
            },
        };
        const cacheKey = `professors:${JSON.stringify(req.query)}`;
        const professors = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, professorService_1.getProfessorList)(options);
        });
        res.status(200).json({
            message: "Get All infinite professors",
            professors,
        });
    },
];
exports.getProfessorWithId = [
    (0, express_validator_1.param)("id", "Professor ID must be a positive integer").isInt({ gt: 0 }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const user = await (0, authService_1.getUserById)(req.userId);
        if (!user) {
            return next((0, error_1.createError)("This account has not registered!", 401, errorCode_1.errorCode.unauthenticated));
        }
        const professorId = parseInt(req.params.id, 10);
        const cacheKey = `professors:${professorId}`;
        const professor = await (0, cache_1.getOrSetCache)(cacheKey, async () => {
            return await (0, professorService_1.getProfessorById)(+professorId);
        });
        if (!professor) {
            return next((0, error_1.createError)("Professor not found.", 404, errorCode_1.errorCode.invalid));
        }
        res.status(200).json({
            success: true,
            message: "Professor fetched successfully",
            data: professor,
        });
    },
];

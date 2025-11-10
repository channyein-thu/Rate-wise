"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfessorWithId = exports.updateProfessorImage = exports.getProfessorByPagination = exports.deleteProfessor = exports.updateProfessor = exports.createProfessor = void 0;
const express_validator_1 = require("express-validator");
const error_1 = require("../../utils/error");
const errorCode_1 = require("../../config/errorCode");
const cache_1 = require("../../utils/cache");
const cacheQueue_1 = __importDefault(require("../../jobs/queues/cacheQueue"));
const prisma_1 = require("../../../generated/prisma");
const promises_1 = require("node:fs/promises");
const path_1 = __importDefault(require("path"));
const professorService_1 = require("../../services/professorService");
const removeFile = async (originalFile) => {
    try {
        const originalFilePath = path_1.default.join(__dirname, "../../..", "/uploads/images", originalFile);
        await (0, promises_1.unlink)(originalFilePath);
    }
    catch (error) {
        console.log(error);
    }
};
const educationSanitizer = (value) => {
    if (!value)
        return [];
    if (Array.isArray(value)) {
        return value.map((e) => e.trim()).filter(Boolean);
    }
    if (typeof value === "string" && value.startsWith("[")) {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
                return parsed.map((e) => e.trim()).filter(Boolean);
            }
        }
        catch { }
    }
    if (typeof value === "string") {
        return value
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);
    }
    return [];
};
exports.createProfessor = [
    (0, express_validator_1.body)("name", "Professor name is required").trim().notEmpty().escape(),
    (0, express_validator_1.body)("faculty", "Faculty is required")
        .notEmpty()
        .isIn(Object.values(prisma_1.Faculty))
        .withMessage("Invalid faculty value"),
    (0, express_validator_1.body)("email", "Email must be a valid email address")
        .notEmpty()
        .isEmail()
        .withMessage("Invalid email format"),
    (0, express_validator_1.body)("education")
        .optional({ nullable: true })
        .customSanitizer(educationSanitizer),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            if (req.file) {
                await removeFile(req.file.filename);
            }
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { name, faculty, email, education } = req.body;
        if (!req.file) {
            return next((0, error_1.createError)("Profile image is required", 400, errorCode_1.errorCode.invalid));
        }
        const image = req.file.filename;
        const existingProfessor = await (0, professorService_1.getProfessorByName)(name);
        if (existingProfessor) {
            await removeFile(req.file.filename);
            return next((0, error_1.createError)("Professor with this name already exists", 400, errorCode_1.errorCode.duplicate));
        }
        const professorData = { name, faculty, email, image, education };
        try {
            const professor = await (0, professorService_1.createOneProfessor)(professorData);
            if (!professor) {
                await removeFile(req.file.filename);
                return next((0, error_1.createError)("Failed to create professor", 500, errorCode_1.errorCode.serverError));
            }
            await cacheQueue_1.default.add("invalidate-professor-cache", {
                pattern: "professors:*",
            }, {
                jobId: `invalidate-${Date.now()}`,
                priority: 1,
            });
            res.status(201).json({
                success: true,
                message: "Professor created successfully",
                professorId: professor.id,
            });
        }
        catch (error) {
            await removeFile(req.file.filename);
            next((0, error_1.createError)(error instanceof Error ? error.message : "Internal Server Error", 500, errorCode_1.errorCode.serverError));
        }
    },
];
exports.updateProfessor = [
    (0, express_validator_1.body)("professorId", "Professor ID is required")
        .isInt({ gt: 0 })
        .withMessage("Invalid professor ID"),
    (0, express_validator_1.body)("name", "Professor name is required").trim().notEmpty().escape(),
    (0, express_validator_1.body)("faculty", "Faculty is required")
        .notEmpty()
        .isIn(Object.values(prisma_1.Faculty))
        .withMessage("Invalid faculty value"),
    (0, express_validator_1.body)("email", "Email must be a valid email address")
        .notEmpty()
        .isEmail()
        .withMessage("Invalid email format"),
    (0, express_validator_1.body)("education")
        .optional({ nullable: true })
        .customSanitizer(educationSanitizer),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { professorId, name, faculty, email, education } = req.body;
        const existingProfessor = await (0, professorService_1.getProfessorById)(+professorId);
        if (!existingProfessor) {
            return next((0, error_1.createError)("Professor not found", 404, errorCode_1.errorCode.notFound));
        }
        let newprofessorData = {};
        newprofessorData.faculty = faculty;
        if (name !== existingProfessor.name) {
            const nameExists = await (0, professorService_1.getProfessorByName)(name);
            if (nameExists) {
                return next((0, error_1.createError)("Professor with this name already exists", 400, errorCode_1.errorCode.duplicate));
            }
            newprofessorData.name = name;
        }
        if (email !== existingProfessor.email) {
            const emailExists = await (0, professorService_1.getProfessorByEmail)(email);
            if (emailExists) {
                return next((0, error_1.createError)("Professor with this email already exists", 400, errorCode_1.errorCode.duplicate));
            }
            newprofessorData.email = email;
        }
        if (education && education.length > 0) {
            newprofessorData.education = education;
        }
        try {
            const updatedProfessor = await (0, professorService_1.updateOneProfessor)(existingProfessor.id, newprofessorData);
            if (!updatedProfessor) {
                return next((0, error_1.createError)("Failed to update professor", 500, errorCode_1.errorCode.serverError));
            }
            await cacheQueue_1.default.add("invalidate-professor-cache", {
                pattern: "professors:*",
            }, {
                jobId: `invalidate-${Date.now()}`,
                priority: 1,
            });
            res.status(200).json({
                success: true,
                message: "Professor updated successfully",
                professorId: updatedProfessor.id,
            });
        }
        catch (error) {
            next((0, error_1.createError)(error instanceof Error ? error.message : "Internal Server Error", 500, errorCode_1.errorCode.serverError));
        }
    },
];
exports.deleteProfessor = [
    (0, express_validator_1.body)("professorId", "Professor ID is required").isInt({ gt: 0 }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { professorId } = req.body;
        const existingProfessor = await (0, professorService_1.getProfessorById)(+professorId);
        if (!existingProfessor) {
            return next((0, error_1.createError)("Professor not found.", 404, errorCode_1.errorCode.notFound));
        }
        const deletedProfessor = await (0, professorService_1.deleteOneProfessor)(professorId);
        if (!deletedProfessor) {
            return next((0, error_1.createError)("Failed to delete professor.", 500, errorCode_1.errorCode.serverError));
        }
        await cacheQueue_1.default.add("invalidate-professor-cache", {
            pattern: "professors:*",
        }, {
            jobId: `invalidate-${Date.now()}`,
            priority: 1,
        });
        if (existingProfessor.image) {
            await removeFile(existingProfessor.image);
        }
        res.status(200).json({
            success: true,
            message: "Professor deleted successfully",
            deletedProfessorId: deletedProfessor.id,
        });
    },
];
exports.getProfessorByPagination = [
    (0, express_validator_1.query)("cursor", "Cursor must be Professor ID.").isInt({ gt: 0 }).optional(),
    (0, express_validator_1.query)("limit", "Limit must be an integer greater than 0.")
        .isInt({ gt: 0 })
        .optional(),
    (0, express_validator_1.query)("averageRate", "averageRate must be a number")
        .isFloat({ min: 0 })
        .optional(),
    (0, express_validator_1.query)("faculty", "Faculty must be string").optional().isString(),
    (0, express_validator_1.query)("searchTerm", "Search term must be string").optional().isString(),
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
        const searchTerm = req.query.searchTerm;
        const where = {
            AND: [
                faculty && { faculty: { in: faculty.split(",") } },
                averageRate !== undefined && {
                    averageRate: { gte: averageRate },
                },
                searchTerm && {
                    OR: [
                        { name: { contains: searchTerm } },
                        { email: { contains: searchTerm } },
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
                name: true,
                email: true,
                faculty: true,
                education: {
                    select: { degree: true },
                },
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
        const hasNextPage = professors.length > limit;
        if (hasNextPage) {
            professors.pop();
        }
        const nextCursor = professors.length > 0 ? professors[professors.length - 1].id : null;
        res.status(200).json({
            message: "Get All infinite professors",
            hasNextPage,
            nextCursor,
            prevCursor: lastCursor || null,
            professors,
        });
    },
];
exports.updateProfessorImage = [
    (0, express_validator_1.body)("professorId", "Professor ID is required")
        .isInt({ gt: 0 })
        .withMessage("Invalid professor ID"),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            if (req.file) {
                await removeFile(req.file.filename);
            }
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        if (!req.file) {
            return next((0, error_1.createError)("Profile image is required", 400, errorCode_1.errorCode.invalid));
        }
        const professorId = req.body.professorId;
        const image = req.file.filename;
        const existingProfessor = await (0, professorService_1.getProfessorById)(Number(professorId));
        if (!existingProfessor) {
            if (req.file) {
                await removeFile(req.file.filename);
            }
            return next((0, error_1.createError)("Professor not found", 404, errorCode_1.errorCode.notFound));
        }
        const updatedProfessor = await (0, professorService_1.updateOneProfessor)(existingProfessor.id, {
            image,
        });
        if (!updatedProfessor) {
            if (req.file) {
                await removeFile(req.file.filename);
            }
            return next((0, error_1.createError)("Failed to update professor", 500, errorCode_1.errorCode.serverError));
        }
        if (existingProfessor.image) {
            await removeFile(existingProfessor.image);
        }
        await cacheQueue_1.default.add("invalidate-professor-cache", {
            pattern: "professors:*",
        }, {
            jobId: `invalidate-${Date.now()}`,
            priority: 1,
        });
        res.status(201).json({
            success: true,
            message: "Professor image updated successfully",
            professorId: updatedProfessor.id,
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

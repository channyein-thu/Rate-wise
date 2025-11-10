"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTotalOfEverything = exports.deleteOneCourse = exports.updateOneCourse = exports.getCourseById = exports.getCourseList = exports.createOneCourse = exports.getCourseByTitle = void 0;
const prisma_1 = require("../../generated/prisma");
const extendPrisma_1 = require("./extendPrisma");
const prisma = new prisma_1.PrismaClient();
const getCourseByTitle = async (title) => {
    return prisma.course.findUnique({
        where: { title },
    });
};
exports.getCourseByTitle = getCourseByTitle;
const createOneCourse = async (data) => {
    return prisma.course.create({
        data,
    });
};
exports.createOneCourse = createOneCourse;
const getCourseList = async (options) => {
    return prisma.course.findMany(options);
};
exports.getCourseList = getCourseList;
const getCourseById = async (id) => {
    return extendPrisma_1.prismaExtend.course.findUnique({
        where: { id },
        select: {
            id: true,
            title: true,
            description: true,
            code: true,
            credits: true,
            faculty: true,
            averageRate: true,
            updatedAt: true,
            reviews: {
                select: {
                    id: true,
                    rating: true,
                    comment: true,
                    updatedAt: true,
                },
            },
        },
    });
};
exports.getCourseById = getCourseById;
const updateOneCourse = async (id, data) => {
    return prisma.course.update({
        where: { id },
        data,
    });
};
exports.updateOneCourse = updateOneCourse;
const deleteOneCourse = async (id) => {
    return prisma.course.delete({
        where: { id },
    });
};
exports.deleteOneCourse = deleteOneCourse;
const getTotalOfEverything = async () => {
    const [courses, professors, reviews] = await Promise.all([
        prisma.course.count(),
        prisma.professor.count(),
        prisma.review.count(),
    ]);
    return {
        courses,
        professors,
        reviews,
    };
};
exports.getTotalOfEverything = getTotalOfEverything;

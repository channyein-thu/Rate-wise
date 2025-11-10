"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReviewList = exports.deleteOneReview = exports.getOneReviewById = exports.updateOneReview = exports.createOneReview = void 0;
const prisma_1 = require("../../generated/prisma");
const extendPrisma_1 = require("./extendPrisma");
const prisma = new prisma_1.PrismaClient();
const createOneReview = async (data) => {
    return prisma.review.create({
        data,
    });
};
exports.createOneReview = createOneReview;
const updateOneReview = async (id, data) => {
    return prisma.review.update({
        where: { id },
        data,
    });
};
exports.updateOneReview = updateOneReview;
const getOneReviewById = async (id) => {
    return prisma.review.findUnique({
        where: { id },
        select: { courseId: true, professorId: true, authorId: true },
    });
};
exports.getOneReviewById = getOneReviewById;
const deleteOneReview = async (id) => {
    return prisma.review.delete({
        where: { id },
    });
};
exports.deleteOneReview = deleteOneReview;
const getReviewList = async (options) => {
    return extendPrisma_1.prismaExtend.review.findMany(options);
};
exports.getReviewList = getReviewList;

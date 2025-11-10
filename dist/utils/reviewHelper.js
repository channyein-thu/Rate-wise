"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalcReviewStats = recalcReviewStats;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
async function recalcReviewStats({ courseId, professorId, }) {
    try {
        if (courseId) {
            const reviews = await prisma.review.findMany({
                where: { courseId },
                select: { rating: true },
            });
            const totalReviews = reviews.length;
            const averageRate = totalReviews > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
                : 0;
            await prisma.course.update({
                where: { id: courseId },
                data: { totalReviews, averageRate },
            });
        }
        if (professorId) {
            const reviews = await prisma.review.findMany({
                where: { professorId },
                select: { rating: true },
            });
            const totalReviews = reviews.length;
            const averageRate = totalReviews > 0
                ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
                : 0;
            await prisma.professor.update({
                where: { id: professorId },
                data: { totalReviews, averageRate },
            });
        }
    }
    catch (error) {
        console.error("Failed to recalculate review stats:", error);
        throw error;
    }
}

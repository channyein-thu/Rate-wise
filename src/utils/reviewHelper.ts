import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

interface RecalcReviewStatsParams {
  courseId?: number | null;
  professorId?: number | null;
}
/**
 * Recalculate totalReviews and averageRate for Course or Professor
 * after a review is created, updated, or deleted.
 */
export async function recalcReviewStats({
  courseId,
  professorId,
}: RecalcReviewStatsParams): Promise<void> {
  try {
    if (courseId) {
      const reviews = await prisma.review.findMany({
        where: { courseId },
        select: { rating: true },
      });

      const totalReviews = reviews.length;
      const averageRate =
        totalReviews > 0
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
      const averageRate =
        totalReviews > 0
          ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
          : 0;

      await prisma.professor.update({
        where: { id: professorId },
        data: { totalReviews, averageRate },
      });
    }
  } catch (error) {
    console.error("Failed to recalculate review stats:", error);
    throw error; // let the caller handle the error
  }
}

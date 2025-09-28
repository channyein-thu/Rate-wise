import { PrismaClient } from "../../generated/prisma";

export const prismaExtend = new PrismaClient().$extends({
  result: {
    professor: {
      updatedAt: {
        needs: { updatedAt: true },
        compute(professor) {
          return professor?.updatedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        },
      },
    },
    course: {
      updatedAt: {
        needs: { updatedAt: true },
        compute(course) {
          return course?.updatedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        },
      },
    },
    review: {
      updatedAt: {
        needs: { updatedAt: true },
        compute(review) {
          return review?.updatedAt.toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          });
        },
      },
    },
  },
});

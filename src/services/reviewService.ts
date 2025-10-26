import { PrismaClient } from "../../generated/prisma";
import { prismaExtend } from "./extendPrisma";

const prisma = new PrismaClient();

export const createOneReview = async (data: any) => {
  return prisma.review.create({
    data,
  });
};

export const updateOneReview = async (id: number, data: any) => {
  return prisma.review.update({
    where: { id },
    data,
  });
};

export const getOneReviewById = async (id: number) => {
  return prisma.review.findUnique({
    where: { id },
    select: { courseId: true, professorId: true, authorId: true },
  });
};

export const deleteOneReview = async (id: number) => {
  return prisma.review.delete({
    where: { id },
  });
};

export const getReviewList = async (options: any) => {
  return prismaExtend.review.findMany(options);
};

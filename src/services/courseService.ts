import { create } from "domain";
import { PrismaClient } from "../../generated/prisma";
import { prismaExtend } from "./extendPrisma";

const prisma = new PrismaClient();

export const getCourseByTitle = async (title: string) => {
  return prisma.course.findUnique({
    where: { title },
  });
};

export const createOneCourse = async (data: any) => {
  return prisma.course.create({
    data,
  });
};

export const getCourseList = async (options: any) => {
  return prisma.course.findMany(options);
};

export const getCourseById = async (id: number) => {
  return prismaExtend.course.findUnique({
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

          // Add other fields as needed, but omit 'createAt'
          // createAt: false, // Do NOT include this line
        },
      },
    },
  });
};

export const updateOneCourse = async (id: number, data: any) => {
  return prisma.course.update({
    where: { id },
    data,
  });
};

export const deleteOneCourse = async (id: number) => {
  return prisma.course.delete({
    where: { id },
  });
};

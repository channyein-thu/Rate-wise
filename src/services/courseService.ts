import { PrismaClient } from "../../generated/prisma";

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
  return prisma.course.findUnique({
    where: { id },
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

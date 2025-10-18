import { PrismaClient } from "../../generated/prisma";
import { prismaExtend } from "./extendPrisma";

const prisma = new PrismaClient();

export const getProfessorByName = async (name: string) => {
  return prisma.professor.findUnique({
    where: { name },
  });
};

export const createOneProfessor = async (data: any) => {
  const professorData: any = {
    name: data.name,
    faculty: data.faculty,
    email: data.email,
    image: data.image,
  };

  if (data.education && data.education.length > 0) {
    professorData.education = {
      connectOrCreate: data.education.map((degree: string) => ({
        where: { degree },
        create: { degree },
      })),
    };
  }

  return prisma.professor.create({
    data: professorData,
    include: { education: true },
  });
};

export const getProfessorList = async (options: any) => {
  return prisma.professor.findMany(options);
};

export const getProfessorById = async (id: number) => {
  return prismaExtend.professor.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      faculty: true,
      image: true,
      education: {
        select: { degree: true },
      },
      totalReviews: true,
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

export const updateOneProfessor = async (id: number, data: any) => {
  const { education, ...professorFields } = data;

  return prisma.professor.update({
    where: { id },
    data: {
      ...professorFields,
      ...(education &&
        education.length > 0 && {
          education: {
            set: [], // clear existing
            connectOrCreate: education.map((degree: string) => ({
              where: { degree },
              create: { degree },
            })),
          },
        }),
    },
    include: { education: true },
  });
};

export const deleteOneProfessor = async (id: number) => {
  return prisma.professor.delete({
    where: { id },
  });
};

export const getProfessorByEmail = async (email: string) => {
  return prisma.professor.findUnique({
    where: { email },
  });
};

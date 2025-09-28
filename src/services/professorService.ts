import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const getProfessorByName = async (name: string) => {
  return prisma.professor.findUnique({
    where: { name },
  });
};

export const createOneProfessor = async (data: any) => {
  return prisma.professor.create({
    data,
  });
};

export const getProfessorList = async (options: any) => {
  return prisma.professor.findMany(options);
};

export const getProfessorById = async (id: number) => {
  return prisma.professor.findUnique({
    where: { id },
  });
};

export const updateOneProfessor = async (id: number, data: any) => {
  return prisma.professor.update({
    where: { id },
    data,
  });
};

export const deleteOneProfessor = async (id: number) => {
  return prisma.professor.delete({
    where: { id },
  });
};

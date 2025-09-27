import { PrismaClient } from "../../generated/prisma";

const prisma = new PrismaClient();

export const getUserByEmail = async (email: string) => {
  return prisma.user.findUnique({
    where: { email },
  });
};

export const getOtpByEmail = async (email: string) => {
  return prisma.otp.findUnique({
    where: { email },
  });
};

export const createOtp = async (data: any) => {
  return prisma.otp.create({
    data,
  });
};

export const updateOtp = async (id: number, data: any) => {
  return prisma.otp.update({
    where: { id },
    data,
  });
};

export const createUser = async (data: any) => {
  return prisma.user.create({
    data,
  });
};

export const updateUser = async (id: number, data: any) => {
  return prisma.user.update({
    where: { id },
    data,
  });
};

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { id },
  });
};

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = exports.updateUser = exports.createUser = exports.updateOtp = exports.createOtp = exports.getOtpByEmail = exports.getUserByEmail = void 0;
const prisma_1 = require("../../generated/prisma");
const prisma = new prisma_1.PrismaClient();
const getUserByEmail = async (email) => {
    return prisma.user.findUnique({
        where: { email },
    });
};
exports.getUserByEmail = getUserByEmail;
const getOtpByEmail = async (email) => {
    return prisma.otp.findUnique({
        where: { email },
    });
};
exports.getOtpByEmail = getOtpByEmail;
const createOtp = async (data) => {
    return prisma.otp.create({
        data,
    });
};
exports.createOtp = createOtp;
const updateOtp = async (id, data) => {
    return prisma.otp.update({
        where: { id },
        data,
    });
};
exports.updateOtp = updateOtp;
const createUser = async (data) => {
    return prisma.user.create({
        data,
    });
};
exports.createUser = createUser;
const updateUser = async (id, data) => {
    return prisma.user.update({
        where: { id },
        data,
    });
};
exports.updateUser = updateUser;
const getUserById = async (id) => {
    return prisma.user.findUnique({
        where: { id },
    });
};
exports.getUserById = getUserById;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfessorByEmail = exports.deleteOneProfessor = exports.updateOneProfessor = exports.getProfessorById = exports.getProfessorList = exports.createOneProfessor = exports.getProfessorByName = void 0;
const prisma_1 = require("../../generated/prisma");
const extendPrisma_1 = require("./extendPrisma");
const prisma = new prisma_1.PrismaClient();
const getProfessorByName = async (name) => {
    return prisma.professor.findUnique({
        where: { name },
    });
};
exports.getProfessorByName = getProfessorByName;
const createOneProfessor = async (data) => {
    const professorData = {
        name: data.name,
        faculty: data.faculty,
        email: data.email,
        image: data.image,
    };
    if (data.education && data.education.length > 0) {
        professorData.education = {
            connectOrCreate: data.education.map((degree) => ({
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
exports.createOneProfessor = createOneProfessor;
const getProfessorList = async (options) => {
    return prisma.professor.findMany(options);
};
exports.getProfessorList = getProfessorList;
const getProfessorById = async (id) => {
    return extendPrisma_1.prismaExtend.professor.findUnique({
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
exports.getProfessorById = getProfessorById;
const updateOneProfessor = async (id, data) => {
    const { education, ...professorFields } = data;
    return prisma.professor.update({
        where: { id },
        data: {
            ...professorFields,
            ...(education &&
                education.length > 0 && {
                education: {
                    set: [],
                    connectOrCreate: education.map((degree) => ({
                        where: { degree },
                        create: { degree },
                    })),
                },
            }),
        },
        include: { education: true },
    });
};
exports.updateOneProfessor = updateOneProfessor;
const deleteOneProfessor = async (id) => {
    return prisma.professor.delete({
        where: { id },
    });
};
exports.deleteOneProfessor = deleteOneProfessor;
const getProfessorByEmail = async (email) => {
    return prisma.professor.findUnique({
        where: { email },
    });
};
exports.getProfessorByEmail = getProfessorByEmail;

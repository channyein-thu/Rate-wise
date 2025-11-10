"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const prisma_1 = require("../../generated/prisma");
exports.prisma = new prisma_1.PrismaClient();
process.on("SIGINT", async () => {
    await exports.prisma.$disconnect();
    process.exit(0);
});
process.on("SIGTERM", async () => {
    await exports.prisma.$disconnect();
    process.exit(0);
});

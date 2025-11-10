// prisma/prisma.config.ts
import "dotenv/config"; // ✅ loads DATABASE_URL from .env
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  migrations: {
    path: "./prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!, // ✅ use process.env instead of env()
  },
});

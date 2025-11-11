FROM node:22-alpine

WORKDIR /app

# 1️⃣ Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev

# 2️⃣ Copy Prisma schema first so we can generate
COPY prisma ./prisma
RUN npx prisma generate

# 3️⃣ Copy remaining build artifacts
COPY dist ./dist
COPY generated/prisma ./generated/prisma
COPY .env .env

# 4️⃣ Create uploads directory
RUN mkdir -p /app/uploads/images

EXPOSE 8080

# 5️⃣ Start app after applying migrations
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]


FROM node:22-alpine
WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY dist ./dist
COPY prisma ./prisma
COPY generated/prisma ./generated/prisma
COPY .env .env

RUN mkdir -p /app/uploads/images

EXPOSE 8080

CMD npx prisma migrate deploy && node dist/index.js

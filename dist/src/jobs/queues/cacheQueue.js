"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../../../config/redisClient");
const cacheQueue = new bullmq_1.Queue("cache-invalidation", {
    connection: redisClient_1.redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 1000,
    },
});
exports.default = cacheQueue;

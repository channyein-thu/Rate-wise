"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.caheWorker = void 0;
const bullmq_1 = require("bullmq");
const redisClient_1 = require("../../../config/redisClient");
exports.caheWorker = new bullmq_1.Worker("cache-invalidation", async (job) => {
    const { pattern } = job.data;
    await invalidateCache(pattern);
}, {
    connection: redisClient_1.redis,
    concurrency: 5,
});
exports.caheWorker.on("completed", (job) => {
    console.log(`Job completed with result ${job.id}`);
});
exports.caheWorker.on("failed", (job, err) => {
    console.log(`Job ${job.id} failed with ${err.message}`);
});
const invalidateCache = async (pattern) => {
    try {
        const stream = redisClient_1.redis.scanStream({
            match: pattern,
            count: 100,
        });
        const pipeline = redisClient_1.redis.pipeline();
        let totalKeys = 0;
        stream.on("data", (keys) => {
            if (keys.length > 0) {
                keys.forEach((key) => {
                    pipeline.del(key);
                    totalKeys++;
                });
            }
        });
        await new Promise((resolve, reject) => {
            stream.on("end", async () => {
                try {
                    if (totalKeys > 0) {
                        await pipeline.exec();
                        console.log(`Invalidated ${totalKeys} keys`);
                    }
                    resolve();
                }
                catch (execError) {
                    reject(execError);
                }
            });
            stream.on("error", (error) => {
                reject(error);
            });
        });
    }
    catch (error) {
        console.error("Cache Invalidation error: ", error);
        throw error;
    }
};

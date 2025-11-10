"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrSetCache = void 0;
const redisClient_1 = require("../../config/redisClient");
const getOrSetCache = async (key, cb) => {
    try {
        const cachedData = await redisClient_1.redis.get(key);
        if (cachedData) {
            console.log("Cache hit");
            return JSON.parse(cachedData);
        }
        console.log("Cache miss");
        const freshData = await cb();
        await redisClient_1.redis.setex(key, 3600, JSON.stringify(freshData));
        return freshData;
    }
    catch (error) {
        console.error("Redis error: ", error);
        throw error;
    }
};
exports.getOrSetCache = getOrSetCache;

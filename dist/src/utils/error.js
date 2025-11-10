"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createError = void 0;
const createError = (message, status, code) => {
    const error = new Error(message);
    error.status = status;
    error.code = code;
    return error;
};
exports.createError = createError;

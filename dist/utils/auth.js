"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUserIfNotExist = exports.checkOtpRow = exports.checkOtpErrorIfSameDate = exports.checkUserExist = void 0;
const errorCode_1 = require("../config/errorCode");
const checkUserExist = (user) => {
    if (user) {
        const error = new Error("This Email has already been registered");
        error.status = 409;
        error.code = errorCode_1.errorCode.userExist;
        throw error;
    }
};
exports.checkUserExist = checkUserExist;
const checkOtpErrorIfSameDate = (isSameDate, errorCount) => {
    if (isSameDate && errorCount === 5) {
        const error = new Error("OTP is wrong for 5 times. Please try again tomorrow");
        error.status = 401;
        error.code = errorCode_1.errorCode.overLimit;
        throw error;
    }
};
exports.checkOtpErrorIfSameDate = checkOtpErrorIfSameDate;
const checkOtpRow = (otpRow) => {
    if (!otpRow) {
        const error = new Error("Email is incorrect.");
        error.status = 400;
        error.code = errorCode_1.errorCode.invalid;
        throw error;
    }
};
exports.checkOtpRow = checkOtpRow;
const checkUserIfNotExist = (user) => {
    if (!user) {
        const error = new Error("You are not authenticated.");
        error.status = 401;
        error.code = errorCode_1.errorCode.unauthenticated;
        throw error;
    }
};
exports.checkUserIfNotExist = checkUserIfNotExist;

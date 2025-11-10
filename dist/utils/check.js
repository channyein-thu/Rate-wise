"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkingCreatedModel = exports.checkModelIfExist = void 0;
const errorCode_1 = require("../config/errorCode");
const checkModelIfExist = (model) => {
    if (!model) {
        const error = new Error("This model does not exist.");
        error.status = 409;
        error.code = errorCode_1.errorCode.invalid;
        throw error;
    }
};
exports.checkModelIfExist = checkModelIfExist;
const checkingCreatedModel = (model) => {
    if (!model) {
        const error = new Error("Cannot create model. Please try again.");
        error.status = 500;
        error.code = errorCode_1.errorCode.serverError;
        throw error;
    }
};
exports.checkingCreatedModel = checkingCreatedModel;

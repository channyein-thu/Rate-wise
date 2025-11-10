"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = void 0;
const error_1 = require("../utils/error");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const errorCode_1 = require("../../config/errorCode");
const authService_1 = require("../services/authService");
const auth = (req, res, next) => {
    const accessToken = req.cookies ? req.cookies.accessToken : null;
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;
    const generateNewTokens = async () => {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        }
        catch (err) {
            return next((0, error_1.createError)("Invalid refresh token", 403, errorCode_1.errorCode.unauthenticated));
        }
        if (isNaN(decoded.id)) {
            return next((0, error_1.createError)("You are not an authenticated user.", 401, errorCode_1.errorCode.unauthenticated));
        }
        const user = await (0, authService_1.getUserById)(decoded.id);
        if (!user) {
            return next((0, error_1.createError)("User not found.", 404, errorCode_1.errorCode.unauthenticated));
        }
        if (user.email !== decoded.email) {
            return next((0, error_1.createError)("You are not an authenticated user.", 401, errorCode_1.errorCode.unauthenticated));
        }
        if (user.randToken !== refreshToken) {
            return next((0, error_1.createError)("You are not an authenticated user.", 401, errorCode_1.errorCode.unauthenticated));
        }
        const accessTokenPayload = { id: user.id };
        const refreshTokenPayload = { id: user.id, email: user.email };
        const newAccessToken = jsonwebtoken_1.default.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: 60 * 15,
        });
        const newRefreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "30d",
        });
        const userData = {
            randToken: newRefreshToken,
        };
        await (0, authService_1.updateUser)(user.id, userData);
        res
            .cookie("accessToken", newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 15 * 60 * 1000,
        })
            .cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
        });
        req.userId = user.id;
        next();
    };
    if (!refreshToken) {
        return next((0, error_1.createError)("You are not the authenticated user", 401, errorCode_1.errorCode.unauthenticated));
    }
    if (!accessToken) {
        generateNewTokens();
    }
    else {
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
            if (isNaN(decoded.id)) {
                return next((0, error_1.createError)("You are not an authenticated user.", 401, errorCode_1.errorCode.unauthenticated));
            }
            req.userId = decoded.id;
            next();
        }
        catch (error) {
            if (error.name === "TokenExpiredError") {
                generateNewTokens();
            }
            else {
                return next((0, error_1.createError)("Acess Token is invalid.", 400, errorCode_1.errorCode.attack));
            }
        }
    }
};
exports.auth = auth;

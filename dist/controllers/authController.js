"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authCheck = exports.logout = exports.login = exports.confirmPassword = exports.verifyOtp = exports.register = void 0;
const express_validator_1 = require("express-validator");
const bcrypt_1 = __importDefault(require("bcrypt"));
const moment_1 = __importDefault(require("moment"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_1 = require("../utils/auth");
const authService_1 = require("../services/authService");
const error_1 = require("../utils/error");
const errorCode_1 = require("../config/errorCode");
const generate_1 = require("../utils/generate");
const sendEmail_1 = require("../utils/sendEmail");
const check_1 = require("../utils/check");
const prisma_1 = require("../../generated/prisma");
exports.register = [
    (0, express_validator_1.body)("email", "Invalid email address")
        .trim()
        .notEmpty()
        .isEmail()
        .normalizeEmail()
        .matches(/^[\w.%+-]+@lamduan\.mfu\.ac\.th$/),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        let email = req.body.email;
        const user = await (0, authService_1.getUserByEmail)(email);
        (0, auth_1.checkUserExist)(user);
        const otp = (0, generate_1.generateOTP)();
        await (0, sendEmail_1.sendOTP)(email, otp);
        const salt = await bcrypt_1.default.genSalt(10);
        const hashOtp = await bcrypt_1.default.hash(otp.toString(), salt);
        const token = (0, generate_1.generateToken)();
        const otpRow = await (0, authService_1.getOtpByEmail)(email);
        let result;
        if (!otpRow) {
            const otpData = {
                email,
                otp: hashOtp,
                rememberToken: token,
                count: 1,
            };
            result = await (0, authService_1.createOtp)(otpData);
            (0, check_1.checkingCreatedModel)(result);
        }
        else {
            const lastOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
            const today = new Date().toLocaleDateString();
            const isSameDate = lastOtpRequest === today;
            (0, auth_1.checkOtpErrorIfSameDate)(isSameDate, otpRow.error);
            if (!isSameDate) {
                const otpData = {
                    otp: hashOtp,
                    rememberToken: token,
                    count: 1,
                    error: 0,
                };
                result = await (0, authService_1.updateOtp)(otpRow.id, otpData);
                (0, check_1.checkingCreatedModel)(result);
            }
            else {
                if (otpRow.count === 3) {
                    return next((0, error_1.createError)("OTP is allowed to request 3 times per day", 405, errorCode_1.errorCode.overLimit));
                }
                else {
                    const otpData = {
                        otp: hashOtp,
                        rememberToken: token,
                        count: otpRow.count + 1,
                    };
                    result = await (0, authService_1.updateOtp)(otpRow.id, otpData);
                    (0, check_1.checkingCreatedModel)(result);
                }
            }
        }
        res.status(200).json({
            message: `We are sending OTP to 09${result.email}`,
            email: result.email,
            token: result.rememberToken,
        });
    },
];
exports.verifyOtp = [
    (0, express_validator_1.body)("email", "Invalid email address")
        .trim()
        .notEmpty()
        .isEmail()
        .normalizeEmail()
        .matches(/^[\w.%+-]+@lamduan\.mfu\.ac\.th$/),
    (0, express_validator_1.body)("otp", "Invalid OTP")
        .trim()
        .notEmpty()
        .matches("^[0-9]+$")
        .isLength({ min: 6, max: 6 }),
    (0, express_validator_1.body)("token", "Invalid token").trim().notEmpty().escape(),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { email, otp, token } = req.body;
        const user = await (0, authService_1.getUserByEmail)(email);
        (0, auth_1.checkUserExist)(user);
        const otpRow = await (0, authService_1.getOtpByEmail)(email);
        (0, auth_1.checkOtpRow)(otpRow);
        const lastOtpVerify = new Date(otpRow.updatedAt).toLocaleDateString();
        const today = new Date().toLocaleDateString();
        const isSameDate = lastOtpVerify === today;
        (0, auth_1.checkOtpErrorIfSameDate)(isSameDate, otpRow.error);
        if (otpRow?.rememberToken !== token) {
            const otpData = {
                error: 5,
            };
            await (0, authService_1.updateOtp)(otpRow.id, otpData);
            return next((0, error_1.createError)("Invalid token", 400, errorCode_1.errorCode.invalid));
        }
        const isExpired = (0, moment_1.default)().diff(otpRow.updatedAt, "minutes") > 2;
        if (isExpired) {
            return next((0, error_1.createError)("OTP is expired.", 403, errorCode_1.errorCode.otpExpired));
        }
        const isMatchOtp = await bcrypt_1.default.compare(otp, otpRow.otp);
        if (!isMatchOtp) {
            if (!isSameDate) {
                const otpData = {
                    error: 1,
                };
                await (0, authService_1.updateOtp)(otpRow.id, otpData);
            }
            else {
                const otpData = {
                    error: { increment: 1 },
                };
                await (0, authService_1.updateOtp)(otpRow.id, otpData);
            }
            return next((0, error_1.createError)("OTP is incorrect.", 401, errorCode_1.errorCode.invalid));
        }
        const verifyToken = (0, generate_1.generateToken)();
        const otpData = {
            verifyToken,
            error: 0,
            count: 1,
        };
        const result = await (0, authService_1.updateOtp)(otpRow.id, otpData);
        res.status(200).json({
            message: "OTP is successfully verified.",
            email: result.email,
            token: result.verifyToken,
        });
    },
];
exports.confirmPassword = [
    (0, express_validator_1.body)("email", "Invalid email address")
        .trim()
        .notEmpty()
        .isEmail()
        .normalizeEmail()
        .matches(/^[\w.%+-]+@lamduan\.mfu\.ac\.th$/),
    (0, express_validator_1.body)("password", "Password must be 8 characters")
        .trim()
        .notEmpty()
        .matches("^[0-9]+$")
        .isLength({ min: 8, max: 8 }),
    (0, express_validator_1.body)("faculty", "Faculty is required")
        .notEmpty()
        .isIn(Object.values(prisma_1.Faculty))
        .withMessage("Invalid faculty value"),
    (0, express_validator_1.body)("token", "Invalid token").trim().notEmpty().escape(),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const { email, password, faculty, token } = req.body;
        const yearPrefix = email.slice(0, 2);
        const year = `25${yearPrefix}`;
        const user = await (0, authService_1.getUserByEmail)(email);
        (0, auth_1.checkUserExist)(user);
        const otpRow = await (0, authService_1.getOtpByEmail)(email);
        (0, auth_1.checkOtpRow)(otpRow);
        if (otpRow.error === 5) {
            return next((0, error_1.createError)("This Must be the attack", 400, errorCode_1.errorCode.attack));
        }
        if (otpRow.verifyToken !== token) {
            const otpData = {
                error: 5,
            };
            await (0, authService_1.updateOtp)(otpRow.id, otpData);
            return next((0, error_1.createError)("Invalid token", 400, errorCode_1.errorCode.invalid));
        }
        const isExpired = (0, moment_1.default)().diff(otpRow.updatedAt, "minutes") > 2;
        if (isExpired) {
            return next((0, error_1.createError)("OTP is expired.", 403, errorCode_1.errorCode.otpExpired));
        }
        const salt = await bcrypt_1.default.genSalt(10);
        const hashPassword = await bcrypt_1.default.hash(password, salt);
        const randToken = "I will replace Refresh Token soon.";
        const userData = {
            email,
            faculty: faculty,
            year,
            password: hashPassword,
            randToken: randToken,
        };
        const newUser = await (0, authService_1.createUser)(userData);
        (0, check_1.checkingCreatedModel)(newUser);
        const accessTokenPayload = { id: newUser.id };
        const refreshTokenPayload = { id: newUser.id, email: newUser.email };
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: 60 * 15,
        });
        const refreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "30d",
        });
        const userUpdateData = {
            randToken: refreshToken,
        };
        await (0, authService_1.updateUser)(newUser.id, userUpdateData);
        res
            .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 15 * 60 * 1000,
            path: "/",
        })
            .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: "/",
        })
            .status(201)
            .json({
            message: "Successfully created an account.",
            userId: newUser.id,
        });
    },
];
exports.login = [
    (0, express_validator_1.body)("email", "Invalid email address")
        .trim()
        .notEmpty()
        .isEmail()
        .normalizeEmail(),
    (0, express_validator_1.body)("password", "Password must be 8 characters")
        .trim()
        .notEmpty()
        .matches("^[0-9]+$")
        .isLength({ min: 8, max: 8 }),
    async (req, res, next) => {
        const errors = (0, express_validator_1.validationResult)(req).array({ onlyFirstError: true });
        if (errors.length > 0) {
            return next((0, error_1.createError)(errors[0].msg, 400, errorCode_1.errorCode.invalid));
        }
        const password = req.body.password;
        let email = req.body.email;
        const user = await (0, authService_1.getUserByEmail)(email);
        (0, auth_1.checkUserIfNotExist)(user);
        if (user.status === "FREEZE") {
            return next((0, error_1.createError)("Your account is frozen. Please contact support.", 403, errorCode_1.errorCode.accountFreeze));
        }
        const isMatchPassword = await bcrypt_1.default.compare(password, user.password);
        if (!isMatchPassword) {
            const lastRequest = new Date(user.updatedAt).toLocaleDateString();
            const isSameDate = lastRequest == new Date().toLocaleDateString();
            if (!isSameDate) {
                const userData = {
                    error: 1,
                };
                await (0, authService_1.updateUser)(user.id, userData);
            }
            else {
                if (user.errorLoginCount >= 5) {
                    const userData = {
                        status: "FREEZE",
                    };
                    await (0, authService_1.updateUser)(user.id, userData);
                    return next((0, error_1.createError)("Your account is frozen. Please contact support.", 403, errorCode_1.errorCode.accountFreeze));
                }
                else {
                    const userData = {
                        errorLoginCount: { increment: 1 },
                    };
                    await (0, authService_1.updateUser)(user.id, userData);
                }
            }
            return next((0, error_1.createError)("Password is incorrect.", 401, errorCode_1.errorCode.invalid));
        }
        const accessTokenPayload = { id: user.id };
        const refreshTokenPayload = { id: user.id, email: user.email };
        const accessToken = jsonwebtoken_1.default.sign(accessTokenPayload, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: 60 * 15,
        });
        const refreshToken = jsonwebtoken_1.default.sign(refreshTokenPayload, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "30d",
        });
        const userData = {
            errorLoginCount: 0,
            randToken: refreshToken,
        };
        await (0, authService_1.updateUser)(user.id, userData);
        res
            .cookie("accessToken", accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 15 * 60 * 1000,
            path: "/",
        })
            .cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            maxAge: 30 * 24 * 60 * 60 * 1000,
            path: "/",
        })
            .status(200)
            .json({
            message: "Successfully Logged In.",
            userId: user.id,
            userRole: user.role,
        });
    },
];
const logout = async (req, res, next) => {
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;
    if (!refreshToken) {
        return next((0, error_1.createError)("You are not an authenticated user!.", 401, errorCode_1.errorCode.unauthenticated));
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    }
    catch (err) {
        return next((0, error_1.createError)("You are not an authenticated user!.", 401, errorCode_1.errorCode.unauthenticated));
    }
    if (isNaN(decoded.id)) {
        return next((0, error_1.createError)("You are not an authenticated user!.", 401, errorCode_1.errorCode.unauthenticated));
    }
    const user = await (0, authService_1.getUserById)(decoded.id);
    (0, auth_1.checkUserIfNotExist)(user);
    if (user.email !== decoded.email) {
        return next((0, error_1.createError)("You are not an authenticated user!.", 401, errorCode_1.errorCode.unauthenticated));
    }
    const userData = {
        randToken: (0, generate_1.generateToken)(),
    };
    await (0, authService_1.updateUser)(user.id, userData);
    res.clearCookie("accessToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        path: "/",
    });
    res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        path: "/",
    });
    res.status(200).json({ message: "Successfully logged out. See you soon." });
};
exports.logout = logout;
const authCheck = async (req, res, next) => {
    const userId = req.userId;
    const user = await (0, authService_1.getUserById)(userId);
    (0, auth_1.checkUserIfNotExist)(user);
    res.status(200).json({
        success: true,
        message: "You are authenticated.",
        userId: user?.id,
        userRole: user?.role,
        Year: user?.year,
        Faculty: user?.faculty,
    });
};
exports.authCheck = authCheck;

import { Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import moment from "moment";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

import {
  checkUserExist,
  checkOtpErrorIfSameDate,
  checkOtpRow,
  checkUserIfNotExist,
} from "../utils/auth";

import {
  getUserByEmail,
  getOtpByEmail,
  createOtp,
  updateOtp,
  createUser,
  updateUser,
  getUserById,
} from "../services/authService";
import { createError } from "../utils/error";
import { errorCode } from "../config/errorCode";
import { generateOTP, generateToken } from "../utils/generate";
import { sendOTP } from "../utils/sendEmail";
import { checkingCreatedModel } from "../utils/check";
import { Faculty } from "../../generated/prisma";

export const register = [
  body("email", "Invalid email address")
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .matches(/^[\w.%+-]+@lamduan\.mfu\.ac\.th$/),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    let email = req.body.email;

    const user = await getUserByEmail(email);
    checkUserExist(user);

    // OTP sending logic here
    // Generate OTP & call OTP sending API
    // If sms OTP cannot be sent, response error
    // Save OTP to DB

    const otp = 123456; // For testing
    // const otp = generateOTP();

    // await sendOTP(email, otp);
    // For production use
    const salt = await bcrypt.genSalt(10);
    const hashOtp = await bcrypt.hash(otp.toString(), salt);
    const token = generateToken();

    const otpRow = await getOtpByEmail(email);
    let result;
    // Never request OTP before
    if (!otpRow) {
      const otpData = {
        email,
        otp: hashOtp,
        rememberToken: token,
        count: 1,
      };
      result = await createOtp(otpData);
      checkingCreatedModel(result);
    } else {
      const lastOtpRequest = new Date(otpRow.updatedAt).toLocaleDateString();
      const today = new Date().toLocaleDateString();
      const isSameDate = lastOtpRequest === today;
      checkOtpErrorIfSameDate(isSameDate, otpRow.error);
      // If OTP request is not in the same date. reset error count
      if (!isSameDate) {
        const otpData = {
          otp: hashOtp,
          rememberToken: token,
          count: 1,
          error: 0,
        };
        result = await updateOtp(otpRow.id, otpData);
        checkingCreatedModel(result);
      } else {
        // If OTP request is in the same date and over limit
        if (otpRow.count === 3) {
          return next(
            createError(
              "OTP is allowed to request 3 times per day",
              405,
              errorCode.overLimit
            )
          );
        } else {
          // If OTP request is in the same date but not over limit
          const otpData = {
            otp: hashOtp,
            rememberToken: token,
            count: otpRow.count + 1,
          };
          result = await updateOtp(otpRow.id, otpData);
          checkingCreatedModel(result);
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

export const verifyOtp = [
  body("email", "Invalid email address")
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .matches(/^[\w.%+-]+@lamduan\.mfu\.ac\.th$/),
  body("otp", "Invalid OTP")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 6, max: 6 }),
  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }
    const { email, otp, token } = req.body;

    const user = await getUserByEmail(email);
    checkUserExist(user);

    const otpRow = await getOtpByEmail(email);
    checkOtpRow(otpRow);

    const lastOtpVerify = new Date(otpRow!.updatedAt).toLocaleDateString();
    const today = new Date().toLocaleDateString();
    const isSameDate = lastOtpVerify === today;
    // If OTP error is in the same date and over limit
    checkOtpErrorIfSameDate(isSameDate, otpRow!.error);

    // Token is wrong
    if (otpRow?.rememberToken !== token) {
      const otpData = {
        error: 5,
      };
      await updateOtp(otpRow!.id, otpData);

      return next(createError("Invalid token", 400, errorCode.invalid));
    }

    // OTP is expired
    const isExpired = moment().diff(otpRow!.updatedAt, "minutes") > 2;
    if (isExpired) {
      return next(createError("OTP is expired.", 403, errorCode.otpExpired));
    }

    const isMatchOtp = await bcrypt.compare(otp, otpRow!.otp);
    // OTP is wrong
    if (!isMatchOtp) {
      // If OTP error is first time today
      if (!isSameDate) {
        const otpData = {
          error: 1,
        };
        await updateOtp(otpRow!.id, otpData);
      } else {
        // If OTP error is not first time today
        const otpData = {
          error: { increment: 1 },
        };
        await updateOtp(otpRow!.id, otpData);
      }

      return next(createError("OTP is incorrect.", 401, errorCode.invalid));
    }

    // All are OK
    const verifyToken = generateToken();
    const otpData = {
      verifyToken,
      error: 0,
      count: 1,
    };

    const result = await updateOtp(otpRow!.id, otpData);

    res.status(200).json({
      message: "OTP is successfully verified.",
      email: result.email,
      token: result.verifyToken,
    });
  },
];

export const confirmPassword = [
  body("email", "Invalid email address")
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail()
    .matches(/^[\w.%+-]+@lamduan\.mfu\.ac\.th$/),
  body("password", "Password must be 8 characters")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 8, max: 8 }),
  body("faculty", "Faculty is required")
    .notEmpty()
    .isIn(Object.values(Faculty))
    .withMessage("Invalid faculty value"),
  body("token", "Invalid token").trim().notEmpty().escape(),
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }
    const { email, password, faculty, token } = req.body;

    const yearPrefix = email.slice(0, 2);
    const year = `25${yearPrefix}`;

    const user = await getUserByEmail(email);
    checkUserExist(user);

    const otpRow = await getOtpByEmail(email);
    checkOtpRow(otpRow);

    // OTP error count is over limit
    if (otpRow!.error === 5) {
      return next(
        createError("This Must be the attack", 400, errorCode.attack)
      );
    }
    // Token is wrong
    if (otpRow!.verifyToken !== token) {
      const otpData = {
        error: 5,
      };
      await updateOtp(otpRow!.id, otpData);
      return next(createError("Invalid token", 400, errorCode.invalid));
    }
    // request is expired
    const isExpired = moment().diff(otpRow!.updatedAt, "minutes") > 2;
    if (isExpired) {
      return next(createError("OTP is expired.", 403, errorCode.otpExpired));
    }
    // Password is hashed
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const randToken = "I will replace Refresh Token soon.";
    // Creating a new account
    const userData = {
      email,
      faculty: faculty as Faculty,
      year,
      password: hashPassword,
      randToken: randToken,
    };

    const newUser = await createUser(userData);
    checkingCreatedModel(newUser);

    const accessTokenPayload = { id: newUser.id };
    const refreshTokenPayload = { id: newUser.id, email: newUser.email };

    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 15, // 15 min
      }
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d", // 30 days
      }
    );

    // Updating randToken with refreshToken
    const userUpdateData = {
      randToken: refreshToken,
    };
    await updateUser(newUser.id, userUpdateData);

    //response to user and store tokens in cookies
    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      })
      .status(201)
      .json({
        message: "Successfully created an account.",
        userId: newUser.id,
      });
  },
];

export const login = [
  body("email", "Invalid email address")
    .trim()
    .notEmpty()
    .isEmail()
    .normalizeEmail(),
  body("password", "Password must be 8 characters")
    .trim()
    .notEmpty()
    .matches("^[0-9]+$")
    .isLength({ min: 8, max: 8 }),

  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    // If validation error occurs
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }
    const password = req.body.password;
    let email = req.body.email;

    const user = await getUserByEmail(email);
    checkUserIfNotExist(user);

    if (user!.status === "FREEZE") {
      return next(
        createError(
          "Your account is frozen. Please contact support.",
          403,
          errorCode.accountFreeze
        )
      );
    }

    const isMatchPassword = await bcrypt.compare(password, user!.password);

    if (!isMatchPassword) {
      // --------- Starting to record wrong times
      const lastRequest = new Date(user!.updatedAt).toLocaleDateString();
      const isSameDate = lastRequest == new Date().toLocaleDateString();

      if (!isSameDate) {
        const userData = {
          error: 1,
        };
        await updateUser(user!.id, userData);
      } else {
        if (user!.errorLoginCount >= 5) {
          const userData = {
            status: "FREEZE",
          };
          await updateUser(user!.id, userData);
          return next(
            createError(
              "Your account is frozen. Please contact support.",
              403,
              errorCode.accountFreeze
            )
          );
        } else {
          const userData = {
            errorLoginCount: { increment: 1 },
          };
          await updateUser(user!.id, userData);
        }
      }
      // --------- Ending to record wrong times
      return next(
        createError("Password is incorrect.", 401, errorCode.invalid)
      );
    }

    // All are OK
    const accessTokenPayload = { id: user!.id };
    const refreshTokenPayload = { id: user!.id, email: user!.email };

    // Generate access and refresh tokens
    const accessToken = jwt.sign(
      accessTokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      {
        expiresIn: 60 * 15, // 15 min
      }
    );
    const refreshToken = jwt.sign(
      refreshTokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      {
        expiresIn: "30d", // 30 days
      }
    );

    const userData = {
      errorLoginCount: 0, // reset error count
      randToken: refreshToken,
    };
    await updateUser(user!.id, userData);

    res
      .cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 15 * 60 * 1000, // 15 minutes
        path: "/",
      })
      .cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        path: "/",
      })
      .status(200)
      .json({
        message: "Successfully Logged In.",
        userId: user!.id,
        userRole: user!.role,
      });
  },
];

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const refreshToken = req.cookies ? req.cookies.refreshToken : null;

  // If there is no refresh token
  if (!refreshToken) {
    return next(
      createError(
        "You are not an authenticated user!.",
        401,
        errorCode.unauthenticated
      )
    );
  }
  // Verify the refresh token
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as {
      id: number;
      email: string;
    };
  } catch (err) {
    return next(
      createError(
        "You are not an authenticated user!.",
        401,
        errorCode.unauthenticated
      )
    );
  }

  // If the decoded id is not a number
  if (isNaN(decoded.id)) {
    return next(
      createError(
        "You are not an authenticated user!.",
        401,
        errorCode.unauthenticated
      )
    );
  }

  // Check if the user exists
  const user = await getUserById(decoded.id);
  checkUserIfNotExist(user);

  // If the email does not match
  if (user!.email !== decoded.email) {
    return next(
      createError(
        "You are not an authenticated user!.",
        401,
        errorCode.unauthenticated
      )
    );
  }

  // Clear the cookies and update the user data
  // Here we are generating a new random token to replace the old one
  const userData = {
    randToken: generateToken(),
  };
  await updateUser(user!.id, userData);

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

interface CustomRequest extends Request {
  userId?: number;
}

export const authCheck = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const userId = req.userId;
  const user = await getUserById(userId!);
  checkUserIfNotExist(user);

  res.status(200).json({
    success: true,
    message: "You are authenticated.",
    userId: user?.id,
    userRole: user?.role,
    Year: user?.year,
    Faculty: user?.faculty,
  });
};

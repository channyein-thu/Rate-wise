import { errorCode } from "../../config/errorCode";

export const checkUserExist = (user: any) => {
  if (user) {
    const error: any = new Error("This Email has already been registered");
    error.status = 409;
    error.code = errorCode.userExist;
    throw error;
  }
};

export const checkOtpErrorIfSameDate = (
  isSameDate: boolean,
  errorCount: number
) => {
  if (isSameDate && errorCount === 5) {
    const error: any = new Error(
      "OTP is wrong for 5 times. Please try again tomorrow"
    );
    error.status = 401;
    error.code = errorCode.overLimit;
    throw error;
  }
};

export const checkOtpRow = (otpRow: any) => {
  if (!otpRow) {
    const error: any = new Error("Email is incorrect.");
    error.status = 400;
    error.code = errorCode.invalid;
    throw error;
  }
};

export const checkUserIfNotExist = (user: any) => {
  if (!user) {
    const error: any = new Error("This email has not registered.");
    error.status = 401;
    error.code = errorCode.unauthenticated;
    throw error;
  }
};

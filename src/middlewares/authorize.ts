import { Request, Response, NextFunction } from "express";
import { get } from "http";
import { getUserById } from "../services/authService";
import { createError } from "../utils/error";
import { errorCode } from "../../config/errorCode";

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}
// authorise(true, "ADMIN", "AUTHOR") // deny - "USER"
// authorise(false, "USER") // allow - "ADMIN", "AUTHOR"
export const authorize = (permission: boolean, ...roles: string[]) => {
  return async (req: CustomRequest, res: Response, next: NextFunction) => {
    const userId = req.userId;
    const user = await getUserById(userId!);
    if (!user) {
      return next(
        createError(
          "This account has not registered!",
          401,
          errorCode.unauthenticated
        )
      );
    }
    const result = roles.includes(user.role);

    // permission && result

    /*
    true&true = allow
    true&false = deny
    false&true = deny
    false&false = allow
    */
    if (permission && !result) {
      return next(
        createError("This action is not allowed.", 403, errorCode.unauthorised)
      );
    }

    if (!permission && result) {
      return next(
        createError("This action is not allowed.", 403, errorCode.unauthorised)
      );
    }

    req.user = user;

    next();
  };
};

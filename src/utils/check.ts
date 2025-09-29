import { errorCode } from "../../config/errorCode";

export const checkModelIfExist = (model: any) => {
  if (!model) {
    const error: any = new Error("This model does not exist.");
    error.status = 409;
    error.code = errorCode.invalid;
    throw error;
  }
};

export const checkingCreatedModel = (model: any) => {
  if (!model) {
    const error: any = new Error("Cannot create model. Please try again.");
    error.status = 500;
    error.code = errorCode.serverError;
    throw error;
  }
};

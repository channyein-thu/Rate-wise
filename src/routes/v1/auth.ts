import express from "express";
import {
  authCheck,
  confirmPassword,
  login,
  logout,
  register,
  verifyOtp,
} from "../../controllers/authController";
import { auth } from "../../middlewares/auth";

const router = express.Router();

router.post("/register", register);
router.post("/verify", verifyOtp);
router.post("/confirm", confirmPassword);
router.post("/login", login);

router.post("/logout", logout);

router.get("/auth-check", auth, authCheck);

export default router;

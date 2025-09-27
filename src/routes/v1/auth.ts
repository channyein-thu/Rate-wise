import express from "express";
import {
  confirmPassword,
  login,
  logout,
  register,
  verifyOtp,
} from "../../controllers/authController";

const router = express.Router();

router.post("/register", register);
router.post("/verify", verifyOtp);
router.post("/confirm", confirmPassword);
router.post("/login", login);

router.post("/logout", logout);

export default router;

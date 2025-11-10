"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../../controllers/authController");
const auth_1 = require("../../middlewares/auth");
const router = express_1.default.Router();
router.post("/register", authController_1.register);
router.post("/verify", authController_1.verifyOtp);
router.post("/confirm", authController_1.confirmPassword);
router.post("/login", authController_1.login);
router.post("/logout", authController_1.logout);
router.get("/auth-check", auth_1.auth, authController_1.authCheck);
exports.default = router;

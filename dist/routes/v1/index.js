"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("./auth"));
const admin_1 = __importDefault(require("./admin"));
const api_1 = __importDefault(require("./api"));
const auth_2 = require("../../middlewares/auth");
const authorize_1 = require("../../middlewares/authorize");
const router = express_1.default.Router();
router.use("/api/v1", auth_1.default);
router.use("/api/v1/users", api_1.default);
router.use("/api/v1/admins", auth_2.auth, (0, authorize_1.authorize)(true, "ADMIN"), admin_1.default);
exports.default = router;

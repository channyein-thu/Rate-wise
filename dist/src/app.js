"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
const rateLimiter_1 = require("./middlewares/rateLimiter");
const v1_1 = __importDefault(require("./routes/v1"));
const path_1 = __importDefault(require("path"));
exports.app = (0, express_1.default)();
const whitelist = ["http://localhost:5173"];
const corsOptions = {
    origin: whitelist,
    credentials: true,
};
exports.app.use((0, cors_1.default)(corsOptions));
exports.app
    .use((0, morgan_1.default)("dev"))
    .use(express_1.default.urlencoded({ extended: true }))
    .use(express_1.default.json())
    .use((0, cookie_parser_1.default)())
    .use((0, helmet_1.default)())
    .use((0, compression_1.default)())
    .use(rateLimiter_1.limiter);
exports.app.use((req, res, next) => {
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    next();
});
exports.app.use("/uploads/images", (0, cors_1.default)(corsOptions), express_1.default.static(path_1.default.join(__dirname, "../uploads/images")));
exports.app.use(v1_1.default);
exports.app.use((err, req, res, next) => {
    const status = err.status || 500;
    const message = err.message || "Internal Server Error";
    const errCode = err.code || "INTERNAL_SERVER_ERROR";
    res.status(status).json({
        message,
        error: errCode,
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const fileStorage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/images");
    },
    filename: function (req, file, cb) {
        const ext = file.mimetype.split("/")[1];
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9) + "." + ext;
        cb(null, uniqueSuffix);
    },
});
const fileFilter = (req, file, cb) => {
    if (file.mimetype === "image/png" ||
        file.mimetype === "image/jpg" ||
        file.mimetype === "image/jpeg" ||
        file.mimetype === "image/webp" ||
        file.mimetype === "image/heic") {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
};
const upload = (0, multer_1.default)({
    storage: fileStorage,
    fileFilter,
    limits: { fileSize: 1024 * 1024 * 10 },
});
exports.default = upload;

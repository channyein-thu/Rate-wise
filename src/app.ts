// import express, { Request, Response, NextFunction } from "express";
// import cookieParser from "cookie-parser";
// import helmet from "helmet";
// import morgan from "morgan";
// import compression from "compression";
// import cors from "cors";

// import { limiter } from "./middlewares/rateLimiter";
// import routes from "./routes/v1";
// import path from "path";

// export const app = express();

// const allowedOrigins = [
//   "http://localhost:5173", // local dev
//   "https://course-professor-review-hub-mfu.vercel.app", // production frontend
//   "https://ratewise-api-production.up.railway.app", // allow direct API test from browser
// ];

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       if (!origin || allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         console.warn("❌ Blocked by CORS:", origin);
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   })
// );

// app.options(/.*/, cors());

// app
//   .use(morgan("dev"))
//   .use(express.urlencoded({ extended: true }))
//   .use(express.json())
//   .use(cookieParser())
//   .use(helmet())
//   .use(compression())
//   .use(limiter);

// // ✅ allow cross-origin for resources (images, etc.)
// app.use((req, res, next) => {
//   res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
//   next();
// });

// // ✅ serve uploaded images publicly
// app.use(
//   "/uploads/images",
//   cors({
//     origin: allowedOrigins,
//     credentials: true,
//   }),
//   express.static(path.join(__dirname, "../uploads/images"))
// );

// // ✅ main API routes
// app.use(routes);

// // ✅ centralized error handling
// app.use((err: any, req: Request, res: Response, next: NextFunction) => {
//   const status = err.status || 500;
//   const message = err.message || "Internal Server Error";
//   const errCode = err.code || "INTERNAL_SERVER_ERROR";
//   res.status(status).json({
//     message,
//     error: errCode,
//   });
// });

import express, { Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import cors from "cors";
import { limiter } from "./middlewares/rateLimiter";
import routes from "./routes/v1";
import path from "path";

export const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "https://course-professor-review-hub-mfu.vercel.app",
  "https://triumphant-caring-production-fd3c.up.railway.app", // ✅ your frontend
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// 🔥 Handle preflight OPTIONS requests globally
app.options(/.*/, cors({ origin: allowedOrigins, credentials: true }));

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(helmet())
  .use(compression())
  .use(limiter);

// Static file serving
app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  next();
});

app.use(
  "/uploads/images",
  cors({ origin: allowedOrigins, credentials: true }),
  express.static(path.join(__dirname, "../uploads/images"))
);

app.use(routes);

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

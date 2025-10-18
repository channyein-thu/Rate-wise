// import express, { Request, Response, NextFunction } from "express";
// import cookieParser from "cookie-parser";
// import helmet from "helmet";
// import morgan from "morgan";
// import compression from "compression";
// import cors from "cors";

// import { limiter } from "./middlewares/rateLimiter";
// import routes from "./routes/v1";

// export const app = express();

// var whitelist = ["http://example1.com", "http://localhost:5173"];
// var corsOptions = {
//   origin: function (
//     origin: any,
//     callback: (err: Error | null, origin?: any) => void
//   ) {
//     // Allow requests with no origin ( like mobile apps or curl requests)
//     if (!origin) return callback(null, true);
//     if (whitelist.includes(origin)) {
//       callback(null, true);
//     } else {
//       callback(new Error("Not allowed by CORS"));
//     }
//   },
//   credentials: true, // Allow cookies or authorization header
// };

// app
//   .use(morgan("dev"))
//   .use(express.urlencoded({ extended: true }))
//   .use(express.json())
//   .use(cookieParser())
//   .use(cors(corsOptions))
//   .use(helmet())
//   .use(compression())
//   .use(limiter);

// app.use((req, res, next) => {
//   res.setHeader("Cross-Origin-Resource-Policy", "same-site");
//   next();
// });

// app.use(express.static("uploads/images"));
// app.use(routes);

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

const whitelist = ["http://localhost:5173"];
const corsOptions = {
  origin: whitelist,
  credentials: true,
};

app.use(cors(corsOptions));

app
  .use(morgan("dev"))
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .use(cookieParser())
  .use(helmet())
  .use(compression())
  .use(limiter);

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  next();
});

app.use(
  "/uploads/images",
  cors(corsOptions),
  express.static(path.join(__dirname, "../uploads/images"))
);
app.use(routes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  const errCode = err.code || "INTERNAL_SERVER_ERROR";
  res.status(status).json({
    message,
    error: errCode,
  });
});

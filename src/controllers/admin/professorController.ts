import e, { Request, Response, NextFunction } from "express";
import { body, validationResult, query, param } from "express-validator";
import { createError } from "../../utils/error";
import { errorCode } from "../../../config/errorCode";

import { getOrSetCache } from "../../utils/cache";
import cacheQueue from "../../jobs/queues/cacheQueue";
import { Faculty } from "../../../generated/prisma";
import { unlink } from "node:fs/promises";
import path from "path";
import {
  createOneProfessor,
  deleteOneProfessor,
  getProfessorById,
  getProfessorByName,
  getProfessorList,
  updateOneProfessor,
} from "../../services/professorService";
import { tryCatch } from "bullmq";

const removeFile = async (originalFile: string) => {
  try {
    const originalFilePath = path.join(
      __dirname,
      "../../..",
      "/uploads/images",
      originalFile
    );

    // await safeUnlink(originalFilePath);  // Use this For windows error - 'EPERM' or 'EBUSY'
    await unlink(originalFilePath);
  } catch (error) {
    console.log(error);
  }
};

const educationSanitizer = (value: any) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map((e: string) => e.trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((e: string) => e.trim()).filter(Boolean);
      }
    } catch {}
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((e: string) => e.trim())
      .filter(Boolean);
  }

  return [];
};

interface CustomRequest extends Request {
  userId?: number;
  user?: any;
}

export const createProfessor = [
  body("name", "Professor name is required").trim().notEmpty().escape(),
  body("faculty", "Faculty is required")
    .notEmpty()
    .isIn(Object.values(Faculty))
    .withMessage("Invalid faculty value"),
  body("email", "Email must be a valid email address")
    .notEmpty()
    .isEmail()
    .withMessage("Invalid email format"),
  body("education")
    .optional({ nullable: true })
    .customSanitizer(educationSanitizer),

  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      if (req.file) {
        await removeFile(req.file.filename);
      }
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { name, faculty, email, education } = req.body;
    if (!req.file) {
      return next(
        createError("Profile image is required", 400, errorCode.invalid)
      );
    }

    const image = req.file.filename;

    const existingProfessor = await getProfessorByName(name);
    if (existingProfessor) {
      await removeFile(req.file.filename);

      return next(
        createError(
          "Professor with this name already exists",
          400,
          errorCode.duplicate
        )
      );
    }

    const professorData = { name, faculty, email, image, education };

    try {
      // Create professor
      const professor = await createOneProfessor(professorData);

      if (!professor) {
        await removeFile(req.file.filename);

        // forward error to global handler
        return next(
          createError("Failed to create professor", 500, errorCode.serverError)
        );
      }

      // Invalidate cache
      await cacheQueue.add(
        "invalidate-professor-cache",
        {
          pattern: "professors:*",
        },
        {
          jobId: `invalidate-${Date.now()}`,
          priority: 1,
        }
      );

      //  Send success response
      res.status(201).json({
        success: true,
        message: "Professor created successfully",
        professorId: professor.id,
      });
    } catch (error) {
      await removeFile(req.file.filename);

      next(
        createError(
          error instanceof Error ? error.message : "Internal Server Error",
          500,
          errorCode.serverError
        )
      );
    }
  },
];

export const updateProfessor = [
  body("professorId", "Professor ID is required")
    .isInt({ gt: 0 })
    .withMessage("Invalid professor ID"),
  body("name", "Professor name is required").trim().notEmpty().escape(),
  body("faculty", "Faculty is required")
    .notEmpty()
    .isIn(Object.values(Faculty))
    .withMessage("Invalid faculty value"),
  body("email", "Email must be a valid email address")
    .notEmpty()
    .isEmail()
    .withMessage("Invalid email format"),
  body("education")
    .optional({ nullable: true })
    .customSanitizer(educationSanitizer),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { professorId, name, faculty, email, education } = req.body;

    const existingProfessor = await getProfessorById(+professorId);
    if (!existingProfessor) {
      return next(createError("Professor not found", 404, errorCode.notFound));
    }

    let newprofessorData: any = {};

    newprofessorData.faculty = faculty as Faculty;
    newprofessorData.email = email;

    if (name !== existingProfessor.name) {
      const nameExists = await getProfessorByName(name);
      if (nameExists) {
        return next(
          createError(
            "Professor with this name already exists",
            400,
            errorCode.duplicate
          )
        );
      }
      newprofessorData.name = name;
    }
    if (education && education.length > 0) {
      newprofessorData.education = education;
    }

    try {
      const updatedProfessor = await updateOneProfessor(
        existingProfessor.id,
        newprofessorData
      );
      if (!updatedProfessor) {
        return next(
          createError("Failed to update professor", 500, errorCode.serverError)
        );
      }

      // Invalidate relevant cache entries
      await cacheQueue.add(
        "invalidate-professor-cache",
        {
          pattern: "professors:*",
        },
        {
          jobId: `invalidate-${Date.now()}`,
          priority: 1,
        }
      );

      // Controller logic here
      res.status(200).json({
        success: true,
        message: "Professor updated successfully",
        professorId: updatedProfessor.id,
      });
    } catch (error) {
      next(
        createError(
          error instanceof Error ? error.message : "Internal Server Error",
          500,
          errorCode.serverError
        )
      );
    }
  },
];

export const deleteProfessor = [
  body("professorId", "Professor ID is required").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const { professorId } = req.body;

    const existingProfessor = await getProfessorById(+professorId);
    if (!existingProfessor) {
      return next(createError("Professor not found.", 404, errorCode.notFound));
    }

    const deletedProfessor = await deleteOneProfessor(professorId);
    if (!deletedProfessor) {
      return next(
        createError("Failed to delete professor.", 500, errorCode.serverError)
      );
    }

    // Invalidate cache
    await cacheQueue.add(
      "invalidate-professor-cache",
      {
        pattern: "professors:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );
    // Remove old image file
    if (existingProfessor.image) {
      await removeFile(existingProfessor.image);
    }

    res.status(200).json({
      success: true,
      message: "Professor deleted successfully",
      deletedProfessorId: deletedProfessor.id,
    });
  },
];

export const getProfessorByPagination = [
  // Validation
  query("cursor", "Cursor must be Professor ID.").isInt({ gt: 0 }).optional(),
  query("limit", "Limit must be an integer greater than 0.")
    .isInt({ gt: 0 })
    .optional(),
  query("averageRate", "averageRate must be a number")
    .isFloat({ min: 0 })
    .optional(),
  query("faculty", "Faculty must be string").optional().isString(),
  query("searchTerm", "Search term must be string").optional().isString(),

  // Controller
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, "INVALID_INPUT"));
    }

    const lastCursor = req.query.cursor ? Number(req.query.cursor) : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 6;
    const faculty = req.query.faculty as string | undefined;
    const averageRate = req.query.averageRate
      ? Number(req.query.averageRate)
      : undefined;
    const searchTerm = req.query.searchTerm as string | undefined;

    const where: any = {
      AND: [
        faculty && { faculty: { in: faculty.split(",") } },
        averageRate !== undefined && {
          averageRate: { gte: averageRate },
        },
        searchTerm && {
          OR: [
            { name: { contains: searchTerm } },
            { email: { contains: searchTerm } },
          ],
        },
      ].filter(Boolean),
    };

    const options = {
      where,
      take: limit + 1, // fetch one extra to check hasNextPage
      skip: lastCursor ? 1 : 0,
      cursor: lastCursor ? { id: lastCursor } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        faculty: true,
        education: {
          select: { degree: true },
        },
        image: true,
        totalReviews: true,
        averageRate: true,
      },
      orderBy: {
        id: "desc",
      },
    };

    const cacheKey = `professors:${JSON.stringify(req.query)}`;
    const professors = await getOrSetCache(cacheKey, async () => {
      return await getProfessorList(options);
    });

    const hasNextPage = professors.length > limit;
    if (hasNextPage) {
      professors.pop(); // remove extra record
    }

    const nextCursor =
      professors.length > 0 ? professors[professors.length - 1].id : null;

    res.status(200).json({
      message: "Get All infinite professors",
      hasNextPage,
      nextCursor,
      prevCursor: lastCursor || null,
      professors,
    });
  },
];

export const updateProfessorImage = [
  body("professorId", "Professor ID is required")
    .isInt({ gt: 0 })
    .withMessage("Invalid professor ID"),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      if (req.file) {
        await removeFile(req.file.filename);
      }
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }
    if (!req.file) {
      return next(
        createError("Profile image is required", 400, errorCode.invalid)
      );
    }

    const professorId = req.body.professorId;
    const image = req.file.filename;

    const existingProfessor = await getProfessorById(Number(professorId));
    if (!existingProfessor) {
      if (req.file) {
        await removeFile(req.file.filename);
      }
      return next(createError("Professor not found", 404, errorCode.notFound));
    }

    const updatedProfessor = await updateOneProfessor(existingProfessor.id, {
      image,
    });

    if (!updatedProfessor) {
      if (req.file) {
        await removeFile(req.file.filename);
      }
      return next(
        createError("Failed to update professor", 500, errorCode.serverError)
      );
    }

    // Remove old image file
    if (existingProfessor.image) {
      await removeFile(existingProfessor.image);
    }
    // Invalidate relevant cache entries
    await cacheQueue.add(
      "invalidate-professor-cache",
      {
        pattern: "professors:*",
      },
      {
        jobId: `invalidate-${Date.now()}`,
        priority: 1,
      }
    );

    // Controller logic here
    res.status(201).json({
      success: true,
      message: "Professor image updated successfully",
      professorId: updatedProfessor.id,
    });
  },
];

export const getProfessorWithId = [
  param("id", "Professor ID must be a positive integer").isInt({ gt: 0 }),
  async (req: CustomRequest, res: Response, next: NextFunction) => {
    const errors = validationResult(req).array({ onlyFirstError: true });
    if (errors.length > 0) {
      return next(createError(errors[0].msg, 400, errorCode.invalid));
    }

    const professorId = parseInt(req.params.id, 10);
    const cacheKey = `professors:${professorId}`;
    const professor = await getOrSetCache(cacheKey, async () => {
      return await getProfessorById(+professorId);
    });

    if (!professor) {
      return next(createError("Professor not found.", 404, errorCode.invalid));
    }

    res.status(200).json({
      success: true,
      message: "Professor fetched successfully",
      data: professor,
    });
  },
];

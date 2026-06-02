import { Router } from "express";
import { body, param, validationResult } from "express-validator";
import { AppError } from "../errors/AppError.js";
import { isDuplicateKeyError } from "../errors/mongoErrors.js";
import type { AuthenticatedRequest } from "../middleware/loadUser.js";
import {
  requireAuth,
  requirePermission,
} from "../middleware/requirePermission.js";
import { User } from "../models/User.js";
import { ROLES } from "../workflow/types.js";

export const usersRouter = Router();

usersRouter.post(
  "/",
  body("name").isString().trim().notEmpty(),
  body("email").isEmail(),
  body("role").isIn([...ROLES]),
  body("agentId").optional().isString(),
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError("VALIDATION_ERROR", { details: errors.array() });
      }

      const user = await User.create({
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
        agentId: req.body.agentId,
      });

      res.status(201).json({
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          agentId: user.agentId,
          hint: "Pass this id in the X-User-Id header for subsequent requests.",
        },
      });
    } catch (err) {
      if (isDuplicateKeyError(err, "email")) {
        next(
          new AppError("DUPLICATE_EMAIL", {
            details: { email: req.body.email },
          }),
        );
        return;
      }
      next(err);
    }
  },
);

usersRouter.get(
  "/",
  requireAuth,
  requirePermission("MANAGE_USERS"),
  async (_req, res, next) => {
    try {
      const users = await User.find().sort({ createdAt: -1 });
      res.json({
        data: users.map((u) => ({
          id: u._id.toString(),
          name: u.name,
          email: u.email,
          role: u.role,
          agentId: u.agentId,
        })),
      });
    } catch (err) {
      next(err);
    }
  },
);

usersRouter.get(
  "/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) {
        throw new AppError("USER_NOT_FOUND");
      }
      const isSelf = req.auth?.userId === user._id.toString();
      const isInternal = req.auth && req.auth.role !== "agent";
      if (!isSelf && !isInternal) {
        throw new AppError("FORBIDDEN_ROLE");
      }
      res.json({
        data: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
          agentId: user.agentId,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

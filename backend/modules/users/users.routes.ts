import { Router } from "express";
import { UserController } from "./users.controller";
import { requireAuth } from "../auth/auth.guards";

const router = Router();
const userController = new UserController();

// Get user profile
router.get("/profile", requireAuth, userController.getProfile);

// Update user profile
router.put("/profile", requireAuth, userController.updateProfile);

// Delete user account
router.delete("/profile", requireAuth, userController.deleteAccount);

export { router as userRoutes };
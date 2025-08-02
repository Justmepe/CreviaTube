import { Router } from "express";
import passport from "passport";
import { AuthController } from "./auth.controller";

const router = Router();
const authController = new AuthController();

// Registration
router.post("/register", authController.register);

// Login
router.post("/login", passport.authenticate("local"), authController.login);

// Logout
router.post("/logout", authController.logout);

// Get current user
router.get("/user", authController.getCurrentUser);

export { router as authRoutes };
import { Router } from "express";
import passport from "passport";
import { registerUser } from "./register";
import { loginUser } from "./login";
import { logoutUser } from "./logout";

const router = Router();

// Registration
router.post("/register", registerUser);

// Login
router.post("/login", passport.authenticate("local"), loginUser);

// Logout
router.post("/logout", logoutUser);

// Get current user
router.get("/user", (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  res.json(req.user);
});

export { router as authAPI };
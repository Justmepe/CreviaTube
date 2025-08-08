import { Request, Response, NextFunction } from "express";
import { insertUserSchema } from "../../../shared/schema";
import { storage } from "../../storage";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Check if email already exists
    const existingEmailUser = await storage.getUserByEmail(req.body.email);
    if (existingEmailUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Validate and create user
    const userData = insertUserSchema.parse({
      ...req.body,
      password: await hashPassword(req.body.password),
    });

    const user = await storage.createUser(userData);

    // Auto-login the user
    req.login(user, (err) => {
      if (err) return next(err);
      res.status(201).json(user);
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    
    if (error?.code === '23505' || (error?.message?.includes("duplicate key") && error?.message?.includes("email"))) {
      return res.status(400).json({ message: "Email already exists" });
    }
    if (error?.message?.includes("duplicate key") && error?.message?.includes("username")) {
      return res.status(400).json({ message: "Username already exists" });
    }
    
    return res.status(500).json({ message: "Registration failed. Please try again." });
  }
}
import { Request, Response } from "express";

export function loginUser(req: Request, res: Response) {
  // User is already authenticated via passport middleware
  res.status(200).json(req.user);
}
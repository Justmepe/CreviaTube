import { Request, Response, NextFunction } from "express";

export function logoutUser(req: Request, res: Response, next: NextFunction) {
  req.logout((err) => {
    if (err) return next(err);
    res.sendStatus(200);
  });
}
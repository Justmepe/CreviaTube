import { Request, Response, NextFunction } from "express";
import { AuthService } from "./auth.service";
import { insertUserSchema } from "../../../shared/schema";

export class AuthController {
  private authService = new AuthService();

  register = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await this.authService.register(userData);
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      next(error);
    }
  };

  login = (req: Request, res: Response) => {
    res.status(200).json(req.user);
  };

  logout = (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  };

  getCurrentUser = (req: Request, res: Response) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(req.user);
  };
}
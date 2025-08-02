import { Request, Response, NextFunction } from "express";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const timestamp = new Date().toLocaleTimeString();
    
    console.log(
      `${timestamp} [express] ${req.method} ${req.path} ${res.statusCode} in ${duration}ms`
    );
  });
  
  next();
}
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "grocery_marketplace_secure_token_secret_123";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: "customer" | "partner" | "admin";
  };
}

export function protect(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    res.status(401).json({ message: "Not authorized to access this resource, token missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      name: string;
      email: string;
      role: "customer" | "partner" | "admin";
    };

    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Not authorized, token verification failed" });
  }
}

export function authorize(...roles: Array<"customer" | "partner" | "admin">) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ message: `Access forbidden for your role (${req.user.role})` });
      return;
    }

    next();
  };
}

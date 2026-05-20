import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { dbStore, User } from "../config/db.ts";
import { AuthenticatedRequest } from "../middleware/authMiddleware.ts";

const JWT_SECRET = process.env.JWT_SECRET || "grocery_marketplace_secure_token_secret_123";

// Generate JWT Helper
const generateToken = (user: User) => {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({ message: "Please provide all required fields (name, email, password, role)" });
      return;
    }

    if (role !== "customer" && role !== "partner") {
      res.status(400).json({ message: "Role must be customer or partner for registration" });
      return;
    }

    const users = dbStore.getUsers();
    const userExists = users.some((u) => u.email.toLowerCase() === email.toLowerCase());

    if (userExists) {
      res.status(400).json({ message: "User with this email already exists" });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser: User = {
      id: "usr-" + Math.random().toString(36).substr(2, 9),
      name,
      email: email.toLowerCase(),
      passwordHash,
      role,
      createdAt: new Date().toISOString(),
    };

    dbStore.saveUser(newUser);

    res.status(201).json({
      token: generateToken(newUser),
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

export const signin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: "Please provide email and password" });
      return;
    }

    const users = dbStore.getUsers();
    const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    res.json({
      token: generateToken(user),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Signin error:", error);
    res.status(500).json({ message: "Server error during authentication" });
  }
};

export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Not authenticated" });
      return;
    }

    const users = dbStore.getUsers();
    const user = users.find((u) => u.id === req.user?.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error("Get Profile error:", error);
    res.status(500).json({ message: "Server error retrieving profile" });
  }
};

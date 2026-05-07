import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "../shared/schema.js";
import { issueVerificationEmail } from "./api/email-verification";
import { detectCountryIso } from "./lib/geolocation";
import { emit } from "./lib/metrics";

// Whitelist of values accepted for users.campaigner_stage. Mirrors the CHECK
// constraint in migrations/0012_personas_and_region.sql so we reject bad
// inputs before they hit the DB.
const VALID_STAGES = new Set([
  "founder_prelaunch",
  "early_brand",
  "established_brand",
  "solo_creator",
]);

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  if (!stored || !stored.includes('.')) {
    return false;
  }
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) {
    return false;
  }
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    return false;
  }
}

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    throw new Error(
      "SESSION_SECRET environment variable is required for production deployment"
    );
  }
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production" && !process.env.REPL_ID, // HTTPS in production
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { enterpriseRequestData, campaignerStage, countryIso: claimedCountry, ...userData } = req.body;

      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(userData.email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Validate optional campaigner stage. Falls through silently if not set.
      const stage = typeof campaignerStage === "string" && VALID_STAGES.has(campaignerStage)
        ? campaignerStage
        : null;

      // Auto-detect country from request headers (CF / proxy). Caller may
      // override via payload but we prefer CF header when present.
      const detectedCountry = detectCountryIso(req, claimedCountry);

      const user = await storage.createUser({
        ...userData,
        password: await hashPassword(userData.password),
        campaignerStage: stage,
        countryIso: detectedCountry,
        // country_verified_at left null; verification happens later (login-IP
        // re-check, phone country code, KYC).
      });

      // Structured metrics emit. Persists a row to metric_events and a
      // JSON line to stdout. Single source for all platform analytics
      // until we stand up a real metrics pipe.
      emit("signup", {
        role: user.role,
        accountType: user.accountType ?? null,
        stage: stage ?? null,
        country: detectedCountry ?? null,
      }, user.id);

      // Fire-and-forget: send verification email. Failures here shouldn't block signup.
      issueVerificationEmail({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
      }).catch(err => console.error("Failed to issue verification email:", err));

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          success: true,
          user: user,
          message: "User registered successfully"
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error?.code === '23505' || (error?.message?.includes("duplicate key") && error?.message?.includes("email"))) {
        return res.status(400).json({ message: "Email already exists" });
      }
      if (error?.message?.includes("duplicate key") && error?.message?.includes("username")) {
        return res.status(400).json({ message: "Username already exists" });
      }
      return res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: "Invalid username or password" });
      
      req.login(user, (err) => {
        if (err) return next(err);
        res.json({ 
          success: true, 
          user: user,
          message: "Login successful"
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });
}

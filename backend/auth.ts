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
import { phoneMatchesCountry } from "./lib/phone-verification";

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

// Sanitize a user row for the wire. Strips secrets (password hash,
// TOTP secret, email OTP hash) that have no business reaching the
// client — even our own client. The shared User type still includes
// these columns because the server uses them; the client should
// never see them. Used by /api/register and /api/login responses.
// (/api/user already strips password via fetchUserProfile in
// routes.ts; this is the matching helper for the auth responses.)
function toClientUser(user: any) {
  if (!user) return user;
  const {
    password,
    totpSecret,
    emailOtpHash,
    emailOtpExpiresAt,
    ...safe
  } = user;
  return safe;
}

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
      // SECURITY — destructure ONLY the fields a public signup is
      // allowed to set. The previous version spread `...userData`
      // from req.body, which let anyone set role='admin' /
      // status='active' / emailVerified=true / kycStatus='approved'
      // / walletAddress on signup. Every privileged column is now
      // explicitly excluded; new admins can only be minted via the
      // seed script (scripts/seed-admin.ts) or via an existing
      // admin's UPDATE.
      const {
        username,
        email,
        password,
        fullName,
        phoneNumber,
        mpesaNumber,
        accountType,
        // Allowed but validated/sanitised below
        campaignerStage,
        countryIso: claimedCountry,
      } = req.body as Record<string, unknown>;

      // Reject role-only signups that don't supply the required
      // fields. The Zod schema would do this too but we keep the
      // hand-rolled check here so the error is friendly.
      if (
        typeof username !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof fullName !== "string"
      ) {
        return res.status(400).json({ message: "username, email, password, and fullName are required" });
      }

      // accountType is a soft enum; pass through only known values.
      const ALLOWED_ACCOUNT_TYPES = new Set([
        "creator",
        "influencer",
        "founder",
        "business",
        "brand",
        "individual",
        "agency",
      ]);
      const safeAccountType =
        typeof accountType === "string" && ALLOWED_ACCOUNT_TYPES.has(accountType)
          ? accountType
          : null;

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const existingEmailUser = await storage.getUserByEmail(email);
      if (existingEmailUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Validate optional campaigner stage. Falls through silently if not set.
      const stage = typeof campaignerStage === "string" && VALID_STAGES.has(campaignerStage)
        ? campaignerStage
        : null;

      // Auto-detect country from request headers (CF / proxy). Caller may
      // override via payload but we prefer CF header when present.
      const detectedCountry = detectCountryIso(req, claimedCountry as string | undefined);

      // Tier-2 region verification: if the user supplied a phone number AND
      // its country dialing code matches our IP-detected country, stamp
      // country_verified_at on signup. Soft signal — proves consistency,
      // not ownership. Real ownership = SMS OTP, deferred to v1.5.
      const phone = typeof phoneNumber === "string" ? phoneNumber : null;
      const countryVerifiedNow =
        detectedCountry && phone && phoneMatchesCountry(phone, detectedCountry)
          ? new Date()
          : null;

      const user = await storage.createUser({
        username,
        email,
        password: await hashPassword(password),
        fullName,
        phoneNumber: phone,
        mpesaNumber: typeof mpesaNumber === "string" ? mpesaNumber : null,
        accountType: safeAccountType as any,
        // role intentionally NOT set — defaults to 'clipper' at the DB layer.
        // status / isActive / emailVerified / kycStatus / walletAddress
        // intentionally NOT settable from a public signup.
        campaignerStage: stage,
        countryIso: detectedCountry,
        countryVerifiedAt: countryVerifiedNow,
      });

      // Structured metrics emit. Persists a row to metric_events and a
      // JSON line to stdout. Single source for all platform analytics
      // until we stand up a real metrics pipe.
      emit("signup", {
        role: user.role,
        accountType: user.accountType ?? null,
        stage: stage ?? null,
        country: detectedCountry ?? null,
        countryVerified: !!countryVerifiedNow,
      }, user.id);

      // Fire-and-forget: send verification email. Failures here shouldn't block signup.
      issueVerificationEmail({
        userId: user.id,
        email: user.email,
        fullName: user.fullName,
      }).catch(err => console.error("Failed to issue verification email:", err));

      // Phase 7 Slice A — admin notice that a new user signed up.
      // Fire-and-forget; the admin-notify helper swallows errors so
      // a slow SMTP can't 500 the user-facing signup.
      void (async () => {
        try {
          const [{ notifyAdmin }, { AdminNewSignup }, { APP_URL }, React] =
            await Promise.all([
              import("./lib/admin-notify"),
              import("./emails/admin-new-signup"),
              import("./lib/email"),
              import("react"),
            ]);
          await notifyAdmin({
            kind: "admin_new_signup",
            subject: `New signup · @${user.username} (${user.role})`,
            react: React.createElement(AdminNewSignup, {
              userId: user.id,
              username: user.username,
              email: user.email,
              fullName: user.fullName,
              role: user.role,
              accountType: user.accountType ?? null,
              country: detectedCountry ?? null,
              appUrl: APP_URL,
            }),
            dedupeKey: `admin_new_signup:${user.id}`,
          });
        } catch (err) {
          console.error("admin notify signup failed:", err);
        }
      })();

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          success: true,
          user: toClientUser(user),
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
          user: toClientUser(user),
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

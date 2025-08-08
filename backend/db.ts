import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../shared/schema.js";

// Database connection is optional for static pages
let pool: Pool | null = null;
let db: any = null;

if (process.env.DATABASE_URL) {
  console.log("🗄️ Database: Connected");
  pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10 seconds for Neon serverless
    statement_timeout: 15000,
  });
  db = drizzle({ client: pool, schema });
} else {
  console.log("⚠️ Database: Not configured (static pages only)");
}

export { pool, db };

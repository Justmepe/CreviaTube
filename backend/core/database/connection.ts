import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from "../../../shared/schema";
import * as communitySchema from "../../../shared/community-schema";
import * as monetizationSchema from "../../../shared/community-monetization-schema";
import type { Express } from "express";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
export const db = drizzle({ 
  client: pool, 
  schema: {
    ...schema,
    ...communitySchema,
    ...monetizationSchema
  }
});

export async function setupDatabase(app: Express): Promise<void> {
  try {
    // Test database connection
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
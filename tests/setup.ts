// Loads .env so DATABASE_URL etc. are set before backend modules import.
// Vitest runs setup files before any test file imports.
import "dotenv/config";

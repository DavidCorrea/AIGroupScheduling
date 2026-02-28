import dotenv from "dotenv";

// Load .env then .env.local (Next.js convention) so DATABASE_URL is available for migrations
dotenv.config();
dotenv.config({ path: ".env.local" });

import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});

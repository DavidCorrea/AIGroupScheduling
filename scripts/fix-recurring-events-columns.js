/**
 * One-time fix: add start_time_utc and end_time_utc to recurring_events
 * if they are missing. Uses the same DATABASE_URL as the app.
 *
 * Run from project root: node scripts/fix-recurring-events-columns.js
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Set it in .env or .env.local");
  process.exit(1);
}

const postgres = require("postgres");
const sql = postgres(url, { max: 1 });

async function main() {
  try {
    await sql.unsafe(`
      ALTER TABLE "recurring_events"
      ADD COLUMN IF NOT EXISTS "start_time_utc" text DEFAULT '00:00' NOT NULL;
    `);
    console.log("Added start_time_utc (or already existed).");
    await sql.unsafe(`
      ALTER TABLE "recurring_events"
      ADD COLUMN IF NOT EXISTS "end_time_utc" text DEFAULT '23:59' NOT NULL;
    `);
    console.log("Added end_time_utc (or already existed).");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();

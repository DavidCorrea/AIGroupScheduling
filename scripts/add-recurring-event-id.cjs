/**
 * One-time script: add recurring_event_id to schedule_date using the same
 * DATABASE_URL as the app (.env.local). Run from project root:
 *   node scripts/add-recurring-event-id.cjs
 */
const path = require("path");
require("dotenv").config();
require("dotenv").config({ path: path.join(process.cwd(), ".env.local") });

const postgres = require("postgres");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Check .env.local");
  process.exit(1);
}

const sql = postgres(url);

const alterSql = `
ALTER TABLE "schedule_date"
  ADD COLUMN IF NOT EXISTS "recurring_event_id" integer
  REFERENCES "recurring_events"("id") ON DELETE SET NULL;
`;

async function main() {
  try {
    await sql.unsafe(alterSql);
    console.log("Column recurring_event_id added (or already exists).");
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();

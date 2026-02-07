const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DATABASE_URL || "/data/sqlite.db";
const migrationsDir = path.join(__dirname, "src", "db", "migrations");

console.log(`Migrating database at ${dbPath}...`);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Create the migrations tracking table (same schema as drizzle-orm's migrator)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS __drizzle_migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hash TEXT NOT NULL,
    created_at INTEGER
  );
`);

// Read the journal to get the ordered list of migrations
const journalPath = path.join(migrationsDir, "meta", "_journal.json");
const journal = JSON.parse(fs.readFileSync(journalPath, "utf-8"));

// Get already-applied migration hashes
const applied = new Set(
  sqlite
    .prepare("SELECT hash FROM __drizzle_migrations")
    .all()
    .map((row) => row.hash)
);

let count = 0;
for (const entry of journal.entries) {
  const tag = entry.tag;
  if (applied.has(tag)) continue;

  const sqlFile = path.join(migrationsDir, `${tag}.sql`);
  const sql = fs.readFileSync(sqlFile, "utf-8");

  console.log(`  Applying: ${tag}`);
  sqlite.exec(sql);
  sqlite
    .prepare("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)")
    .run(tag, Date.now());
  count++;
}

sqlite.close();

if (count === 0) {
  console.log("No pending migrations.");
} else {
  console.log(`Applied ${count} migration(s).`);
}

const { drizzle } = require("drizzle-orm/better-sqlite3");
const { migrate } = require("drizzle-orm/better-sqlite3/migrator");
const Database = require("better-sqlite3");

const dbPath = process.env.DATABASE_URL || "/data/sqlite.db";
console.log(`Migrating database at ${dbPath}...`);

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

const db = drizzle(sqlite);
migrate(db, { migrationsFolder: "./src/db/migrations" });

sqlite.close();
console.log("Migrations complete.");

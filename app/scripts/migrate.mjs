// Aplica las migraciones Drizzle contra la base SQLite (ejecutable sin interacción).
// Uso: node scripts/migrate.mjs   (npm run db:migrate:prod)
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'recategorizacion-jornales.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
const db = drizzle(sqlite);
migrate(db, { migrationsFolder: path.join(process.cwd(), 'drizzle') });
console.log('[migrate] migraciones aplicadas en', dbPath);
sqlite.close();

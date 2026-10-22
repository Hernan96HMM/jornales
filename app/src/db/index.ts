import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import fs from 'node:fs';
import * as schema from './schema';
import { seedIfEmpty } from './seed';

let _db: BetterSQLite3Database<typeof schema> | null = null;

function resolveDbPath(): string {
  const p = process.env.DB_PATH || path.join(process.cwd(), 'data', 'recategorizacion-jornales.db');
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return p;
}

/** Devuelve la conexión Drizzle; en el primer uso migra y siembra (idempotente). */
export function getDb(): BetterSQLite3Database<typeof schema> {
  if (_db) return _db;
  const sqlite = new Database(resolveDbPath());
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  const db = drizzle(sqlite, { schema });

  // auto-migración (carpeta drizzle/ copiada junto al código)
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  try {
    if (fs.existsSync(migrationsFolder)) {
      migrate(db, { migrationsFolder });
    }
  } catch (e) {
    console.error('[db] error en migración:', e);
  }

  // auto-seed (solo si la base está vacía)
  try {
    seedIfEmpty(db);
  } catch (e) {
    console.error('[db] error en seed:', e);
  }

  _db = db;
  return _db;
}

export { schema };

// Siembra inicial (idempotente): parámetros, categorías, empleados y admin.
// La app también siembra automáticamente en el primer arranque; este script es un respaldo manual.
// Uso: node scripts/seed.mjs   (npm run db:seed)
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'data', 'recategorizacion-jornales.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'db', 'seed-data.json'), 'utf8'));

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
const now = new Date().toISOString();
const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;

const PARAMS = [['stAcc', 0.195, 'ST ACC (% sobre básico)'], ['incentivo', 0.15, 'Incentivo (%)'], ['presentismo', 0.05, 'Presentismo (%)'], ['aCuenta', 0.05, 'A cuenta (%)']];
try {
  for (const [clave, valor, etiqueta] of PARAMS)
    db.prepare('INSERT OR IGNORE INTO parametros (clave,valor,etiqueta) VALUES (?,?,?)').run(clave, valor, etiqueta);

  const catId = {};
  if (count('categorias') === 0) {
    const ins = db.prepare('INSERT INTO categorias (nombre,basico,activo) VALUES (?,?,1)');
    for (const [nombre, basico] of Object.entries(data.escala)) catId[nombre] = Number(ins.run(nombre, basico).lastInsertRowid);
  } else {
    for (const c of db.prepare('SELECT id,nombre FROM categorias').all()) catId[c.nombre] = c.id;
  }

  if (count('empleados') === 0) {
    const ins = db.prepare(`INSERT INTO empleados (leg,nombre,cuil,depto,supervisor,categoria_id,st_adic,antig,ingreso,activo,creado,actualizado)
      VALUES (@leg,@nombre,@cuil,@depto,@supervisor,@categoria_id,@st_adic,@antig,@ingreso,1,@now,@now)`);
    const tx = db.transaction((emps) => {
      for (const e of emps) ins.run({
        leg: e.leg, nombre: e.nombre, cuil: e.cuil || '', depto: e.depto || '', supervisor: e.supervisor || '',
        categoria_id: catId[e.categoria] ?? null, st_adic: e.stAdic || 0, antig: e.antig || 0, ingreso: e.ingreso || '', now,
      });
    });
    tx(data.empleados);
  }

  if (count('usuarios') === 0) {
    const email = (process.env.ADMIN_EMAIL || 'jnunez@sica.com.ar').toLowerCase();
    const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
    const pass = process.env.ADMIN_INITIAL_PASSWORD;
    if (!pass) throw new Error('[seed] falta ADMIN_INITIAL_PASSWORD en .env');
    db.prepare('INSERT INTO usuarios (email,nombre,password_hash,rol,activo,creado) VALUES (?,?,?,?,1,?)')
      .run(email, nombre, bcrypt.hashSync(pass, 10), 'admin', now);
    console.log('[seed] admin inicial:', email);
  }
  console.log(`[seed] OK — categorías:${count('categorias')} empleados:${count('empleados')} usuarios:${count('usuarios')}`);
} finally { db.close(); }

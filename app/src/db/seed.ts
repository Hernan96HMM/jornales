import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import bcrypt from 'bcryptjs';
import * as schema from './schema';
import seedData from './seed-data.json';

type SeedData = {
  empleados: Array<{
    leg: number; nombre: string; cuil?: string; depto?: string;
    supervisor?: string; categoria: string; stAdic?: number; antig?: number; ingreso?: string;
  }>;
  escala: Record<string, number>;
};

const PARAMS_DEFAULT: Array<[string, number, string]> = [
  ['stAcc', 0.195, 'ST ACC (% sobre básico)'],
  ['incentivo', 0.15, 'Incentivo (% sobre básico+ST ACC+ST Adic)'],
  ['presentismo', 0.05, 'Presentismo (% sobre básico)'],
  ['aCuenta', 0.05, 'A cuenta (% sobre subtotal)'],
];

/** Siembra la base solo si está vacía (idempotente). */
export function seedIfEmpty(db: BetterSQLite3Database<typeof schema>) {
  const data = seedData as SeedData;
  const hayUsuarios = db.select().from(schema.usuarios).limit(1).all().length > 0;
  const hayCategorias = db.select().from(schema.categorias).limit(1).all().length > 0;
  const nowISO = new Date().toISOString();

  // Parámetros
  for (const [clave, valor, etiqueta] of PARAMS_DEFAULT) {
    const existe = db.select().from(schema.parametros).all().some((p) => p.clave === clave);
    if (!existe) db.insert(schema.parametros).values({ clave, valor, etiqueta }).run();
  }

  // Categorías (escala)
  const catIdByNombre = new Map<string, number>();
  if (!hayCategorias) {
    for (const [nombre, basico] of Object.entries(data.escala)) {
      const r = db.insert(schema.categorias).values({ nombre, basico }).run();
      catIdByNombre.set(nombre, Number(r.lastInsertRowid));
    }
  } else {
    for (const c of db.select().from(schema.categorias).all()) catIdByNombre.set(c.nombre, c.id);
  }

  // Empleados
  const hayEmpleados = db.select().from(schema.empleados).limit(1).all().length > 0;
  if (!hayEmpleados) {
    for (const e of data.empleados) {
      db.insert(schema.empleados).values({
        leg: e.leg,
        nombre: e.nombre,
        cuil: e.cuil || '',
        depto: e.depto || '',
        supervisor: e.supervisor || '',
        categoriaId: catIdByNombre.get(e.categoria) ?? null,
        stAdic: e.stAdic || 0,
        antig: e.antig || 0,
        ingreso: e.ingreso || '',
        activo: 1,
        creado: nowISO,
        actualizado: nowISO,
      }).run();
    }
  }

  // Usuario administrador inicial
  if (!hayUsuarios) {
    const email = process.env.ADMIN_EMAIL || 'jnunez@sica.com.ar';
    const nombre = process.env.ADMIN_NOMBRE || 'Administrador';
    const pass = process.env.ADMIN_INITIAL_PASSWORD;
    if (!pass) throw new Error('[seed] falta ADMIN_INITIAL_PASSWORD en .env');
    db.insert(schema.usuarios).values({
      email: email.toLowerCase(),
      nombre,
      passwordHash: bcrypt.hashSync(pass, 10),
      rol: 'admin',
      activo: 1,
      creado: nowISO,
    }).run();
    console.log(`[seed] admin inicial creado: ${email}`);
  }
}

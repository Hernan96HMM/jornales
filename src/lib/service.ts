import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { calcDetalle, calcValorHora, pct, type Params } from './jornal';
import type { SessionUser } from './session';

export function getParams(): Params {
  const db = getDb();
  const rows = db.select().from(schema.parametros).all();
  const m = new Map(rows.map((r) => [r.clave, r.valor]));
  return {
    stAcc: m.get('stAcc') ?? 0.195,
    incentivo: m.get('incentivo') ?? 0.15,
    presentismo: m.get('presentismo') ?? 0.05,
    aCuenta: m.get('aCuenta') ?? 0.05,
  };
}

export type EmpleadoVista = {
  leg: number; nombre: string; cuil: string; depto: string; supervisor: string;
  categoriaId: number | null; categoria: string; basico: number;
  stAdic: number; antig: number; ingreso: string; activo: number;
  bajaFecha: string | null; bajaMotivo: string | null;
  valorHora: number; valorHoraSinIncPres: number;
};

export function listarEmpleados(incluirInactivos = true): EmpleadoVista[] {
  const db = getDb();
  const params = getParams();
  const cats = new Map(db.select().from(schema.categorias).all().map((c) => [c.id, c]));
  const emps = db.select().from(schema.empleados).all();
  return emps
    .filter((e) => incluirInactivos || e.activo === 1)
    .map((e) => {
      const cat = e.categoriaId ? cats.get(e.categoriaId) : undefined;
      const basico = cat?.basico ?? 0;
      return {
        leg: e.leg, nombre: e.nombre, cuil: e.cuil, depto: e.depto, supervisor: e.supervisor,
        categoriaId: e.categoriaId, categoria: cat?.nombre ?? '', basico,
        stAdic: e.stAdic, antig: e.antig, ingreso: e.ingreso, activo: e.activo,
        bajaFecha: e.bajaFecha, bajaMotivo: e.bajaMotivo,
        valorHora: calcValorHora(basico, e.stAdic, e.antig, params, true),
        valorHoraSinIncPres: calcValorHora(basico, e.stAdic, e.antig, params, false),
      };
    });
}

export function empleadoVista(leg: number): EmpleadoVista | null {
  return listarEmpleados(true).find((e) => e.leg === leg) ?? null;
}

/* ===== APLICAR RECATEGORIZACIÓN (snapshot congelado) ===== */
export function aplicarRecategorizacion(leg: number, nuevaCategoriaId: number, user: SessionUser, nota?: string) {
  const db = getDb();
  const params = getParams();
  return db.transaction((tx) => {
    const emp = tx.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
    if (!emp) throw new Error('Empleado inexistente');
    const catAnt = emp.categoriaId ? tx.select().from(schema.categorias).where(eq(schema.categorias.id, emp.categoriaId)).get() : null;
    const catNue = tx.select().from(schema.categorias).where(eq(schema.categorias.id, nuevaCategoriaId)).get();
    if (!catNue) throw new Error('Categoría destino inexistente');

    const basicoAnt = catAnt?.basico ?? 0;
    const basicoNue = catNue.basico;
    const vhAnt = calcDetalle(basicoAnt, emp.stAdic, emp.antig, params).final;
    const vhNue = calcDetalle(basicoNue, emp.stAdic, emp.antig, params).final;
    const p = pct(basicoAnt, basicoNue); // % sobre el básico, CONGELADO

    tx.update(schema.empleados).set({ categoriaId: nuevaCategoriaId, actualizado: new Date().toISOString() })
      .where(eq(schema.empleados.leg, leg)).run();

    tx.insert(schema.historial).values({
      empleadoLeg: leg, fecha: new Date().toISOString(), tipo: 'recategorizacion',
      catAnterior: catAnt?.nombre ?? null, catNueva: catNue.nombre,
      basicoAnterior: basicoAnt, basicoNuevo: basicoNue,
      pct: p, valorHoraAnterior: vhAnt, valorHoraNuevo: vhNue,
      usuarioId: user.id, usuarioNombre: user.nombre, nota: nota ?? null,
    }).run();
    return { basicoAnt, basicoNue, pct: p };
  });
}

/* ===== APLICAR INCREMENTO DE ADICIONAL (ST Adic) — snapshot congelado ===== */
export function aplicarIncremento(leg: number, nuevoAdic: number, user: SessionUser, nota?: string, adicional = 'ST Adic') {
  const db = getDb();
  const params = getParams();
  return db.transaction((tx) => {
    const emp = tx.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
    if (!emp) throw new Error('Empleado inexistente');
    const cat = emp.categoriaId ? tx.select().from(schema.categorias).where(eq(schema.categorias.id, emp.categoriaId)).get() : null;
    const basico = cat?.basico ?? 0;
    const importeAnt = emp.stAdic;
    const importeNue = nuevoAdic;
    const vhAnt = calcDetalle(basico, importeAnt, emp.antig, params).final;
    const vhNue = calcDetalle(basico, importeNue, emp.antig, params).final;
    const p = pct(importeAnt, importeNue);

    tx.update(schema.empleados).set({ stAdic: nuevoAdic, actualizado: new Date().toISOString() })
      .where(eq(schema.empleados.leg, leg)).run();

    tx.insert(schema.historial).values({
      empleadoLeg: leg, fecha: new Date().toISOString(), tipo: 'incremento_adicional',
      adicionalNombre: adicional, importeAnterior: importeAnt, importeNuevo: importeNue,
      pct: p, valorHoraAnterior: vhAnt, valorHoraNuevo: vhNue,
      usuarioId: user.id, usuarioNombre: user.nombre, nota: nota ?? null,
    }).run();
    return { importeAnt, importeNue, pct: p };
  });
}

/* ===== ACTUALIZAR BÁSICO DE CATEGORÍA (gremio) — NO afecta historial individual ===== */
export function actualizarBasicoCategoria(categoriaId: number, nuevoBasico: number, user: SessionUser, nota?: string) {
  const db = getDb();
  return db.transaction((tx) => {
    const cat = tx.select().from(schema.categorias).where(eq(schema.categorias.id, categoriaId)).get();
    if (!cat) throw new Error('Categoría inexistente');
    const basicoAnt = cat.basico;
    const p = pct(basicoAnt, nuevoBasico) ?? 0;
    tx.update(schema.categorias).set({ basico: nuevoBasico }).where(eq(schema.categorias.id, categoriaId)).run();
    tx.insert(schema.categoriaHistorial).values({
      categoriaId, nombre: cat.nombre, fecha: new Date().toISOString(),
      basicoAnterior: basicoAnt, basicoNuevo: nuevoBasico, pct: p,
      usuarioId: user.id, usuarioNombre: user.nombre, nota: nota ?? null,
    }).run();
    return { basicoAnt, basicoNue: nuevoBasico, pct: p };
  });
}

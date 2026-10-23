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

    const hi = tx.insert(schema.historial).values({
      empleadoLeg: leg, fecha: new Date().toISOString(), tipo: 'recategorizacion',
      catAnterior: catAnt?.nombre ?? null, catNueva: catNue.nombre,
      basicoAnterior: basicoAnt, basicoNuevo: basicoNue,
      pct: p, valorHoraAnterior: vhAnt, valorHoraNuevo: vhNue,
      usuarioId: user.id, usuarioNombre: user.nombre, nota: nota ?? null,
    }).run();
    return { basicoAnt, basicoNue, pct: p, historialId: Number(hi.lastInsertRowid) };
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

    const hi = tx.insert(schema.historial).values({
      empleadoLeg: leg, fecha: new Date().toISOString(), tipo: 'incremento_adicional',
      adicionalNombre: adicional, importeAnterior: importeAnt, importeNuevo: importeNue,
      pct: p, valorHoraAnterior: vhAnt, valorHoraNuevo: vhNue,
      usuarioId: user.id, usuarioNombre: user.nombre, nota: nota ?? null,
    }).run();
    return { importeAnt, importeNue, pct: p, historialId: Number(hi.lastInsertRowid) };
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

/* ===== SOLICITUDES (flujo supervisor → RRHH + Gerencia, doble validación) ===== */
export type SolicitudInput = {
  leg: number;
  categoriaPropuestaId?: number | null;
  adicPropuesto?: number | null;
  motivoNuevasResp?: boolean;
  motivoNuevoPuesto?: boolean;
  motivoTareaSuperior?: boolean;
  detalle?: string;
};

export function listarSolicitudes(user: SessionUser) {
  const db = getDb();
  let rows = db.select().from(schema.solicitudes).all().sort((a, b) => (a.creado < b.creado ? 1 : -1));
  if (user.rol === 'supervisor') {
    const ref = user.supervisorRef || '';
    rows = rows.filter((s) => s.supervisorNombre === ref || s.creadoPorId === user.id);
  }
  return rows;
}

export function getSolicitud(id: number) {
  return getDb().select().from(schema.solicitudes).where(eq(schema.solicitudes.id, id)).get() ?? null;
}

export function crearSolicitud(input: SolicitudInput, user: SessionUser) {
  const db = getDb();
  return db.transaction((tx) => {
    const emp = tx.select().from(schema.empleados).where(eq(schema.empleados.leg, input.leg)).get();
    if (!emp) throw new Error('Empleado inexistente');
    if (user.rol === 'supervisor' && emp.supervisor !== (user.supervisorRef || '')) throw new Error('El empleado no está a tu cargo');
    if (!input.categoriaPropuestaId && (input.adicPropuesto == null || input.adicPropuesto === undefined))
      throw new Error('Indicá al menos una categoría propuesta o un nuevo adicional');

    const catAct = emp.categoriaId ? tx.select().from(schema.categorias).where(eq(schema.categorias.id, emp.categoriaId)).get() : null;
    const catProp = input.categoriaPropuestaId ? tx.select().from(schema.categorias).where(eq(schema.categorias.id, input.categoriaPropuestaId)).get() : null;
    const tipo: 'recategorizacion' | 'incremento_adicional' | 'ambos' =
      (catProp && input.adicPropuesto != null) ? 'ambos' : (catProp ? 'recategorizacion' : 'incremento_adicional');

    const now = new Date();
    const mmYY = String(now.getMonth() + 1).padStart(2, '0') + '.' + String(now.getFullYear()).slice(-2);
    const periodoRaw = now.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const periodo = periodoRaw.charAt(0).toUpperCase() + periodoRaw.slice(1);
    const cnt = tx.select().from(schema.solicitudes).all().filter((s) => s.numero.includes(mmYY)).length;
    const numero = `SICA ${mmYY}-${String(cnt + 1).padStart(3, '0')}`;
    const nowISO = now.toISOString();

    const r = tx.insert(schema.solicitudes).values({
      numero, periodo,
      empleadoLeg: emp.leg, empleadoNombre: emp.nombre, tipo,
      motivoNuevasResp: input.motivoNuevasResp ? 1 : 0,
      motivoNuevoPuesto: input.motivoNuevoPuesto ? 1 : 0,
      motivoTareaSuperior: input.motivoTareaSuperior ? 1 : 0,
      detalle: input.detalle || '',
      categoriaActualId: catAct?.id ?? null, categoriaActualNombre: catAct?.nombre ?? null, basicoActual: catAct?.basico ?? null,
      categoriaPropuestaId: catProp?.id ?? null, categoriaPropuestaNombre: catProp?.nombre ?? null, basicoPropuesto: catProp?.basico ?? null,
      adicActual: emp.stAdic, adicPropuesto: input.adicPropuesto != null ? Number(input.adicPropuesto) : null,
      creadoPorId: user.id, creadoPorNombre: user.nombre, supervisorNombre: emp.supervisor,
      creado: nowISO, actualizado: nowISO,
    }).run();
    return { id: Number(r.lastInsertRowid), numero };
  });
}

/** slot: 'rrhh' | 'gerencia'. Al completarse las dos aprobaciones, se APLICA automáticamente. */
export function validarSolicitud(id: number, slot: 'rrhh' | 'gerencia', aprobado: boolean, nota: string | undefined, user: SessionUser) {
  const db = getDb();
  const s = db.select().from(schema.solicitudes).where(eq(schema.solicitudes.id, id)).get();
  if (!s) throw new Error('Solicitud inexistente');
  if (s.estado === 'aplicada' || s.estado === 'rechazada') throw new Error('La solicitud ya está cerrada');

  const nowISO = new Date().toISOString();
  const set: Record<string, unknown> = { actualizado: nowISO };
  if (slot === 'rrhh') { set.rrhhEstado = aprobado ? 'aprobado' : 'rechazado'; set.rrhhUsuario = user.nombre; set.rrhhFecha = nowISO; set.rrhhNota = nota ?? null; }
  else { set.gerenciaEstado = aprobado ? 'aprobado' : 'rechazado'; set.gerenciaUsuario = user.nombre; set.gerenciaFecha = nowISO; set.gerenciaNota = nota ?? null; }
  db.update(schema.solicitudes).set(set).where(eq(schema.solicitudes.id, id)).run();

  const upd = db.select().from(schema.solicitudes).where(eq(schema.solicitudes.id, id)).get()!;
  if (upd.rrhhEstado === 'rechazado' || upd.gerenciaEstado === 'rechazado') {
    db.update(schema.solicitudes).set({ estado: 'rechazada' }).where(eq(schema.solicitudes.id, id)).run();
    return { estado: 'rechazada' as const };
  }
  if (upd.rrhhEstado === 'aprobado' && upd.gerenciaEstado === 'aprobado') {
    let historialId: number | null = null;
    const motivo = `Solicitud ${upd.numero}`;
    if (upd.categoriaPropuestaId) {
      const r = aplicarRecategorizacion(upd.empleadoLeg, upd.categoriaPropuestaId, user, motivo);
      historialId = r.historialId;
    }
    if (upd.adicPropuesto != null) {
      const r = aplicarIncremento(upd.empleadoLeg, upd.adicPropuesto, user, motivo);
      historialId = r.historialId ?? historialId;
    }
    db.update(schema.solicitudes).set({ estado: 'aprobada', historialId }).where(eq(schema.solicitudes.id, id)).run();
    db.update(schema.solicitudes).set({ estado: 'aplicada' }).where(eq(schema.solicitudes.id, id)).run();
    return { estado: 'aplicada' as const, historialId };
  }
  return { estado: 'pendiente' as const };
}

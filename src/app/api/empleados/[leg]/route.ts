import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { leg: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!['admin', 'rrhh'].includes(user.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const leg = Number(params.leg);
  const b = await req.json().catch(() => ({}));
  const db = getDb();
  const emp = db.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
  if (!emp) return NextResponse.json({ error: 'Empleado inexistente' }, { status: 404 });

  const set: Record<string, unknown> = { actualizado: new Date().toISOString() };
  for (const f of ['nombre', 'cuil', 'depto', 'supervisor', 'ingreso'] as const) {
    if (b[f] !== undefined) set[f] = String(b[f]).trim();
  }
  if (b.antig !== undefined) set.antig = Number(b.antig);
  if (b.categoriaId !== undefined) set.categoriaId = b.categoriaId === null ? null : Number(b.categoriaId);
  if (b.stAdic !== undefined) set.stAdic = Number(b.stAdic);
  // reactivar
  if (b.activo === 1 || b.activo === true) { set.activo = 1; set.bajaFecha = null; set.bajaMotivo = null; }

  db.update(schema.empleados).set(set).where(eq(schema.empleados.leg, leg)).run();
  return NextResponse.json({ ok: true });
}

// Baja (soft delete): conserva el empleado y su historial
export async function DELETE(req: Request, { params }: { params: { leg: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!['admin', 'rrhh'].includes(user.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const leg = Number(params.leg);
  const url = new URL(req.url);
  const motivo = url.searchParams.get('motivo') || '';
  const db = getDb();
  const emp = db.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
  if (!emp) return NextResponse.json({ error: 'Empleado inexistente' }, { status: 404 });
  db.update(schema.empleados).set({
    activo: 0, bajaFecha: new Date().toISOString(), bajaMotivo: motivo, actualizado: new Date().toISOString(),
  }).where(eq(schema.empleados.leg, leg)).run();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';
import { listarEmpleados, getParams } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const empleados = listarEmpleados(true);
  const db = getDb();
  const categorias = db.select().from(schema.categorias).all();
  const params = getParams();
  return NextResponse.json({ empleados, categorias, params });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const leg = Number(b.leg);
  if (!leg || !b.nombre) return NextResponse.json({ error: 'Legajo y nombre requeridos' }, { status: 400 });

  const db = getDb();
  const existe = db.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
  if (existe) return NextResponse.json({ error: `El legajo ${leg} ya existe` }, { status: 409 });

  const now = new Date().toISOString();
  db.insert(schema.empleados).values({
    leg,
    nombre: String(b.nombre).trim(),
    cuil: String(b.cuil || '').trim(),
    depto: String(b.depto || '').trim(),
    supervisor: String(b.supervisor || '').trim(),
    categoriaId: b.categoriaId ? Number(b.categoriaId) : null,
    stAdic: Number(b.stAdic || 0),
    antig: Number(b.antig || 0),
    ingreso: String(b.ingreso || '').trim(),
    activo: 1,
    creado: now,
    actualizado: now,
  }).run();
  return NextResponse.json({ ok: true, leg });
}

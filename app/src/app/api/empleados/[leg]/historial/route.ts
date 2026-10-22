import { NextResponse } from 'next/server';
import { eq, desc } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { leg: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const leg = Number(params.leg);
  const db = getDb();
  const emp = db.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
  if (!emp) return NextResponse.json({ error: 'Empleado inexistente' }, { status: 404 });
  const items = db.select().from(schema.historial)
    .where(eq(schema.historial.empleadoLeg, leg))
    .orderBy(desc(schema.historial.fecha))
    .all();
  return NextResponse.json({ empleado: { leg: emp.leg, nombre: emp.nombre }, historial: items });
}

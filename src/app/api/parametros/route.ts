import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  return NextResponse.json({ parametros: db.select().from(schema.parametros).all() });
}

export async function PATCH(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  const cambios: Record<string, number> = b.parametros || {};
  const db = getDb();
  for (const [clave, valor] of Object.entries(cambios)) {
    db.update(schema.parametros).set({ valor: Number(valor) }).where(eq(schema.parametros.clave, clave)).run();
  }
  return NextResponse.json({ ok: true });
}

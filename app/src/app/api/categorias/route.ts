import { NextResponse } from 'next/server';
import { desc } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDb();
  const categorias = db.select().from(schema.categorias).all().sort((a, b) => a.basico - b.basico);
  const historial = db.select().from(schema.categoriaHistorial).orderBy(desc(schema.categoriaHistorial.fecha)).all();
  return NextResponse.json({ categorias, historial });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  if (!b.nombre || b.basico === undefined) return NextResponse.json({ error: 'Nombre y básico requeridos' }, { status: 400 });
  const db = getDb();
  try {
    const r = db.insert(schema.categorias).values({ nombre: String(b.nombre).trim(), basico: Number(b.basico) }).run();
    return NextResponse.json({ ok: true, id: Number(r.lastInsertRowid) });
  } catch {
    return NextResponse.json({ error: 'La categoría ya existe' }, { status: 409 });
  }
}

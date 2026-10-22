import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  const db = getDb();
  const set: Record<string, unknown> = {};
  if (b.nombre !== undefined) set.nombre = String(b.nombre).trim();
  if (b.rol !== undefined) set.rol = b.rol === 'admin' ? 'admin' : 'rrhh';
  if (b.activo !== undefined) set.activo = b.activo ? 1 : 0;
  if (b.password) set.passwordHash = hashPassword(String(b.password));
  if (Object.keys(set).length) db.update(schema.usuarios).set(set).where(eq(schema.usuarios.id, id)).run();
  return NextResponse.json({ ok: true });
}

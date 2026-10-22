import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { verifyPassword } from '@/lib/password';
import { createSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) {
    return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
  }
  const db = getDb();
  const user = db.select().from(schema.usuarios).where(eq(schema.usuarios.email, String(email).toLowerCase())).get();
  if (!user || user.activo !== 1 || !verifyPassword(String(password), user.passwordHash)) {
    return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
  }
  await createSession({ id: user.id, email: user.email, nombre: user.nombre, rol: user.rol });
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, nombre: user.nombre, rol: user.rol } });
}

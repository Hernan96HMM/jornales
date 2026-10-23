import { NextResponse } from 'next/server';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';
import { hashPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  const db = getDb();
  const usuarios = db.select().from(schema.usuarios).all()
    .map((u) => ({ id: u.id, email: u.email, nombre: u.nombre, rol: u.rol, supervisorRef: u.supervisorRef, activo: u.activo, creado: u.creado }));
  // nombres de supervisor existentes (para el combo al crear usuarios supervisor)
  const supervisores = [...new Set(db.select().from(schema.empleados).all().map((e) => e.supervisor).filter(Boolean))].sort();
  return NextResponse.json({ usuarios, supervisores });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.email || !b.nombre || !b.password) return NextResponse.json({ error: 'Email, nombre y contraseña requeridos' }, { status: 400 });
  const ROLES = ['admin', 'rrhh', 'supervisor', 'gerencia'];
  const rol = ROLES.includes(b.rol) ? b.rol : 'rrhh';
  const db = getDb();
  try {
    db.insert(schema.usuarios).values({
      email: String(b.email).toLowerCase().trim(),
      nombre: String(b.nombre).trim(),
      passwordHash: hashPassword(String(b.password)),
      rol,
      supervisorRef: rol === 'supervisor' && b.supervisorRef ? String(b.supervisorRef).trim() : null,
      activo: 1,
      creado: new Date().toISOString(),
    }).run();
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
  }
}

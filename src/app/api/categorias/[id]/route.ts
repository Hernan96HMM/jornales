import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';
import { actualizarBasicoCategoria } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!['admin', 'rrhh'].includes(user.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const id = Number(params.id);
  const b = await req.json().catch(() => ({}));
  const db = getDb();
  const cat = db.select().from(schema.categorias).where(eq(schema.categorias.id, id)).get();
  if (!cat) return NextResponse.json({ error: 'Categoría inexistente' }, { status: 404 });

  // renombrar / activar (sin historial)
  const set: Record<string, unknown> = {};
  if (b.nombre !== undefined) set.nombre = String(b.nombre).trim();
  if (b.activo !== undefined) set.activo = b.activo ? 1 : 0;
  if (Object.keys(set).length) db.update(schema.categorias).set(set).where(eq(schema.categorias.id, id)).run();

  // actualización de básico (gremio) → registra en categoria_historial, NO afecta historial individual
  if (b.basico !== undefined && Number(b.basico) !== cat.basico) {
    const r = actualizarBasicoCategoria(id, Number(b.basico), user, b.nota ? String(b.nota) : undefined);
    return NextResponse.json({ ok: true, cambioBasico: r });
  }
  return NextResponse.json({ ok: true });
}

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { aplicarRecategorizacion } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { leg: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!['admin', 'rrhh'].includes(user.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const leg = Number(params.leg);
  const b = await req.json().catch(() => ({}));
  const nuevaCategoriaId = Number(b.categoriaId);
  if (!nuevaCategoriaId) return NextResponse.json({ error: 'Categoría destino requerida' }, { status: 400 });
  try {
    const r = aplicarRecategorizacion(leg, nuevaCategoriaId, user, b.nota ? String(b.nota) : undefined);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

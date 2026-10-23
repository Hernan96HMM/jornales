import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getSolicitud, getParams } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const s = getSolicitud(Number(params.id));
  if (!s) return NextResponse.json({ error: 'Solicitud inexistente' }, { status: 404 });
  if (user.rol === 'supervisor' && s.supervisorNombre !== (user.supervisorRef || '') && s.creadoPorId !== user.id)
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  return NextResponse.json({ solicitud: s, params: getParams() });
}

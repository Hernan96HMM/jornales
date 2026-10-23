import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { validarSolicitud } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  const b = await req.json().catch(() => ({}));

  // el slot lo determina el rol (admin puede elegir)
  let slot: 'rrhh' | 'gerencia' | null = null;
  if (user.rol === 'rrhh') slot = 'rrhh';
  else if (user.rol === 'gerencia') slot = 'gerencia';
  else if (user.rol === 'admin') slot = b.slot === 'gerencia' ? 'gerencia' : b.slot === 'rrhh' ? 'rrhh' : null;
  if (!slot) return NextResponse.json({ error: 'No autorizado para validar (indicá slot si sos admin)' }, { status: 403 });

  try {
    const r = validarSolicitud(Number(params.id), slot, b.aprobado !== false, b.nota ? String(b.nota) : undefined, user);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

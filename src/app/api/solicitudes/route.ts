import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listarSolicitudes, crearSolicitud } from '@/lib/service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  return NextResponse.json({ solicitudes: listarSolicitudes(user), rol: user.rol });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (!['supervisor', 'rrhh', 'admin'].includes(user.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const b = await req.json().catch(() => ({}));
  if (!b.leg) return NextResponse.json({ error: 'Empleado requerido' }, { status: 400 });
  try {
    const r = crearSolicitud({
      leg: Number(b.leg),
      categoriaPropuestaId: b.categoriaPropuestaId ? Number(b.categoriaPropuestaId) : null,
      adicPropuesto: (b.adicPropuesto === '' || b.adicPropuesto == null) ? null : Number(b.adicPropuesto),
      motivoNuevasResp: !!b.motivoNuevasResp, motivoNuevoPuesto: !!b.motivoNuevoPuesto, motivoTareaSuperior: !!b.motivoTareaSuperior,
      detalle: b.detalle ? String(b.detalle) : '',
    }, user);
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

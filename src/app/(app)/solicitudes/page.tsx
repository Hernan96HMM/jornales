'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, fmt, fmt0, fechaCorta, toast } from '@/lib/ui';
import { useUser } from '@/components/UserContext';

type Sol = {
  id: number; numero: string; periodo: string; empleadoLeg: number; empleadoNombre: string;
  tipo: string; categoriaActualNombre: string | null; categoriaPropuestaNombre: string | null;
  adicActual: number | null; adicPropuesto: number | null; supervisorNombre: string | null;
  estado: 'pendiente' | 'rechazada' | 'aprobada' | 'aplicada';
  rrhhEstado: string; rrhhUsuario: string | null; gerenciaEstado: string; gerenciaUsuario: string | null;
  creado: string; creadoPorNombre: string | null;
};

const estadoBadge = (e: string) => e === 'aplicada' || e === 'aprobada' ? 'b-alta' : e === 'rechazada' || e === 'rechazado' ? 'b-baja' : e === 'aprobado' ? 'b-alta' : 'b-rrhh';
const estadoTxt = (e: string) => e === 'pendiente' ? 'Pendiente' : e === 'aprobado' ? 'Aprobado' : e === 'rechazado' ? 'Rechazado' : e;

export default function SolicitudesPage() {
  const user = useUser();
  const [sols, setSols] = useState<Sol[]>([]);
  const [loading, setLoading] = useState(true);
  const [valModal, setValModal] = useState<null | { sol: Sol; slot: 'rrhh' | 'gerencia' }>(null);

  const puedeRRHH = user.rol === 'rrhh' || user.rol === 'admin';
  const puedeGerencia = user.rol === 'gerencia' || user.rol === 'admin';

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const d = await api('/api/solicitudes'); setSols(d.solicitudes); }
    catch (e) { toast((e as Error).message, 'err'); }
    setLoading(false);
  }

  const kpis = useMemo(() => ({
    total: sols.length,
    pendientes: sols.filter((s) => s.estado === 'pendiente').length,
    aplicadas: sols.filter((s) => s.estado === 'aplicada').length,
    rechazadas: sols.filter((s) => s.estado === 'rechazada').length,
  }), [sols]);

  return (
    <div>
      <h1 className="page">Solicitudes de modificación</h1>
      <div className="sub">Flujo: el supervisor propone → validan <b>RRHH</b> y <b>Gerencia de Producción</b> → con las dos aprobaciones el cambio se aplica y queda en el historial. {user.rol === 'supervisor' && 'Para crear una, usá 📝 Solicitar en la Nómina.'}</div>

      <div className="kpis">
        <div className="kpi"><div className="lbl">Total</div><div className="val">{kpis.total}</div></div>
        <div className="kpi cel"><div className="lbl">Pendientes</div><div className="val">{kpis.pendientes}</div></div>
        <div className="kpi"><div className="lbl">Aplicadas</div><div className="val">{kpis.aplicadas}</div></div>
        <div className="kpi"><div className="lbl">Rechazadas</div><div className="val">{kpis.rechazadas}</div></div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr>
            <th>N°</th><th>Fecha</th><th>Empleado</th><th>Propuesta</th>
            <th>RRHH</th><th>Gerencia</th><th>Estado</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Cargando…</td></tr>
              : sols.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Sin solicitudes.</td></tr>
                : sols.map((s) => {
                  const resumen = [
                    s.categoriaPropuestaNombre ? `${s.categoriaActualNombre || '—'} → ${s.categoriaPropuestaNombre}` : null,
                    s.adicPropuesto != null ? `ST Adic ${fmt0(s.adicActual || 0)} → ${fmt0(s.adicPropuesto)}` : null,
                  ].filter(Boolean).join(' · ');
                  const abierta = s.estado === 'pendiente';
                  return (
                    <tr key={s.id}>
                      <td><b>{s.numero}</b></td>
                      <td>{fechaCorta(s.creado)}</td>
                      <td>{s.empleadoNombre}<br /><span className="muted" style={{ fontSize: 11 }}>sup: {s.supervisorNombre}</span></td>
                      <td>{resumen || '—'}</td>
                      <td><span className={`badge ${estadoBadge(s.rrhhEstado)}`}>{estadoTxt(s.rrhhEstado)}</span>{s.rrhhUsuario && <div className="muted" style={{ fontSize: 10 }}>{s.rrhhUsuario}</div>}</td>
                      <td><span className={`badge ${estadoBadge(s.gerenciaEstado)}`}>{estadoTxt(s.gerenciaEstado)}</span>{s.gerenciaUsuario && <div className="muted" style={{ fontSize: 10 }}>{s.gerenciaUsuario}</div>}</td>
                      <td><span className={`badge ${estadoBadge(s.estado)}`}>{s.estado}</span></td>
                      <td>
                        <div className="row" style={{ gap: 5 }}>
                          <Link className="btn btn-sm" href={`/solicitudes/${s.id}/imprimir`} target="_blank">🖨 Ver / PDF</Link>
                          {abierta && puedeRRHH && s.rrhhEstado === 'pendiente' && <button className="btn-sm" onClick={() => setValModal({ sol: s, slot: 'rrhh' })}>Validar RRHH</button>}
                          {abierta && puedeGerencia && s.gerenciaEstado === 'pendiente' && <button className="btn-sm" onClick={() => setValModal({ sol: s, slot: 'gerencia' })}>Validar Gerencia</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {valModal && <ValidarModal vm={valModal} onClose={() => setValModal(null)} onDone={() => { setValModal(null); load(); }} />}
    </div>
  );
}

function ValidarModal({ vm, onClose, onDone }: { vm: { sol: Sol; slot: 'rrhh' | 'gerencia' }; onClose: () => void; onDone: () => void }) {
  const [nota, setNota] = useState('');
  const [busy, setBusy] = useState(false);
  const { sol, slot } = vm;
  const slotTxt = slot === 'rrhh' ? 'RR.HH.' : 'Gerencia de Producción';

  async function decidir(aprobado: boolean) {
    setBusy(true);
    try {
      const r = await api(`/api/solicitudes/${sol.id}/validar`, { method: 'POST', body: JSON.stringify({ slot, aprobado, nota }) });
      toast(aprobado ? (r.estado === 'aplicada' ? '✓ Aprobada y aplicada (2ª validación)' : '✓ Validación registrada') : 'Solicitud rechazada', aprobado ? 'ok' : 'warn');
      onDone();
    } catch (e) { toast((e as Error).message, 'err'); setBusy(false); }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>Validar como {slotTxt} — {sol.numero}</h3>
        <div className="body">
          <p style={{ marginBottom: 10 }}><b>{sol.empleadoNombre}</b></p>
          <p style={{ marginBottom: 10, color: 'var(--t2)' }}>
            {sol.categoriaPropuestaNombre && <>Categoría: <b>{sol.categoriaActualNombre}</b> → <b>{sol.categoriaPropuestaNombre}</b><br /></>}
            {sol.adicPropuesto != null && <>ST Adic: <b>${fmt(sol.adicActual || 0)}</b> → <b>${fmt(sol.adicPropuesto)}</b></>}
          </p>
          <p style={{ marginBottom: 10, fontSize: 12, color: 'var(--amb)' }}>Si aprobás y la otra validación ya está aprobada, el cambio se aplica automáticamente.</p>
          <label className="fld">Observación (opcional)<input value={nota} onChange={(e) => setNota(e.target.value)} /></label>
        </div>
        <div className="foot">
          <button onClick={onClose}>Cancelar</button>
          <button className="btn-danger" onClick={() => decidir(false)} disabled={busy}>Rechazar</button>
          <button className="btn-ok" onClick={() => decidir(true)} disabled={busy}>{busy ? '…' : 'Aprobar'}</button>
        </div>
      </div>
    </div>
  );
}

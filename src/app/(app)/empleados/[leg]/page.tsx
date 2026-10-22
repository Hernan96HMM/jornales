'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, fmt, fmtPct, fechaCorta, toast } from '@/lib/ui';

type Hist = {
  id: number; fecha: string; tipo: 'recategorizacion' | 'incremento_adicional';
  catAnterior: string | null; catNueva: string | null; basicoAnterior: number | null; basicoNuevo: number | null;
  adicionalNombre: string | null; importeAnterior: number | null; importeNuevo: number | null;
  pct: number | null; valorHoraAnterior: number | null; valorHoraNuevo: number | null;
  usuarioNombre: string | null; nota: string | null;
};

export default function EmpleadoPage({ params }: { params: { leg: string } }) {
  const leg = Number(params.leg);
  const [emp, setEmp] = useState<{ leg: number; nombre: string } | null>(null);
  const [hist, setHist] = useState<Hist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const d = await api(`/api/empleados/${leg}/historial`); setEmp(d.empleado); setHist(d.historial); }
    catch (e) { toast((e as Error).message, 'err'); }
    setLoading(false);
  }

  const recats = hist.filter((h) => h.tipo === 'recategorizacion');
  const incs = hist.filter((h) => h.tipo === 'incremento_adicional');

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <Link href="/nomina" className="btn btn-sm">← Volver a nómina</Link>
      </div>
      <h1 className="page">{emp ? emp.nombre : `Legajo ${leg}`}</h1>
      <div className="sub">Legajo {leg} · Historial de recategorizaciones e incrementos (valores congelados al momento de cada cambio)</div>

      <div className="kpis">
        <div className="kpi"><div className="lbl">Recategorizaciones</div><div className="val">{recats.length}</div></div>
        <div className="kpi cel"><div className="lbl">Incrementos de adicional</div><div className="val">{incs.length}</div></div>
        <div className="kpi"><div className="lbl">Total de cambios</div><div className="val">{hist.length}</div></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 14, background: '#f8fbfe', borderLeft: '4px solid var(--cel)' }}>
        ℹ️ Los porcentajes y los importes de cada registro son <b>los vigentes en la fecha del cambio</b> y no se recalculan cuando luego se actualizan los básicos del gremio. Así, una recategorización individual nunca aparece en negativo por una suba general posterior.
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr>
            <th>Fecha</th><th>Tipo</th><th>Detalle del cambio</th>
            <th className="num">Anterior</th><th className="num">Nuevo</th><th className="num">% aumento</th>
            <th className="num">Valor hora (ant → nuevo)</th><th>Usuario</th><th>Nota</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Cargando…</td></tr>
              : hist.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Sin cambios registrados todavía.</td></tr>
                : hist.map((h) => (
                  <tr key={h.id}>
                    <td>{fechaCorta(h.fecha)}</td>
                    <td>{h.tipo === 'recategorizacion'
                      ? <span className="hist-tag h-recat">Recategorización</span>
                      : <span className="hist-tag h-inc">Incremento {h.adicionalNombre}</span>}</td>
                    <td>{h.tipo === 'recategorizacion'
                      ? <span><b>{h.catAnterior || '—'}</b> → <b>{h.catNueva}</b></span>
                      : <span>{h.adicionalNombre}</span>}</td>
                    <td className="num">{h.tipo === 'recategorizacion' ? fmt(h.basicoAnterior) : fmt(h.importeAnterior)}</td>
                    <td className="num">{h.tipo === 'recategorizacion' ? fmt(h.basicoNuevo) : fmt(h.importeNuevo)}</td>
                    <td className="num"><span className={(h.pct ?? 0) >= 0 ? 'pos' : 'neg'}>{fmtPct(h.pct)}</span></td>
                    <td className="num">{fmt(h.valorHoraAnterior)} → <b>{fmt(h.valorHoraNuevo)}</b></td>
                    <td><span className="muted">{h.usuarioNombre || ''}</span></td>
                    <td><span className="muted">{h.nota || ''}</span></td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

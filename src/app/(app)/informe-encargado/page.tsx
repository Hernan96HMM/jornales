'use client';
import { useEffect, useMemo, useState } from 'react';
import { api, fmt, fmt0, toast } from '@/lib/ui';
import { calcValorHora, type Params } from '@/lib/jornal';

type Emp = {
  leg: number; nombre: string; supervisor: string; categoria: string; basico: number;
  stAdic: number; antig: number; activo: number;
};

export default function InformeEncargadoPage() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [params, setParams] = useState<Params>({ stAcc: 0.195, incentivo: 0.15, presentismo: 0.05, aCuenta: 0.05 });
  const [sup, setSup] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    try { const d = await api('/api/empleados'); setEmps(d.empleados.filter((e: Emp) => e.activo === 1)); setParams(d.params); }
    catch (e) { toast((e as Error).message, 'err'); }
    setLoading(false);
  }

  const supervisores = useMemo(() => [...new Set(emps.map((e) => e.supervisor).filter(Boolean))].sort(), [emps]);
  const lista = useMemo(() => emps.filter((e) => sup && e.supervisor === sup)
    .sort((a, b) => a.nombre.localeCompare(b.nombre)), [emps, sup]);
  const sumaVH = lista.reduce((s, e) => s + calcValorHora(e.basico, e.stAdic, e.antig, params, true), 0);
  const hoy = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div>
      {/* Encabezado solo para impresión */}
      <div className="print-head">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/sica-color.png" alt="SICA" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
        <h2>Informe de categorización del personal</h2>
        <div className="meta">Encargado: <b>{sup || '—'}</b> · Fecha: {hoy} · {lista.length} empleados</div>
        <br />
      </div>

      <div className="noprint">
        <h1 className="page">Informe por Encargado</h1>
        <div className="sub">Seleccioná un encargado para ver cómo está categorizada su gente. Luego podés imprimirlo o guardarlo en PDF.</div>
        <div className="card card-pad toolbar" style={{ alignItems: 'center' }}>
          <label className="fld">Encargado / Supervisor
            <select value={sup} onChange={(e) => setSup(e.target.value)} style={{ minWidth: 280 }}>
              <option value="">— Elegí un encargado —</option>
              {supervisores.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <div style={{ alignSelf: 'flex-end' }}>
            <button className="btn-primary" disabled={!sup || !lista.length} onClick={() => window.print()}>🖨 Imprimir / Guardar PDF</button>
          </div>
        </div>
      </div>

      {sup && (
        <>
          <div className="kpis noprint">
            <div className="kpi"><div className="lbl">Empleados a cargo</div><div className="val">{lista.length}</div></div>
            <div className="kpi cel"><div className="lbl">Valor hora (suma)</div><div className="val">${fmt0(sumaVH)}</div></div>
            <div className="kpi"><div className="lbl">Promedio</div><div className="val">${fmt0(lista.length ? sumaVH / lista.length : 0)}</div></div>
          </div>

          <div className="tbl-wrap">
            <table>
              <thead><tr>
                <th>Leg</th><th>Apellido y Nombre</th><th>Categoría</th>
                <th className="num">Básico</th><th className="num">ST ACC</th><th className="num">ST Adic</th>
                <th className="num">Antig.</th><th className="num">Valor Hora</th>
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Cargando…</td></tr>
                  : lista.length === 0 ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Sin empleados para ese encargado.</td></tr>
                    : lista.map((e) => (
                      <tr key={e.leg}>
                        <td>{e.leg}</td>
                        <td>{e.nombre}</td>
                        <td><span className="chip">{e.categoria || '—'}</span></td>
                        <td className="num">{fmt(e.basico)}</td>
                        <td className="num">{fmt(e.basico * params.stAcc)}</td>
                        <td className="num">{fmt(e.stAdic)}</td>
                        <td className="num">{e.antig}</td>
                        <td className="num"><b>{fmt(calcValorHora(e.basico, e.stAdic, e.antig, params, true))}</b></td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { api, fmt0, fmtPct, toast } from '@/lib/ui';

type Disp = { categoria: string; n: number; ceros: number; min: number; max: number; prom: number; mediana: number; desv: number; brecha: number; gini: number };
type Out = { leg: number; nombre: string; categoria: string; stAdic: number; prom: number; dif: number; tipo: string };
type Cand = { leg: number; nombre: string; categoria: string; stAdic: number; objetivo: number; ajuste: number };
type Data = {
  totalEmpleados: number; giniGlobal: number; cerosTotal: number; correlacionAntig: number;
  dispersion: Disp[]; outliers: Out[]; nivelacionMediana: { beneficiados: number; costoHora: number; promedio: number }; candidatos: Cand[];
};

export default function AnalisisPage() {
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/analisis').then(setD).catch((e) => setErr((e as Error).message)); }, []);
  if (err) return <div className="card card-pad" style={{ color: 'var(--red)' }}>{err}</div>;
  if (!d) return <div className="card card-pad">Calculando…</div>;

  return (
    <div>
      <h1 className="page">Análisis de equidad interna</h1>
      <div className="sub">Foco en el adicional ST Adic. Los desvíos marcados son para revisión (el ST Adic puede reflejar horas reales).</div>

      <div className="kpis">
        <div className="kpi"><div className="lbl">Empleados activos</div><div className="val">{d.totalEmpleados}</div></div>
        <div className="kpi cel"><div className="lbl">Gini ST Adic</div><div className="val">{d.giniGlobal.toFixed(3).replace('.', ',')}</div><div className="sub2">desigualdad global</div></div>
        <div className="kpi"><div className="lbl">En $0</div><div className="val">{d.cerosTotal}</div><div className="sub2">sin adicional</div></div>
        <div className="kpi"><div className="lbl">Correlación c/ antigüedad</div><div className="val">{d.correlacionAntig.toFixed(2).replace('.', ',')}</div><div className="sub2">débil = no la premia</div></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <b style={{ color: 'var(--navy)' }}>Dispersión del ST Adic por categoría</b>
        <div className="tbl-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>Categoría</th><th className="num">n</th><th className="num">en $0</th><th className="num">Mín</th><th className="num">Máx</th><th className="num">Prom</th><th className="num">Mediana</th><th className="num">Brecha</th><th className="num">Gini</th></tr></thead>
            <tbody>{d.dispersion.map((x) => (
              <tr key={x.categoria}><td>{x.categoria}</td><td className="num">{x.n}</td><td className="num">{x.ceros}</td>
                <td className="num">{fmt0(x.min)}</td><td className="num">{fmt0(x.max)}</td><td className="num">{fmt0(x.prom)}</td>
                <td className="num">{fmt0(x.mediana)}</td><td className="num">{fmt0(x.brecha)}</td>
                <td className="num"><span className={x.gini >= 0.4 ? 'neg' : ''}>{x.gini.toFixed(2).replace('.', ',')}</span></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: '1.2fr 1fr', alignItems: 'start' }}>
        <div className="card card-pad">
          <b style={{ color: 'var(--navy)' }}>Desvíos individuales (outliers)</b>
          <div className="tbl-wrap" style={{ marginTop: 10 }}>
            <table>
              <thead><tr><th>Tipo</th><th>Leg</th><th>Nombre</th><th>Categoría</th><th className="num">ST Adic</th><th className="num">Prom cat.</th><th className="num">Desvío</th></tr></thead>
              <tbody>{d.outliers.map((o) => (
                <tr key={o.leg}><td><span className={`badge ${o.tipo === 'ALTO' ? 'b-baja' : 'b-rrhh'}`}>{o.tipo}</span></td>
                  <td>{o.leg}</td><td>{o.nombre}</td><td>{o.categoria}</td><td className="num">{fmt0(o.stAdic)}</td>
                  <td className="num">{fmt0(o.prom)}</td><td className="num"><span className={o.dif >= 0 ? 'neg' : 'pos'}>{o.dif >= 0 ? '+' : ''}{fmt0(o.dif)}</span></td></tr>
              ))}</tbody>
            </table>
          </div>
        </div>

        <div className="card card-pad">
          <b style={{ color: 'var(--navy)' }}>Propuesta de nivelación</b>
          <div className="kpis" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
            <div className="kpi"><div className="lbl">Nivelar a la mediana de cada categoría</div>
              <div className="val">{d.nivelacionMediana.beneficiados} personas</div>
              <div className="sub2">+${fmt0(d.nivelacionMediana.costoHora)}/hora · prom ${fmt0(d.nivelacionMediana.promedio)} c/u</div></div>
          </div>
          <div className="sub" style={{ marginTop: 6 }}>Sin bajarle a nadie: solo sube a quienes están por debajo de la mediana de su categoría.</div>
        </div>
      </div>
    </div>
  );
}

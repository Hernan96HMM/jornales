'use client';
import { useEffect, useState } from 'react';
import { api, fmt, fechaCorta } from '@/lib/ui';

type Sol = any;
type Cat = { id: number; nombre: string; basico: number };

const CRITERIOS = [
  ['Excelente desempeño', 'Habilidades de autonomía, resolución de tareas, predisposición, cumplimiento eficiente, proactividad, trabajo en equipo.'],
  ['Puntualidad y ausentismo', 'Según fichadas.'],
  ['Polivalente', 'Puede desempeñar varias funciones de forma eficiente sin ayuda.'],
  ['Nuevas responsabilidades', 'Adquiridas en el último año y llevadas adelante en forma eficiente, con desempeño aceptable.'],
];

export default function ImprimirSolicitud({ params }: { params: { id: string } }) {
  const [sol, setSol] = useState<Sol | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [p, setP] = useState({ stAcc: 0.195, incentivo: 0.15, presentismo: 0.05, aCuenta: 0.05 });
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const d = await api(`/api/solicitudes/${params.id}`);
        setSol(d.solicitud); setP(d.params);
        const c = await api('/api/categorias'); setCats(c.categorias);
      } catch (e) { setErr((e as Error).message); }
    })();
  }, [params.id]);

  if (err) return <div style={{ padding: 40, color: '#c0392b' }}>{err}</div>;
  if (!sol) return <div style={{ padding: 40 }}>Cargando…</div>;

  const basicoAct = sol.basicoActual || 0;
  const basicoProp = sol.categoriaPropuestaNombre ? (sol.basicoPropuesto || 0) : basicoAct;
  const accAct = basicoAct * p.stAcc, accProp = basicoProp * p.stAcc;
  const avpAct = sol.adicActual || 0, avpProp = sol.adicPropuesto != null ? sol.adicPropuesto : avpAct;
  const totAct = accAct + avpAct, totProp = accProp + avpProp;
  const pctCell = (a: number, b: number) => a ? (((b - a) / a) * 100).toFixed(1).replace('.', ',') + '%' : '—';
  const marca = (n: string) => sol.categoriaActualNombre === n ? 'A' : sol.categoriaPropuestaNombre === n ? 'P' : '';

  return (
    <div className="doc">
      <style>{`
        body{background:#e9edf2}
        .doc{max-width:820px;margin:18px auto;background:#fff;padding:34px 40px;box-shadow:0 2px 14px rgba(0,0,0,.12);font-family:'Segoe UI',Arial,sans-serif;color:#1c2733;font-size:13px;line-height:1.5}
        .doc h1{color:#314973;font-size:18px;text-align:center;margin-bottom:2px}
        .doc .nro{text-align:center;color:#5a6b7d;font-size:12px;margin-bottom:16px}
        .doc .logo{height:40px;display:block;margin:0 auto 10px}
        .doc .fld{margin:9px 0}
        .doc .lbl{font-weight:600;color:#314973}
        .doc .chk{display:inline-block;width:15px;height:15px;border:1.5px solid #314973;border-radius:3px;text-align:center;line-height:13px;margin-right:7px;font-weight:700;color:#12A5DB}
        .doc .motivos div{margin:4px 0}
        .doc .detalle{border:1px solid #c7d3e3;border-radius:6px;padding:10px;min-height:52px;white-space:pre-wrap;background:#f8fbfe}
        .doc table{width:100%;border-collapse:collapse;margin:8px 0 14px;font-size:12px}
        .doc th,.doc td{border:1px solid #c7d3e3;padding:5px 7px;text-align:center}
        .doc th{background:#eef3f9;color:#314973}
        .doc td.l{text-align:left}
        .doc .num{text-align:right;font-variant-numeric:tabular-nums}
        /* grilla de categorías: ajustar al ancho de la página (columnas iguales, texto que envuelve) */
        .doc .grid-cat{table-layout:fixed}
        .doc .grid-cat th,.doc .grid-cat td{font-size:8.5px;padding:4px 2px;word-break:break-word;white-space:normal;line-height:1.15;text-align:center}
        .doc .crit{font-size:11.5px;color:#444;margin:3px 0}
        .doc .crit b{color:#314973}
        .doc .firmas{display:flex;gap:30px;margin-top:42px;text-align:center}
        .doc .firmas .f{flex:1;border-top:1px solid #1c2733;padding-top:6px;font-size:12px}
        .doc .firmas .f small{display:block;color:#5a6b7d}
        .doc .mA{background:#314973;color:#fff;font-weight:700}
        .doc .mP{background:#12A5DB;color:#fff;font-weight:700}
        .sectitle{color:#314973;font-weight:700;border-bottom:2px solid #dde5ef;padding-bottom:4px;margin:18px 0 8px}
        .noprint{text-align:center;margin:14px auto;max-width:820px}
        .noprint button{background:#314973;color:#fff;border:none;padding:9px 20px;border-radius:7px;font-size:13px;cursor:pointer;font-family:inherit}
        @media print{ body{background:#fff} .doc{box-shadow:none;margin:0;max-width:none;padding:0 6mm} .noprint{display:none} }
      `}</style>

      <div className="noprint">
        <button onClick={() => window.print()}>🖨 Imprimir / Guardar como PDF</button>
      </div>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo" src="/logo/sica-color.png" alt="SICA" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
      <h1>Solicitud de modificación de categoría SICA – {sol.periodo}</h1>
      <div className="nro">{sol.numero}</div>

      <div className="fld"><span className="lbl">Apellido y Nombre del Operario:</span> {sol.empleadoNombre} &nbsp; <span style={{ color: '#5a6b7d' }}>(Leg. {sol.empleadoLeg})</span></div>

      <div className="fld">
        <div className="lbl">Motivo de la solicitud:</div>
        <div className="motivos">
          <div><span className="chk">{sol.motivoNuevasResp ? '✓' : ''}</span>Nuevas responsabilidades a su cargo</div>
          <div><span className="chk">{sol.motivoNuevoPuesto ? '✓' : ''}</span>Nuevo puesto con mayores responsabilidades</div>
          <div><span className="chk">{sol.motivoTareaSuperior ? '✓' : ''}</span>Tarea / oficio detallado en categoría superior</div>
        </div>
      </div>

      <div className="fld">
        <div className="lbl">Breve detalle de cuál/es:</div>
        <div className="detalle">{sol.detalle || ' '}</div>
      </div>

      <p style={{ fontSize: 11.5, color: '#444', margin: '12px 0 6px' }}>
        En esta revisión de puestos, el encargado junto con el gerente de producción eleva la propuesta de modificar categoría / adicional, informando los motivos. RRHH tendrá en cuenta en la decisión:
      </p>
      {CRITERIOS.map(([t, d]) => <div className="crit" key={t}><b>{t}:</b> {d}</div>)}

      <div className="sectitle">SOLICITUD</div>
      <table className="grid-cat">
        <thead><tr>{cats.map((c) => <th key={c.id}>{c.nombre}</th>)}</tr></thead>
        <tbody>
          <tr>{cats.map((c) => { const m = marca(c.nombre); return <td key={c.id} className={m === 'A' ? 'mA' : m === 'P' ? 'mP' : ''}>{m === 'A' ? 'Actual' : m === 'P' ? 'Propuesta' : ''}</td>; })}</tr>
          <tr>{cats.map((c) => <td key={c.id}>${fmt(c.basico)}</td>)}</tr>
        </tbody>
      </table>

      <table>
        <thead><tr><th className="l">Conceptos</th><th>Actual</th><th>%</th><th>Propuesto</th></tr></thead>
        <tbody>
          <tr><td className="l">Básico</td><td className="num">${fmt(basicoAct)}</td><td>{pctCell(basicoAct, basicoProp)}</td><td className="num">${fmt(basicoProp)}</td></tr>
          <tr><td className="l">ACC UOM ({(p.stAcc * 100).toFixed(1).replace('.', ',')}%)</td><td className="num">${fmt(accAct)}</td><td>{pctCell(accAct, accProp)}</td><td className="num">${fmt(accProp)}</td></tr>
          <tr><td className="l">ST AVP (adicional)</td><td className="num">${fmt(avpAct)}</td><td>{pctCell(avpAct, avpProp)}</td><td className="num">${fmt(avpProp)}</td></tr>
          <tr style={{ fontWeight: 700 }}><td className="l">TOTAL</td><td className="num">${fmt(totAct)}</td><td>{pctCell(totAct, totProp)}</td><td className="num">${fmt(totProp)}</td></tr>
        </tbody>
      </table>

      <div className="firmas">
        <div className="f">{sol.supervisorNombre || ''}<small>Supervisor {sol.creadoPorNombre && sol.creadoPorNombre !== sol.supervisorNombre ? `(${sol.creadoPorNombre})` : ''}</small></div>
        <div className="f">{sol.rrhhUsuario || ''}<small>RR. HH. {sol.rrhhFecha ? fechaCorta(sol.rrhhFecha) : ''}</small></div>
        <div className="f">{sol.gerenciaUsuario || ''}<small>Gte. de Producción {sol.gerenciaFecha ? fechaCorta(sol.gerenciaFecha) : ''}</small></div>
      </div>
    </div>
  );
}

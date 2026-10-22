'use client';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api, fmt, fmt0, fmtPct, toast } from '@/lib/ui';
import { calcDetalle, calcValorHora, type Params } from '@/lib/jornal';

type Cat = { id: number; nombre: string; basico: number };
type Emp = {
  leg: number; nombre: string; cuil: string; depto: string; supervisor: string;
  categoriaId: number | null; categoria: string; basico: number; stAdic: number; antig: number;
  activo: number; bajaFecha: string | null;
};

export default function NominaPage() {
  const [emps, setEmps] = useState<Emp[]>([]);
  const [cats, setCats] = useState<Cat[]>([]);
  const [params, setParams] = useState<Params>({ stAcc: 0.195, incentivo: 0.15, presentismo: 0.05, aCuenta: 0.05 });
  const [loading, setLoading] = useState(true);
  const [incPres, setIncPres] = useState(true);
  const [q, setQ] = useState(''); const [fsup, setFsup] = useState(''); const [fdep, setFdep] = useState('');
  const [fcat, setFcat] = useState(''); const [festado, setFestado] = useState('activos');
  const [expand, setExpand] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<null | { tipo: 'nuevo' | 'recat' | 'inc'; emp?: Emp }>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setIncPres(localStorage.getItem('rj_incpres') !== '0'); load(); }, []);
  async function load() {
    setLoading(true);
    try { const d = await api('/api/empleados'); setEmps(d.empleados); setCats(d.categorias); setParams(d.params); }
    catch (e) { toast((e as Error).message, 'err'); }
    setLoading(false);
  }
  function setMode(v: boolean) { setIncPres(v); localStorage.setItem('rj_incpres', v ? '1' : '0'); }

  const supervisores = useMemo(() => [...new Set(emps.map((e) => e.supervisor).filter(Boolean))].sort(), [emps]);
  const deptos = useMemo(() => [...new Set(emps.map((e) => e.depto).filter(Boolean))].sort(), [emps]);

  const vh = (e: Emp) => calcValorHora(e.basico, e.stAdic, e.antig, params, incPres);

  const filtered = useMemo(() => emps.filter((e) => {
    if (festado === 'activos' && e.activo !== 1) return false;
    if (festado === 'bajas' && e.activo !== 0) return false;
    if (q && !(e.nombre.toLowerCase().includes(q.toLowerCase()) || String(e.leg).includes(q))) return false;
    if (fsup && e.supervisor !== fsup) return false;
    if (fdep && e.depto !== fdep) return false;
    if (fcat && e.categoria !== fcat) return false;
    return true;
  }), [emps, festado, q, fsup, fdep, fcat]);

  const sumaVH = filtered.reduce((s, e) => s + vh(e), 0);
  const activos = emps.filter((e) => e.activo === 1).length;
  const bajas = emps.filter((e) => e.activo === 0).length;

  function toggle(leg: number) { const n = new Set(expand); n.has(leg) ? n.delete(leg) : n.add(leg); setExpand(n); }

  async function doBaja(e: Emp) {
    if (e.activo === 0) { // reactivar
      await api(`/api/empleados/${e.leg}`, { method: 'PATCH', body: JSON.stringify({ activo: 1 }) });
      toast('Empleado reactivado'); load(); return;
    }
    const motivo = prompt(`Dar de baja a ${e.nombre} (leg ${e.leg}).\nMotivo (opcional):`);
    if (motivo === null) return;
    await api(`/api/empleados/${e.leg}?motivo=${encodeURIComponent(motivo)}`, { method: 'DELETE' });
    toast('Empleado dado de baja', 'warn'); load();
  }

  async function onImport(file: File) {
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch('/api/import', { method: 'POST', body: fd });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      toast(`Importado: ${d.altas} altas, ${d.updates} actualizados`); load();
    } catch (e) { toast((e as Error).message, 'err'); }
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 6 }}>
        <div><h1 className="page">Nómina de Jornales</h1>
          <div className="sub">{activos} activos · {bajas} bajas · valor hora {incPres ? 'con' : 'sin'} incentivo y presentismo</div></div>
        <div className="spacer" />
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hide"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onImport(f); e.target.value = ''; }} />
        <button onClick={() => fileRef.current?.click()}>📥 Importar Excel</button>
        <button className="btn-cel" onClick={() => setModal({ tipo: 'nuevo' })}>+ Nuevo empleado</button>
      </div>

      <div className="kpis">
        <div className="kpi"><div className="lbl">Empleados (filtro)</div><div className="val">{filtered.length}</div><div className="sub2">de {emps.length} totales</div></div>
        <div className="kpi cel"><div className="lbl">Activos</div><div className="val">{activos}</div><div className="sub2">{bajas} con baja</div></div>
        <div className="kpi"><div className="lbl">Valor hora (suma)</div><div className="val">${fmt0(sumaVH)}</div><div className="sub2">{incPres ? 'con inc.+pres.' : 'sin inc.+pres.'}</div></div>
        <div className="kpi"><div className="lbl">Promedio</div><div className="val">${fmt0(filtered.length ? sumaVH / filtered.length : 0)}</div><div className="sub2">valor hora medio</div></div>
      </div>

      <div className="card card-pad toolbar">
        <label className="fld">Buscar<input placeholder="Nombre o legajo" value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <label className="fld">Encargado<select value={fsup} onChange={(e) => setFsup(e.target.value)}><option value="">Todos</option>{supervisores.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="fld">Departamento<select value={fdep} onChange={(e) => setFdep(e.target.value)}><option value="">Todos</option>{deptos.map((s) => <option key={s}>{s}</option>)}</select></label>
        <label className="fld">Categoría<select value={fcat} onChange={(e) => setFcat(e.target.value)}><option value="">Todas</option>{cats.map((c) => <option key={c.id}>{c.nombre}</option>)}</select></label>
        <label className="fld">Estado<select value={festado} onChange={(e) => setFestado(e.target.value)}><option value="activos">Activos</option><option value="bajas">Bajas</option><option value="todos">Todos</option></select></label>
        <label className="fld">Modo valor hora<select value={incPres ? '1' : '0'} onChange={(e) => setMode(e.target.value === '1')}><option value="1">Con incentivo y presentismo</option><option value="0">Sin incentivo ni presentismo</option></select></label>
      </div>

      <div className="tbl-wrap" style={{ maxHeight: 'calc(100vh - 360px)' }}>
        <table>
          <thead><tr>
            <th>Apellido y Nombre</th><th>Encargado</th><th>Categoría</th>
            <th className="num">Básico</th><th className="num">ST ACC</th><th className="num">ST Adic</th><th className="num">Antig.</th>
            <th className="num">Valor Hora</th><th>Acciones</th>
          </tr></thead>
          <tbody>
            {loading ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Cargando…</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--t2)' }}>Sin resultados.</td></tr>
                : filtered.map((e) => {
                  const d = calcDetalle(e.basico, e.stAdic, e.antig, params, incPres);
                  const ab = expand.has(e.leg);
                  return (
                    <Fragment key={e.leg}>
                      <tr style={e.activo === 0 ? { opacity: .55 } : undefined}>
                        <td><span className="vlink" onClick={() => toggle(e.leg)}>{ab ? '▾' : '▸'}</span> {e.nombre} {e.activo === 0 && <span className="badge b-baja">baja</span>}</td>
                        <td><span className="muted">{e.supervisor}</span></td>
                        <td><span className="chip">{e.categoria || '—'}</span></td>
                        <td className="num">{fmt(e.basico)}</td>
                        <td className="num">{fmt(d.stAcc)}</td>
                        <td className="num">{fmt(e.stAdic)}</td>
                        <td className="num">{e.antig}</td>
                        <td className="num"><b>{fmt(d.final)}</b></td>
                        <td>
                          <div className="row" style={{ gap: 5 }}>
                            <button className="btn-sm" title="Recategorizar (cambiar categoría)" onClick={() => setModal({ tipo: 'recat', emp: e })}>↑ Categoría</button>
                            <button className="btn-sm" title="Incremento de adicional (ST Adic)" onClick={() => setModal({ tipo: 'inc', emp: e })}>＋ Adicional</button>
                            <Link className="btn btn-sm" href={`/empleados/${e.leg}`}>Historial</Link>
                            <button className="btn-sm btn-danger" onClick={() => doBaja(e)}>{e.activo === 0 ? 'Reactivar' : 'Baja'}</button>
                          </div>
                        </td>
                      </tr>
                      {ab && (
                        <tr className="det"><td colSpan={9}>
                          <div style={{ padding: '10px 14px' }}>
                            <b style={{ color: 'var(--navy)' }}>Composición del valor hora</b> — {e.nombre} · modo {incPres ? 'con' : 'sin'} incentivo y presentismo
                            <table style={{ marginTop: 8 }}>
                              <tbody>
                                <tr><td>Básico (UOM)</td><td className="num">{fmt(d.basico)}</td></tr>
                                <tr><td>ST ACC ({(params.stAcc * 100).toFixed(1)}%)</td><td className="num">{fmt(d.stAcc)}</td></tr>
                                <tr><td>ST Adic</td><td className="num">{fmt(d.stAdic)}</td></tr>
                                <tr><td>Incentivo ({(params.incentivo * 100).toFixed(0)}%)</td><td className="num">{incPres ? fmt(d.incentivo) : <span className="muted">no incluido</span>}</td></tr>
                                <tr><td>Presentismo ({(params.presentismo * 100).toFixed(0)}%)</td><td className="num">{incPres ? fmt(d.presentismo) : <span className="muted">no incluido</span>}</td></tr>
                                <tr style={{ fontWeight: 700 }}><td>Subtotal</td><td className="num">{fmt(d.total)}</td></tr>
                                <tr><td>A cuenta ({(params.aCuenta * 100).toFixed(0)}%)</td><td className="num">{fmt(d.aCuenta)}</td></tr>
                                <tr><td>Antigüedad ({e.antig}%)</td><td className="num">{fmt(d.antig)}</td></tr>
                                <tr style={{ fontWeight: 700, color: 'var(--navy)' }}><td>VALOR HORA</td><td className="num">{fmt(d.final)}</td></tr>
                              </tbody>
                            </table>
                          </div>
                        </td></tr>
                      )}
                    </Fragment>
                  );
                })}
          </tbody>
        </table>
      </div>

      {modal && <EmpModal modal={modal} cats={cats} supervisores={supervisores} deptos={deptos} onClose={() => setModal(null)} onDone={() => { setModal(null); load(); }} />}
    </div>
  );
}

/* ===== Modal: nuevo / recategorizar / incremento ===== */
function EmpModal({ modal, cats, supervisores, deptos, onClose, onDone }: {
  modal: { tipo: 'nuevo' | 'recat' | 'inc'; emp?: any }; cats: Cat[];
  supervisores: string[]; deptos: string[]; onClose: () => void; onDone: () => void;
}) {
  const e = modal.emp;
  const [form, setForm] = useState<any>(
    modal.tipo === 'nuevo'
      ? { leg: '', nombre: '', cuil: '', depto: '', supervisor: '', categoriaId: '', stAdic: 0, antig: 0, ingreso: '' }
      : modal.tipo === 'recat' ? { categoriaId: e.categoriaId || '', nota: '' }
        : { nuevoAdic: e.stAdic, nota: '' });
  const [busy, setBusy] = useState(false);
  const up = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      if (modal.tipo === 'nuevo') {
        if (!form.leg || !form.nombre) throw new Error('Legajo y nombre requeridos');
        await api('/api/empleados', { method: 'POST', body: JSON.stringify(form) });
        toast('Empleado creado');
      } else if (modal.tipo === 'recat') {
        if (!form.categoriaId) throw new Error('Elegí la categoría destino');
        const r = await api(`/api/empleados/${e.leg}/recategorizar`, { method: 'POST', body: JSON.stringify(form) });
        toast(`Recategorizado (${fmtPct(r.pct)})`);
      } else {
        const r = await api(`/api/empleados/${e.leg}/incremento`, { method: 'POST', body: JSON.stringify(form) });
        toast(`Incremento aplicado (${fmtPct(r.pct)})`);
      }
      onDone();
    } catch (err) { toast((err as Error).message, 'err'); setBusy(false); }
  }

  const titulo = modal.tipo === 'nuevo' ? 'Nuevo empleado' : modal.tipo === 'recat' ? `Recategorizar — ${e.nombre}` : `Incremento de adicional — ${e.nombre}`;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(ev) => ev.stopPropagation()}>
        <h3>{titulo}</h3>
        <div className="body">
          {modal.tipo === 'nuevo' && (
            <div className="grid2">
              <label className="fld">Legajo<input type="number" value={form.leg} onChange={(ev) => up('leg', ev.target.value)} /></label>
              <label className="fld">Apellido y Nombre<input value={form.nombre} onChange={(ev) => up('nombre', ev.target.value)} /></label>
              <label className="fld">CUIL<input value={form.cuil} onChange={(ev) => up('cuil', ev.target.value)} /></label>
              <label className="fld">Departamento<input list="deptos" value={form.depto} onChange={(ev) => up('depto', ev.target.value)} /><datalist id="deptos">{deptos.map((d) => <option key={d} value={d} />)}</datalist></label>
              <label className="fld">Encargado / Supervisor<input list="sups" value={form.supervisor} onChange={(ev) => up('supervisor', ev.target.value)} /><datalist id="sups">{supervisores.map((s) => <option key={s} value={s} />)}</datalist></label>
              <label className="fld">Categoría<select value={form.categoriaId} onChange={(ev) => up('categoriaId', ev.target.value)}><option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nombre} (${fmt0(c.basico)})</option>)}</select></label>
              <label className="fld">ST Adic<input type="number" step="any" value={form.stAdic} onChange={(ev) => up('stAdic', ev.target.value)} /></label>
              <label className="fld">Antigüedad (años)<input type="number" step="any" value={form.antig} onChange={(ev) => up('antig', ev.target.value)} /></label>
              <label className="fld">Fecha de ingreso<input type="date" value={form.ingreso} onChange={(ev) => up('ingreso', ev.target.value)} /></label>
            </div>
          )}
          {modal.tipo === 'recat' && (
            <>
              <p style={{ marginBottom: 12, color: 'var(--t2)' }}>Categoría actual: <b>{e.categoria}</b> (${fmt0(e.basico)}). Se registra en el historial con el % congelado del momento.</p>
              <label className="fld">Nueva categoría
                <select value={form.categoriaId} onChange={(ev) => up('categoriaId', ev.target.value)}>
                  <option value="">—</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nombre} (${fmt0(c.basico)})</option>)}
                </select></label>
              <div style={{ height: 10 }} />
              <label className="fld">Nota (opcional)<input value={form.nota} onChange={(ev) => up('nota', ev.target.value)} /></label>
            </>
          )}
          {modal.tipo === 'inc' && (
            <>
              <p style={{ marginBottom: 12, color: 'var(--t2)' }}>ST Adic actual: <b>${fmt(e.stAdic)}</b>. El incremento queda registrado con importe anterior/nuevo y % congelado.</p>
              <label className="fld">Nuevo importe ST Adic<input type="number" step="any" value={form.nuevoAdic} onChange={(ev) => up('nuevoAdic', ev.target.value)} /></label>
              <div style={{ height: 10 }} />
              <label className="fld">Nota (opcional)<input value={form.nota} onChange={(ev) => up('nota', ev.target.value)} /></label>
            </>
          )}
        </div>
        <div className="foot">
          <button onClick={onClose}>Cancelar</button>
          <button className="btn-primary" onClick={save} disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  );
}

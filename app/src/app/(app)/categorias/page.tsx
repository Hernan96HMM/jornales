'use client';
import { useEffect, useState } from 'react';
import { api, fmt, fmt0, fmtPct, fechaCorta, toast } from '@/lib/ui';

type Cat = { id: number; nombre: string; basico: number; activo: number };
type CatHist = { id: number; nombre: string; fecha: string; basicoAnterior: number; basicoNuevo: number; pct: number; usuarioNombre: string | null; nota: string | null };
type Param = { clave: string; valor: number; etiqueta: string };

export default function CategoriasPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [hist, setHist] = useState<CatHist[]>([]);
  const [params, setParams] = useState<Param[]>([]);
  const [edit, setEdit] = useState<Record<number, string>>({});
  const [nota, setNota] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', basico: '' });
  const [pedit, setPedit] = useState<Record<string, string>>({});

  useEffect(() => { load(); }, []);
  async function load() {
    const d = await api('/api/categorias'); setCats(d.categorias); setHist(d.historial);
    const p = await api('/api/parametros'); setParams(p.parametros);
    setEdit({}); const pe: Record<string, string> = {}; p.parametros.forEach((x: Param) => pe[x.clave] = String(x.valor)); setPedit(pe);
  }

  async function guardarBasico(c: Cat) {
    const v = edit[c.id]; if (v === undefined || v === '' || Number(v) === c.basico) { toast('Sin cambios', 'warn'); return; }
    try {
      const r = await api(`/api/categorias/${c.id}`, { method: 'PATCH', body: JSON.stringify({ basico: Number(v), nota }) });
      toast(`Básico actualizado (${fmtPct(r.cambioBasico?.pct)})`); setNota(''); load();
    } catch (e) { toast((e as Error).message, 'err'); }
  }
  async function crear() {
    if (!nuevo.nombre || !nuevo.basico) { toast('Nombre y básico requeridos', 'err'); return; }
    try { await api('/api/categorias', { method: 'POST', body: JSON.stringify({ nombre: nuevo.nombre, basico: Number(nuevo.basico) }) }); toast('Categoría creada'); setNuevo({ nombre: '', basico: '' }); load(); }
    catch (e) { toast((e as Error).message, 'err'); }
  }
  async function guardarParams() {
    const cambios: Record<string, number> = {};
    params.forEach((p) => { if (pedit[p.clave] !== undefined && Number(pedit[p.clave]) !== p.valor) cambios[p.clave] = Number(pedit[p.clave]); });
    if (!Object.keys(cambios).length) { toast('Sin cambios', 'warn'); return; }
    try { await api('/api/parametros', { method: 'PATCH', body: JSON.stringify({ parametros: cambios }) }); toast('Parámetros actualizados'); load(); }
    catch (e) { toast((e as Error).message, 'err'); }
  }

  return (
    <div>
      <h1 className="page">Categorías y parámetros</h1>
      <div className="sub">Escala categoría → básico. Cuando el gremio actualiza los valores, se cargan acá y queda registrado. <b>Afecta el valor hora de todos, pero NO altera los incrementos individuales ya registrados en el historial.</b></div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <div className="row" style={{ marginBottom: 10 }}>
          <b style={{ color: 'var(--navy)' }}>Escala vigente</b>
          <div className="spacer" />
          <label className="fld" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, textTransform: 'none' }}>
            <span style={{ fontSize: 12, color: 'var(--t2)' }}>Nota para el próximo cambio:</span>
            <input placeholder="Ej: Acuerdo paritario oct-2026" value={nota} onChange={(e) => setNota(e.target.value)} style={{ minWidth: 240 }} />
          </label>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Categoría</th><th className="num">Básico vigente</th><th>Nuevo básico</th><th></th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td>{c.nombre}</td>
                  <td className="num">${fmt(c.basico)}</td>
                  <td><input type="number" step="any" style={{ width: 130, textAlign: 'right' }} placeholder={fmt0(c.basico)}
                    value={edit[c.id] ?? ''} onChange={(e) => setEdit({ ...edit, [c.id]: e.target.value })} /></td>
                  <td><button className="btn-sm btn-primary" onClick={() => guardarBasico(c)}>Actualizar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <input placeholder="Nueva categoría" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <input type="number" step="any" placeholder="Básico" style={{ width: 130 }} value={nuevo.basico} onChange={(e) => setNuevo({ ...nuevo, basico: e.target.value })} />
          <button className="btn-cel" onClick={crear}>+ Agregar categoría</button>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <b style={{ color: 'var(--navy)' }}>Parámetros del jornal (%)</b>
        <div className="sub" style={{ marginTop: 4 }}>Porcentajes de la fórmula del valor hora. (Edición: rol Admin.)</div>
        <div className="row" style={{ marginTop: 6 }}>
          {params.map((p) => (
            <label className="fld" key={p.clave} title={p.etiqueta}>{p.clave}
              <input type="number" step="any" style={{ width: 110 }} value={pedit[p.clave] ?? ''} onChange={(e) => setPedit({ ...pedit, [p.clave]: e.target.value })} />
            </label>
          ))}
          <div style={{ alignSelf: 'flex-end' }}><button className="btn-primary" onClick={guardarParams}>Guardar parámetros</button></div>
        </div>
      </div>

      <div className="card card-pad">
        <b style={{ color: 'var(--navy)' }}>Historial de cambios de la escala (gremio)</b>
        <div className="tbl-wrap" style={{ marginTop: 10 }}>
          <table>
            <thead><tr><th>Fecha</th><th>Categoría</th><th className="num">Básico anterior</th><th className="num">Básico nuevo</th><th className="num">% aumento</th><th>Usuario</th><th>Nota</th></tr></thead>
            <tbody>
              {hist.length === 0 ? <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--t2)' }}>Sin cambios registrados.</td></tr>
                : hist.map((h) => (
                  <tr key={h.id}>
                    <td>{fechaCorta(h.fecha)}</td><td>{h.nombre}</td>
                    <td className="num">${fmt(h.basicoAnterior)}</td><td className="num">${fmt(h.basicoNuevo)}</td>
                    <td className="num"><span className={h.pct >= 0 ? 'pos' : 'neg'}>{fmtPct(h.pct)}</span></td>
                    <td><span className="muted">{h.usuarioNombre || ''}</span></td><td><span className="muted">{h.nota || ''}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

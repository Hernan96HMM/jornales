'use client';
import { useEffect, useState } from 'react';
import { api, fechaCorta, toast } from '@/lib/ui';

type U = { id: number; email: string; nombre: string; rol: string; supervisorRef: string | null; activo: number; creado: string };

// 'supervisor' queda para implementación futura (el backend lo soporta)
const ROLES = [['rrhh', 'RRHH'], ['gerencia', 'Gerencia'], ['admin', 'Admin']];
const rolBadge = (r: string) => r === 'admin' ? 'b-admin' : 'b-rrhh';

export default function UsuariosPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [supervisores, setSupervisores] = useState<string[]>([]);
  const [err, setErr] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', email: '', password: '', rol: 'rrhh', supervisorRef: '' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { const d = await api('/api/usuarios'); setUsers(d.usuarios); setSupervisores(d.supervisores || []); setErr(''); }
    catch (e) { setErr((e as Error).message); }
  }
  async function crear() {
    if (!nuevo.nombre || !nuevo.email || !nuevo.password) { toast('Completá nombre, email y contraseña', 'err'); return; }
    if (nuevo.rol === 'supervisor' && !nuevo.supervisorRef) { toast('Elegí a qué supervisor corresponde', 'err'); return; }
    try { await api('/api/usuarios', { method: 'POST', body: JSON.stringify(nuevo) }); toast('Usuario creado'); setNuevo({ nombre: '', email: '', password: '', rol: 'rrhh', supervisorRef: '' }); load(); }
    catch (e) { toast((e as Error).message, 'err'); }
  }
  async function patch(id: number, body: any, msg: string) {
    try { await api(`/api/usuarios/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); toast(msg); load(); }
    catch (e) { toast((e as Error).message, 'err'); }
  }
  async function resetPass(u: U) {
    const p = prompt(`Nueva contraseña para ${u.nombre}:`); if (!p) return;
    patch(u.id, { password: p }, 'Contraseña actualizada');
  }

  if (err) return <div className="card card-pad" style={{ color: 'var(--red)' }}>{err}</div>;

  return (
    <div>
      <h1 className="page">Usuarios y roles</h1>
      <div className="sub"><b>Admin</b>: todo. <b>RRHH</b>: nómina, categorías, valida (RR.HH.). <b>Gerencia</b> (Rossi): valida (Producción). <b>Supervisor</b>: ve solo su gente y propone cambios.</div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <b style={{ color: 'var(--navy)' }}>Nuevo usuario</b>
        <div className="row" style={{ marginTop: 10 }}>
          <input placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <input placeholder="Email" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
          <input placeholder="Contraseña" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} />
          <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          {nuevo.rol === 'supervisor' && (
            <select value={nuevo.supervisorRef} onChange={(e) => setNuevo({ ...nuevo, supervisorRef: e.target.value })}>
              <option value="">— ¿de qué supervisor? —</option>{supervisores.map((s) => <option key={s}>{s}</option>)}
            </select>
          )}
          <button className="btn-cel" onClick={crear}>+ Crear</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Gente a cargo</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td><td>{u.email}</td>
                <td>
                  <select value={u.rol} onChange={(e) => patch(u.id, { rol: e.target.value }, 'Rol cambiado')} className={`badge ${rolBadge(u.rol)}`} style={{ padding: '3px 8px' }}>
                    {ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </td>
                <td>{u.rol === 'supervisor'
                  ? <select value={u.supervisorRef || ''} onChange={(e) => patch(u.id, { supervisorRef: e.target.value }, 'Vínculo actualizado')}><option value="">—</option>{supervisores.map((s) => <option key={s}>{s}</option>)}</select>
                  : <span className="muted">—</span>}</td>
                <td>{u.activo ? <span className="badge b-alta">activo</span> : <span className="badge b-baja">inactivo</span>}</td>
                <td><span className="muted">{fechaCorta(u.creado)}</span></td>
                <td>
                  <div className="row" style={{ gap: 5 }}>
                    <button className="btn-sm" onClick={() => resetPass(u)}>Resetear clave</button>
                    <button className="btn-sm btn-danger" onClick={() => patch(u.id, { activo: u.activo ? 0 : 1 }, u.activo ? 'Desactivado' : 'Activado')}>{u.activo ? 'Desactivar' : 'Activar'}</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import { api, fechaCorta, toast } from '@/lib/ui';

type U = { id: number; email: string; nombre: string; rol: 'admin' | 'rrhh'; activo: number; creado: string };

export default function UsuariosPage() {
  const [users, setUsers] = useState<U[]>([]);
  const [err, setErr] = useState('');
  const [nuevo, setNuevo] = useState({ nombre: '', email: '', password: '', rol: 'rrhh' });

  useEffect(() => { load(); }, []);
  async function load() {
    try { const d = await api('/api/usuarios'); setUsers(d.usuarios); setErr(''); }
    catch (e) { setErr((e as Error).message); }
  }
  async function crear() {
    if (!nuevo.nombre || !nuevo.email || !nuevo.password) { toast('Completá nombre, email y contraseña', 'err'); return; }
    try { await api('/api/usuarios', { method: 'POST', body: JSON.stringify(nuevo) }); toast('Usuario creado'); setNuevo({ nombre: '', email: '', password: '', rol: 'rrhh' }); load(); }
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
      <div className="sub">Admin: acceso total (usuarios, análisis, categorías, nómina). RRHH: nómina, categorías e historial.</div>

      <div className="card card-pad" style={{ marginBottom: 16 }}>
        <b style={{ color: 'var(--navy)' }}>Nuevo usuario</b>
        <div className="row" style={{ marginTop: 10 }}>
          <input placeholder="Nombre" value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <input placeholder="Email" type="email" value={nuevo.email} onChange={(e) => setNuevo({ ...nuevo, email: e.target.value })} />
          <input placeholder="Contraseña" value={nuevo.password} onChange={(e) => setNuevo({ ...nuevo, password: e.target.value })} />
          <select value={nuevo.rol} onChange={(e) => setNuevo({ ...nuevo, rol: e.target.value })}><option value="rrhh">RRHH</option><option value="admin">Admin</option></select>
          <button className="btn-cel" onClick={crear}>+ Crear</button>
        </div>
      </div>

      <div className="tbl-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th>Creado</th><th>Acciones</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td><td>{u.email}</td>
                <td><span className={`badge ${u.rol === 'admin' ? 'b-admin' : 'b-rrhh'}`}>{u.rol}</span></td>
                <td>{u.activo ? <span className="badge b-alta">activo</span> : <span className="badge b-baja">inactivo</span>}</td>
                <td><span className="muted">{fechaCorta(u.creado)}</span></td>
                <td>
                  <div className="row" style={{ gap: 5 }}>
                    <button className="btn-sm" onClick={() => patch(u.id, { rol: u.rol === 'admin' ? 'rrhh' : 'admin' }, 'Rol cambiado')}>→ {u.rol === 'admin' ? 'RRHH' : 'Admin'}</button>
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

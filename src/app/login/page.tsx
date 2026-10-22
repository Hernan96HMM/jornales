'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (!r.ok) { setErr(data.error || 'Error'); setLoading(false); return; }
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next || '/nomina');
    } catch {
      setErr('No se pudo conectar'); setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo/sica-blanco.png" alt="SICA" />
        </div>
        <div className="login-body">
          <h2>Recategorización de Jornales</h2>
          <p>Área de RRHH · Ingresá con tu usuario.</p>
          <form onSubmit={submit}>
            <label className="fld">Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus required />
            </label>
            <div style={{ height: 12 }} />
            <label className="fld">Contraseña
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <div className="err">{err}</div>
            <button className="btn-primary" style={{ width: '100%', padding: '10px' }} disabled={loading}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

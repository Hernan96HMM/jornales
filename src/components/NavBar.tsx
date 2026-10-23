'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SessionUser } from '@/lib/session';

import type { Rol } from '@/lib/session';

const LINKS: Array<{ href: string; label: string; ico: string; roles?: Rol[] }> = [
  { href: '/nomina', label: 'Nómina', ico: '👥' },
  { href: '/informe-encargado', label: 'Informe x Encargado', ico: '📄', roles: ['admin', 'rrhh', 'gerencia'] },
  { href: '/solicitudes', label: 'Solicitudes', ico: '📝' },
  { href: '/categorias', label: 'Categorías', ico: '🏷️', roles: ['admin', 'rrhh'] },
  { href: '/analisis', label: 'Análisis', ico: '📊', roles: ['admin'] },
  { href: '/usuarios', label: 'Usuarios', ico: '🔑', roles: ['admin'] },
];

export default function NavBar({ user }: { user: SessionUser }) {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo/sica-blanco.png" alt="SICA" />
        <div className="t">Jornales<small>Recategorización · RRHH</small></div>
      </div>
      <nav className="menu">
        {LINKS.filter((l) => !l.roles || l.roles.includes(user.rol)).map((l) => (
          <Link key={l.href} href={l.href} className={path.startsWith(l.href) ? 'active' : ''}>
            <span className="ico">{l.ico}</span><span className="lbl">{l.label}</span>
          </Link>
        ))}
      </nav>
      <div className="foot">
        <div className="u">{user.nombre}</div>
        <div className="r">{user.rol}</div>
        <button className="btn-sm" onClick={logout}>Salir</button>
      </div>
    </aside>
  );
}

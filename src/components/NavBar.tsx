'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { SessionUser } from '@/lib/session';

const LINKS: Array<{ href: string; label: string; ico: string; adminOnly?: boolean }> = [
  { href: '/nomina', label: 'Nómina', ico: '👥' },
  { href: '/categorias', label: 'Categorías', ico: '🏷️' },
  { href: '/analisis', label: 'Análisis', ico: '📊', adminOnly: true },
  { href: '/usuarios', label: 'Usuarios', ico: '🔑', adminOnly: true },
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
        {LINKS.filter((l) => !l.adminOnly || user.rol === 'admin').map((l) => (
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

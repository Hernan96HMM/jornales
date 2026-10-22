'use client';

export function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function fmt0(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('es-AR', { maximumFractionDigits: 0 });
}
export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return (n >= 0 ? '+' : '') + n.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
}
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toast(msg: string, tipo: 'ok' | 'err' | 'warn' = 'ok') {
  if (typeof document === 'undefined') return;
  let c = document.getElementById('toast-c');
  if (!c) { c = document.createElement('div'); c.id = 'toast-c'; c.className = 'toast-c'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast';
  t.style.background = tipo === 'err' ? 'var(--red)' : tipo === 'warn' ? 'var(--amb)' : 'var(--grn)';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

export async function api(url: string, opts?: RequestInit): Promise<any> {
  const r = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers || {}) },
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Error ${r.status}`);
  return data;
}

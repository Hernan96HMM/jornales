import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { listarEmpleados } from '@/lib/service';

export const dynamic = 'force-dynamic';

function mediana(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function prom(xs: number[]): number { return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0; }
function pstdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = prom(xs);
  return Math.sqrt(prom(xs.map((x) => (x - m) ** 2)));
}
function gini(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const n = s.length;
  const tot = s.reduce((a, b) => a + b, 0);
  if (!tot) return 0;
  const w = s.reduce((acc, xi, i) => acc + (i + 1) * xi, 0);
  return (2 * w - (n + 1) * tot) / (n * tot);
}

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  if (user.rol !== 'admin') return NextResponse.json({ error: 'Requiere rol admin' }, { status: 403 });

  const emps = listarEmpleados(false); // solo activos
  const porCat = new Map<string, typeof emps>();
  for (const e of emps) {
    if (!e.categoria) continue;
    if (!porCat.has(e.categoria)) porCat.set(e.categoria, []);
    porCat.get(e.categoria)!.push(e);
  }

  const dispersion = [...porCat.entries()].map(([cat, list]) => {
    const adic = list.map((e) => e.stAdic);
    return {
      categoria: cat, n: list.length, ceros: adic.filter((x) => x === 0).length,
      min: Math.min(...adic), max: Math.max(...adic), prom: prom(adic),
      mediana: mediana(adic), desv: pstdev(adic), brecha: Math.max(...adic) - Math.min(...adic),
      gini: gini(adic), basico: list[0].basico,
    };
  }).sort((a, b) => a.basico - b.basico);

  // outliers
  const statCat = new Map(dispersion.map((d) => [d.categoria, { prom: d.prom, desv: d.desv }]));
  const outliers = emps.filter((e) => {
    const s = statCat.get(e.categoria); if (!s || !s.desv) return false;
    return Math.abs(e.stAdic - s.prom) > 1.5 * s.desv;
  }).map((e) => {
    const s = statCat.get(e.categoria)!;
    return { leg: e.leg, nombre: e.nombre, categoria: e.categoria, stAdic: e.stAdic, prom: s.prom, dif: e.stAdic - s.prom, tipo: e.stAdic > s.prom ? 'ALTO' : 'BAJO' };
  }).sort((a, b) => Math.abs(b.dif) - Math.abs(a.dif));

  // correlación stAdic ~ antig
  const xs = emps.map((e) => e.antig), ys = emps.map((e) => e.stAdic);
  const mx = prom(xs), my = prom(ys);
  const cov = prom(emps.map((e) => (e.antig - mx) * (e.stAdic - my)));
  const corr = pstdev(xs) && pstdev(ys) ? cov / (pstdev(xs) * pstdev(ys)) : 0;

  // nivelación a la mediana
  const medByCat = new Map(dispersion.map((d) => [d.categoria, d.mediana]));
  let costoMediana = 0, benMediana = 0;
  const candidatos: Array<{ leg: number; nombre: string; categoria: string; stAdic: number; objetivo: number; ajuste: number }> = [];
  for (const e of emps) {
    const obj = medByCat.get(e.categoria) ?? 0;
    if (e.stAdic < obj) { costoMediana += obj - e.stAdic; benMediana++; candidatos.push({ leg: e.leg, nombre: e.nombre, categoria: e.categoria, stAdic: e.stAdic, objetivo: obj, ajuste: obj - e.stAdic }); }
  }

  return NextResponse.json({
    totalEmpleados: emps.length,
    giniGlobal: gini(ys),
    cerosTotal: ys.filter((x) => x === 0).length,
    correlacionAntig: corr,
    dispersion, outliers,
    nivelacionMediana: { beneficiados: benMediana, costoHora: costoMediana, promedio: benMediana ? costoMediana / benMediana : 0 },
    candidatos: candidatos.sort((a, b) => b.ajuste - a.ajuste),
  });
}

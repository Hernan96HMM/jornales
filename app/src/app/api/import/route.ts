import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { getDb, schema } from '@/db';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

function norm(s: unknown): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
}
function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  let s = String(v).replace(/\$/g, '').replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });

  const buf = Buffer.from(await (file as File).arrayBuffer());
  let matriz: unknown[][];
  try {
    const wb = XLSX.read(buf, { type: 'buffer' });
    const sheetName = wb.SheetNames.find((n) => norm(n).includes('DETALLE')) || wb.SheetNames[0];
    matriz = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, raw: true, defval: '' }) as unknown[][];
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el Excel' }, { status: 400 });
  }

  // localizar fila de encabezados
  let hr = -1;
  for (let i = 0; i < Math.min(matriz.length, 10); i++) {
    const row = (matriz[i] || []).map(norm);
    if (row.some((c) => c.includes('LEG')) && row.some((c) => c.includes('CATEG'))) { hr = i; break; }
  }
  if (hr < 0) return NextResponse.json({ error: 'No se encontró la fila de encabezados (LEG y CATEGORIA)' }, { status: 400 });
  const H = (matriz[hr] || []).map(norm);
  const find = (...keys: string[]) => H.findIndex((h) => keys.some((k) => h.includes(k)));
  const col = {
    leg: find('LEG'), nombre: find('APELLIDO', 'NOMBRE'), cuil: find('CUIL'), depto: find('DEPART', 'DEPARET'),
    sup: find('SUPERVIS', 'ENCARGAD'), cat: find('CATEG'), basico: find('BASICO'), adic: find('ADIC'),
    antig: find('ANTIG'), ingreso: find('INGRESO'),
  };
  if (col.leg < 0 || col.cat < 0) return NextResponse.json({ error: 'Faltan columnas LEG o CATEGORIA' }, { status: 400 });

  const db = getDb();
  const now = new Date().toISOString();
  const catByName = new Map(db.select().from(schema.categorias).all().map((c) => [c.nombre, c.id]));

  let altas = 0, updates = 0;
  for (let i = hr + 1; i < matriz.length; i++) {
    const r = (matriz[i] || []) as unknown[];
    const legRaw = r[col.leg]; if (legRaw == null || String(legRaw).trim() === '') continue;
    const nombre = String(r[col.nombre] ?? '').trim(); if (!nombre) continue;
    const leg = Number(legRaw); if (!leg) continue;
    const catNombre = String(r[col.cat] ?? '').trim();
    let categoriaId: number | null = null;
    if (catNombre) {
      if (!catByName.has(catNombre)) {
        const basico = col.basico >= 0 ? toNum(r[col.basico]) : 0;
        const ins = db.insert(schema.categorias).values({ nombre: catNombre, basico }).run();
        catByName.set(catNombre, Number(ins.lastInsertRowid));
      }
      categoriaId = catByName.get(catNombre) ?? null;
    }
    const vals = {
      nombre, cuil: col.cuil >= 0 ? String(r[col.cuil] ?? '').trim() : '',
      depto: col.depto >= 0 ? String(r[col.depto] ?? '').trim() : '',
      supervisor: col.sup >= 0 ? String(r[col.sup] ?? '').trim() : '',
      categoriaId, stAdic: col.adic >= 0 ? toNum(r[col.adic]) : 0,
      antig: col.antig >= 0 ? toNum(r[col.antig]) : 0,
      ingreso: col.ingreso >= 0 ? String(r[col.ingreso] ?? '').trim() : '',
      actualizado: now,
    };
    const existe = db.select().from(schema.empleados).where(eq(schema.empleados.leg, leg)).get();
    if (existe) { db.update(schema.empleados).set(vals).where(eq(schema.empleados.leg, leg)).run(); updates++; }
    else { db.insert(schema.empleados).values({ leg, ...vals, activo: 1, creado: now }).run(); altas++; }
  }
  return NextResponse.json({ ok: true, altas, updates });
}

/* Lógica del valor hora del jornal — verificada contra la hoja "Vaor Hora" del Excel.
   La antigüedad se aplica al final, sobre (subtotal + a cuenta). 1%/año. */

export type Params = { stAcc: number; incentivo: number; presentismo: number; aCuenta: number };

export const PARAMS_FALLBACK: Params = { stAcc: 0.195, incentivo: 0.15, presentismo: 0.05, aCuenta: 0.05 };

export type DetalleJornal = {
  basico: number; stAcc: number; stAdic: number; incentivo: number; presentismo: number;
  total: number; aCuenta: number; antig: number; final: number;
};

export function calcDetalle(
  basico: number, stAdic: number, antigAnios: number, p: Params, incluirIncPres = true,
): DetalleJornal {
  const stAcc = basico * p.stAcc;
  const incentivo = incluirIncPres ? (basico + stAcc + stAdic) * p.incentivo : 0;
  const presentismo = incluirIncPres ? basico * p.presentismo : 0;
  const total = basico + stAcc + stAdic + incentivo + presentismo;
  const aCuenta = total * p.aCuenta;
  const antig = (total + aCuenta) * (antigAnios / 100);
  return { basico, stAcc, stAdic, incentivo, presentismo, total, aCuenta, antig, final: total + aCuenta + antig };
}

export function calcValorHora(
  basico: number, stAdic: number, antigAnios: number, p: Params, incluirIncPres = true,
): number {
  return calcDetalle(basico, stAdic, antigAnios, p, incluirIncPres).final;
}

export function pct(anterior: number, nuevo: number): number | null {
  if (!anterior) return null;
  return ((nuevo - anterior) / anterior) * 100;
}

export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const MESES_S = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const TALLE_ORDER = [
  'U', '4A', '6A', '8A', '10A',
  'S', 'M', 'L', 'XL', '2XL', '3XL',
  'S/M', 'L/XL', '1', '2', '3', '4'
];

const TALLE_RANK: Record<string, number> = {};
TALLE_ORDER.forEach((t, i) => {
  TALLE_RANK[t] = i;
});

export function talleRank(t: string): number {
  const k = String(t || '').toUpperCase().replace(/\s+/g, '');
  return TALLE_RANK[k] !== undefined ? TALLE_RANK[k] : 900;
}

export function talleSort(a: string, b: string): number {
  const diff = talleRank(a) - talleRank(b);
  return diff !== 0 ? diff : String(a).localeCompare(String(b), 'es');
}

export function fmt$(n: number): string {
  return '$' + Math.round(n || 0).toLocaleString('es-AR');
}

export function fmt$M(n: number): string {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000_000) {
    return '$' + ((n || 0) / 1_000_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + 'B';
  }
  if (abs >= 1_000_000) {
    return '$' + ((n || 0) / 1_000_000).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + 'M';
  }
  if (abs >= 1_000) {
    return '$' + ((n || 0) / 1_000).toLocaleString('es-AR', { maximumFractionDigits: 0 }) + 'k';
  }
  return fmt$(n);
}

export function fmtDoc(n: number): string {
  return (n || 0).toLocaleString('es-AR', { maximumFractionDigits: 1 });
}

export function fmtPct(n: number): string {
  return ((n || 0) * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%';
}

export function fmtPp(n: number): string {
  const val = (n || 0) * 100;
  return (val >= 0 ? '+' : '') + val.toLocaleString('es-AR', { maximumFractionDigits: 1 }) + ' pp';
}

export function getDelta(cur: number, prev: number | null | undefined): {
  pct: number | null;
  direction: 'up' | 'down' | 'flat' | 'none';
  text: string;
} {
  if (prev === null || prev === undefined || prev === 0) {
    return { pct: null, direction: 'none', text: 's/d a.a.' };
  }
  const delta = (cur - prev) / prev;
  if (Math.abs(delta) <= 0.001) {
    return { pct: 0, direction: 'flat', text: '0.0%' };
  }
  const isUp = delta > 0;
  return {
    pct: delta,
    direction: isUp ? 'up' : 'down',
    text: (isUp ? '+' : '') + (delta * 100).toLocaleString('es-AR', { maximumFractionDigits: 1 }) + '%'
  };
}

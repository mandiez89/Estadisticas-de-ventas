export interface SaleRow {
  y: number;
  m: number; // 0-11
  q: number; // 0-3
  ts: number;
  cliente: string;
  art: string;
  color: string;
  talle: string;
  un: number;
  doc: number;
  loc: string;
  prov: string;
  vend: string;
  fam: string;
  grupo: string;
  linea: string;
  tipo: string;
  neto: number;
  sub: number;
}

export type ViewPeriodMode = 'mes' | 'tri' | 'anual';

export type PrimaryMetric = 'sub' | 'doc';

export interface FilterState {
  mode: ViewPeriodMode;
  year: number;
  month: number; // 0-11
  quarter: number; // 0-3
  vend: string;
  linea: string;
  fam: string;
  color: string;
  prov: string;
  searchArt: string;
  searchCli: string;
  primaryMetric: PrimaryMetric; // 'sub' (Facturación $) or 'doc' (Volumen Docenas)
}

export interface DrilldownTarget {
  type: 'art' | 'vend' | 'cliente';
  id: string;
}

export interface RFMSegment {
  cliente: string;
  vend: string;
  prov: string;
  lastPurchaseTs: number;
  daysSinceLast: number;
  orderCount: number;
  totalSub: number;
  totalDoc: number;
  rScore: number; // 1-5
  fScore: number; // 1-5
  mScore: number; // 1-5
  segment: 'Campeones' | 'Clientes Leales' | 'Potenciales Fieles' | 'Prometedores / Nuevos' | 'En Riesgo' | 'Dormidos';
  color: string;
}

import { SaleRow, FilterState, RFMSegment, AtRiskClient } from '../types';

export interface KPIResults {
  curSub: number;
  prevSub: number;
  curDoc: number;
  prevDoc: number;
  curNeto: number;
  prevNeto: number;
  curPricePerDoc: number;
  prevPricePerDoc: number;
  curDiscountPct: number;
  prevDiscountPct: number;
  curClientsCount: number;
  prevClientsCount: number;
  curSubPerClient: number;
  prevSubPerClient: number;
  curTop5Concentration: number;
  prevTop5Concentration: number;
  curTransactionsCount: number;
  sparklineSub: number[];
  sparklineDoc: number[];
  sparklinePrice: number[];
}

export function filterRows(rows: SaleRow[], filters: FilterState, excludedArticles: Set<string>): SaleRow[] {
  return rows.filter((r) => {
    if (excludedArticles.has(r.art)) return false;
    if (filters.vend && r.vend !== filters.vend) return false;
    if (filters.linea && r.linea !== filters.linea) return false;
    if (filters.fam && r.fam !== filters.fam) return false;
    if (filters.color && r.color !== filters.color) return false;
    if (filters.prov && r.prov !== filters.prov) return false;
    return true;
  });
}

export function isRowInPeriod(r: SaleRow, year: number, mode: 'mes' | 'tri' | 'anual', month: number, quarter: number): boolean {
  if (r.y !== year) return false;
  if (mode === 'mes') return r.m === month;
  if (mode === 'tri') return r.q === quarter;
  if (mode === 'anual') return r.m <= month;
  return false;
}

export function getPeriodLabel(year: number, mode: 'mes' | 'tri' | 'anual', month: number, quarter: number): string {
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mesesFull = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  if (mode === 'mes') return `${mesesFull[month]} ${year}`;
  if (mode === 'tri') return `Q${quarter + 1} ${year}`;
  return `Ene–${meses[month]} ${year}`;
}

export function computeKPIs(
  curRows: SaleRow[],
  prevRows: SaleRow[],
  baseRows: SaleRow[],
  currentYear: number,
  currentMonth: number
): KPIResults {
  const sumSub = (arr: SaleRow[]) => arr.reduce((acc, r) => acc + r.sub, 0);
  const sumDoc = (arr: SaleRow[]) => arr.reduce((acc, r) => acc + r.doc, 0);
  const sumNeto = (arr: SaleRow[]) => arr.reduce((acc, r) => acc + r.neto, 0);

  const curSub = sumSub(curRows);
  const prevSub = sumSub(prevRows);
  const curDoc = sumDoc(curRows);
  const prevDoc = sumDoc(prevRows);
  const curNeto = sumNeto(curRows);
  const prevNeto = sumNeto(prevRows);

  const curClients = new Set(curRows.map((r) => r.cliente));
  const prevClients = new Set(prevRows.map((r) => r.cliente));

  const curPricePerDoc = curDoc > 0 ? curSub / curDoc : 0;
  const prevPricePerDoc = prevDoc > 0 ? prevSub / prevDoc : 0;

  const curDiscountPct = curNeto > 0 ? Math.max(0, 1 - curSub / curNeto) : 0;
  const prevDiscountPct = prevNeto > 0 ? Math.max(0, 1 - prevSub / prevNeto) : 0;

  const curClientsCount = curClients.size;
  const prevClientsCount = prevClients.size;

  const curSubPerClient = curClientsCount > 0 ? curSub / curClientsCount : 0;
  const prevSubPerClient = prevClientsCount > 0 ? prevSub / prevClientsCount : 0;

  // Top 5 concentration
  const clientSubMap: Record<string, number> = {};
  curRows.forEach((r) => {
    clientSubMap[r.cliente] = (clientSubMap[r.cliente] || 0) + r.sub;
  });
  const sortedSubs = Object.values(clientSubMap).sort((a, b) => b - a);
  const top5Sub = sortedSubs.slice(0, 5).reduce((acc, v) => acc + v, 0);
  const curTop5Concentration = curSub > 0 ? top5Sub / curSub : 0;

  const prevClientSubMap: Record<string, number> = {};
  prevRows.forEach((r) => {
    prevClientSubMap[r.cliente] = (prevClientSubMap[r.cliente] || 0) + r.sub;
  });
  const prevSortedSubs = Object.values(prevClientSubMap).sort((a, b) => b - a);
  const prevTop5Sub = prevSortedSubs.slice(0, 5).reduce((acc, v) => acc + v, 0);
  const prevTop5Concentration = prevSub > 0 ? prevTop5Sub / prevSub : 0;

  // Last 12 months sparklines
  const endIdx = currentYear * 12 + currentMonth;
  const monthlySub: Record<number, number> = {};
  const monthlyDoc: Record<number, number> = {};

  baseRows.forEach((r) => {
    const idx = r.y * 12 + r.m;
    if (idx <= endIdx && idx > endIdx - 12) {
      monthlySub[idx] = (monthlySub[idx] || 0) + r.sub;
      monthlyDoc[idx] = (monthlyDoc[idx] || 0) + r.doc;
    }
  });

  const sparklineSub: number[] = [];
  const sparklineDoc: number[] = [];
  const sparklinePrice: number[] = [];

  for (let idx = endIdx - 11; idx <= endIdx; idx++) {
    const s = monthlySub[idx] || 0;
    const d = monthlyDoc[idx] || 0;
    sparklineSub.push(s);
    sparklineDoc.push(d);
    sparklinePrice.push(d > 0 ? s / d : 0);
  }

  return {
    curSub,
    prevSub,
    curDoc,
    prevDoc,
    curNeto,
    prevNeto,
    curPricePerDoc,
    prevPricePerDoc,
    curDiscountPct,
    prevDiscountPct,
    curClientsCount,
    prevClientsCount,
    curSubPerClient,
    prevSubPerClient,
    curTop5Concentration,
    prevTop5Concentration,
    curTransactionsCount: curRows.length,
    sparklineSub,
    sparklineDoc,
    sparklinePrice
  };
}

export interface CommercialAlerts {
  lostClients: { name: string; prevSub: number; prevDoc: number; vend: string }[];
  droppingClients: { name: string; curSub: number; prevSub: number; dropPct: number; vend: string }[];
  newClients: { name: string; curSub: number; curDoc: number; vend: string }[];
  stalledArticles: { name: string; curDoc: number; prevDoc: number; dropPct: number; fam: string }[];
  dormantClients: { name: string; lastPurchaseTs: number; daysDormant: number; totalHistoricalSub: number; vend: string }[];
  atRiskClients: AtRiskClient[];
}

export function computeAlerts(
  curRows: SaleRow[],
  prevRows: SaleRow[],
  allBaseRows: SaleRow[],
  dropThresholdPct: number = 30,
  dormantDaysThreshold: number = 365
): CommercialAlerts {
  const curClients: Record<string, { sub: number; doc: number; vend: string }> = {};
  curRows.forEach((r) => {
    if (!curClients[r.cliente]) curClients[r.cliente] = { sub: 0, doc: 0, vend: r.vend };
    curClients[r.cliente].sub += r.sub;
    curClients[r.cliente].doc += r.doc;
  });

  const prevClients: Record<string, { sub: number; doc: number; vend: string }> = {};
  prevRows.forEach((r) => {
    if (!prevClients[r.cliente]) prevClients[r.cliente] = { sub: 0, doc: 0, vend: r.vend };
    prevClients[r.cliente].sub += r.sub;
    prevClients[r.cliente].doc += r.doc;
  });

  // Set of inactive clients across allBaseRows/prevRows
  const inactiveClients = new Set<string>();
  allBaseRows.forEach((r) => {
    if (r.inactivo) inactiveClients.add(r.cliente);
  });
  prevRows.forEach((r) => {
    if (r.inactivo) inactiveClients.add(r.cliente);
  });

  // Lost clients: purchased in prev period, 0 in cur, and NOT inactive
  const lostClients = Object.keys(prevClients)
    .filter((c) => !curClients[c] && !inactiveClients.has(c))
    .map((c) => ({
      name: c,
      prevSub: prevClients[c].sub,
      prevDoc: prevClients[c].doc,
      vend: prevClients[c].vend
    }))
    .sort((a, b) => b.prevSub - a.prevSub);

  // Dropping clients (> threshold drop)
  const droppingClients = Object.keys(curClients)
    .filter((c) => prevClients[c] && prevClients[c].sub > 0)
    .map((c) => {
      const cur = curClients[c].sub;
      const prev = prevClients[c].sub;
      const dropPct = (cur - prev) / prev;
      return {
        name: c,
        curSub: cur,
        prevSub: prev,
        dropPct,
        vend: curClients[c].vend
      };
    })
    .filter((c) => c.dropPct < -(dropThresholdPct / 100))
    .sort((a, b) => a.dropPct - b.dropPct);

  // New clients: purchased in cur, none in prev period
  const newClients = Object.keys(curClients)
    .filter((c) => !prevClients[c])
    .map((c) => ({
      name: c,
      curSub: curClients[c].sub,
      curDoc: curClients[c].doc,
      vend: curClients[c].vend
    }))
    .sort((a, b) => b.curSub - a.curSub);

  // Stalled articles
  const curArts: Record<string, { doc: number; fam: string }> = {};
  curRows.forEach((r) => {
    if (!curArts[r.art]) curArts[r.art] = { doc: 0, fam: r.fam };
    curArts[r.art].doc += r.doc;
  });

  const prevArts: Record<string, { doc: number; fam: string }> = {};
  prevRows.forEach((r) => {
    if (!prevArts[r.art]) prevArts[r.art] = { doc: 0, fam: r.fam };
    prevArts[r.art].doc += r.doc;
  });

  const stalledArticles = Object.keys(prevArts)
    .filter((a) => prevArts[a].doc > 0)
    .map((a) => {
      const cur = curArts[a]?.doc || 0;
      const prev = prevArts[a].doc;
      const dropPct = (cur - prev) / prev;
      return {
        name: a,
        curDoc: cur,
        prevDoc: prev,
        dropPct,
        fam: prevArts[a].fam
      };
    })
    .filter((a) => a.dropPct < -(dropThresholdPct / 100))
    .sort((a, b) => a.dropPct - b.dropPct);

  // Dormant clients
  let maxTs = 0;
  allBaseRows.forEach((r) => {
    if (r.ts > maxTs) maxTs = r.ts;
  });

  const clientHistory: Record<string, { lastTs: number; totalSub: number; vend: string }> = {};
  allBaseRows.forEach((r) => {
    if (!clientHistory[r.cliente] || r.ts > clientHistory[r.cliente].lastTs) {
      clientHistory[r.cliente] = {
        lastTs: r.ts,
        totalSub: (clientHistory[r.cliente]?.totalSub || 0) + r.sub,
        vend: r.vend
      };
    } else {
      clientHistory[r.cliente].totalSub += r.sub;
    }
  });

  const dormantClients = Object.keys(clientHistory)
    .map((c) => {
      const days = Math.floor((maxTs - clientHistory[c].lastTs) / 86400000);
      return {
        name: c,
        lastPurchaseTs: clientHistory[c].lastTs,
        daysDormant: days,
        totalHistoricalSub: clientHistory[c].totalSub,
        vend: clientHistory[c].vend
      };
    })
    .filter((c) => c.daysDormant >= dormantDaysThreshold)
    .sort((a, b) => b.totalHistoricalSub - a.totalHistoricalSub);

  // Early Warning: At-Risk Clients (Frequency / Cadence deviation)
  // For clients who bought historically, calculate their normal repurchase cadence
  const clientTimestamps: Record<string, { timestamps: Set<number>; totalSub: number; vend: string; prov: string }> = {};
  allBaseRows.forEach((r) => {
    if (!clientTimestamps[r.cliente]) {
      clientTimestamps[r.cliente] = {
        timestamps: new Set(),
        totalSub: 0,
        vend: r.vend || '—',
        prov: r.prov || '—'
      };
    }
    // Round to day
    const dayTs = Math.floor(r.ts / 86400000) * 86400000;
    clientTimestamps[r.cliente].timestamps.add(dayTs);
    clientTimestamps[r.cliente].totalSub += r.sub;
    if (r.vend) clientTimestamps[r.cliente].vend = r.vend;
    if (r.prov) clientTimestamps[r.cliente].prov = r.prov;
  });

  const atRiskClients: AtRiskClient[] = [];
  Object.entries(clientTimestamps).forEach(([clientName, info]) => {
    // Skip if inactive or already bought in current period
    if (inactiveClients.has(clientName) || curClients[clientName]) return;

    const dates = Array.from(info.timestamps).sort((a, b) => a - b);
    if (dates.length >= 2) {
      let totalIntervalDays = 0;
      for (let i = 1; i < dates.length; i++) {
        totalIntervalDays += (dates[i] - dates[i - 1]) / 86400000;
      }
      const rawCadence = totalIntervalDays / (dates.length - 1);
      const avgCadenceDays = Math.max(14, Math.round(rawCadence)); // minimum 14 days baseline

      const lastTs = dates[dates.length - 1];
      const daysSinceLast = Math.floor((maxTs - lastTs) / 86400000);

      // Warning triggered if they exceeded their normal cadence by 35% and under 365 days
      if (daysSinceLast > avgCadenceDays * 1.35 && daysSinceLast < 365) {
        const overdueDays = daysSinceLast - avgCadenceDays;
        const riskLevel: 'Alto' | 'Medio' = (daysSinceLast > avgCadenceDays * 2 || overdueDays >= 35) ? 'Alto' : 'Medio';

        atRiskClients.push({
          name: clientName,
          avgCadenceDays,
          daysSinceLast,
          overdueDays,
          lastPurchaseTs: lastTs,
          historicalSub: info.totalSub,
          vend: info.vend,
          prov: info.prov,
          riskLevel
        });
      }
    }
  });

  atRiskClients.sort((a, b) => b.historicalSub - a.historicalSub);

  return {
    lostClients,
    droppingClients,
    newClients,
    stalledArticles,
    dormantClients,
    atRiskClients
  };
}

export function computeRFMSegments(allRows: SaleRow[]): RFMSegment[] {
  let maxTs = 0;
  allRows.forEach((r) => {
    if (r.ts > maxTs) maxTs = r.ts;
  });

  const clientMap: Record<
    string,
    {
      lastTs: number;
      orders: Set<number>;
      totalSub: number;
      totalDoc: number;
      vendMap: Record<string, number>;
      provMap: Record<string, number>;
    }
  > = {};

  allRows.forEach((r) => {
    if (!clientMap[r.cliente]) {
      clientMap[r.cliente] = {
        lastTs: 0,
        orders: new Set(),
        totalSub: 0,
        totalDoc: 0,
        vendMap: {},
        provMap: {}
      };
    }
    const c = clientMap[r.cliente];
    if (r.ts > c.lastTs) c.lastTs = r.ts;
    // rough grouping of order days
    c.orders.add(Math.floor(r.ts / 86400000));
    c.totalSub += r.sub;
    c.totalDoc += r.doc;
    c.vendMap[r.vend] = (c.vendMap[r.vend] || 0) + r.sub;
    c.provMap[r.prov] = (c.provMap[r.prov] || 0) + r.sub;
  });

  const clients = Object.keys(clientMap).map((name) => {
    const c = clientMap[name];
    const daysSinceLast = Math.max(0, Math.floor((maxTs - c.lastTs) / 86400000));
    const topVend = Object.entries(c.vendMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const topProv = Object.entries(c.provMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return {
      cliente: name,
      vend: topVend,
      prov: topProv,
      lastPurchaseTs: c.lastTs,
      daysSinceLast,
      orderCount: c.orders.size,
      totalSub: c.totalSub,
      totalDoc: c.totalDoc
    };
  });

  if (!clients.length) return [];

  // Quintiles or score 1-5
  const sortedByR = [...clients].sort((a, b) => a.daysSinceLast - b.daysSinceLast); // lower days = higher score
  const sortedByF = [...clients].sort((a, b) => a.orderCount - b.orderCount); // higher orders = higher score
  const sortedByM = [...clients].sort((a, b) => a.totalSub - b.totalSub); // higher monetary = higher score

  const n = clients.length;
  const rRank = new Map<string, number>();
  const fRank = new Map<string, number>();
  const mRank = new Map<string, number>();

  sortedByR.forEach((c, idx) => {
    // 5 is best (most recent)
    const score = Math.min(5, Math.floor(((n - 1 - idx) / Math.max(1, n)) * 5) + 1);
    rRank.set(c.cliente, score);
  });

  sortedByF.forEach((c, idx) => {
    const score = Math.min(5, Math.floor((idx / Math.max(1, n)) * 5) + 1);
    fRank.set(c.cliente, score);
  });

  sortedByM.forEach((c, idx) => {
    const score = Math.min(5, Math.floor((idx / Math.max(1, n)) * 5) + 1);
    mRank.set(c.cliente, score);
  });

  return clients.map((c) => {
    const rScore = rRank.get(c.cliente) || 3;
    const fScore = fRank.get(c.cliente) || 3;
    const mScore = mRank.get(c.cliente) || 3;

    let segment: RFMSegment['segment'] = 'Potenciales Fieles';
    let color = '#2563eb';

    if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
      segment = 'Campeones';
      color = '#059669'; // Emerald
    } else if (rScore >= 3 && fScore >= 3) {
      segment = 'Clientes Leales';
      color = '#0284c7'; // Sky blue
    } else if (rScore >= 4 && fScore <= 2) {
      segment = 'Prometedores / Nuevos';
      color = '#7c3aed'; // Purple
    } else if (rScore <= 2 && (fScore >= 3 || mScore >= 3)) {
      segment = 'En Riesgo';
      color = '#d97706'; // Amber
    } else if (rScore <= 2 && fScore <= 2) {
      segment = 'Dormidos';
      color = '#dc2626'; // Red
    }

    return {
      cliente: c.cliente,
      vend: c.vend,
      prov: c.prov,
      lastPurchaseTs: c.lastPurchaseTs,
      daysSinceLast: c.daysSinceLast,
      orderCount: c.orderCount,
      totalSub: c.totalSub,
      totalDoc: c.totalDoc,
      rScore,
      fScore,
      mScore,
      segment,
      color
    };
  });
}

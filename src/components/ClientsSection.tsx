import React, { useState } from 'react';
import { SaleRow, DrilldownTarget, RFMSegment } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct, getDelta } from '../utils/formatters';
import { computeRFMSegments } from '../utils/analytics';
import { Search, UserCheck, AlertCircle, ShoppingBag, ArrowRight, PhoneCall, AlertTriangle, Clock } from 'lucide-react';

interface ClientsSectionProps {
  curRows: SaleRow[];
  prevRows: SaleRow[];
  baseRows: SaleRow[];
  periodLabel: string;
  prevPeriodLabel: string;
  onOpenDrilldown: (target: DrilldownTarget) => void;
}

export const ClientsSection: React.FC<ClientsSectionProps> = ({
  curRows,
  prevRows,
  baseRows,
  periodLabel,
  prevPeriodLabel,
  onOpenDrilldown
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>('sub');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null);

  // Inactive clients set from raw data
  const inactiveClients = new Set<string>();
  baseRows.forEach((r) => {
    if (r.inactivo) inactiveClients.add(r.cliente);
  });
  prevRows.forEach((r) => {
    if (r.inactivo) inactiveClients.add(r.cliente);
  });

  // Compute RFM segments
  const rfmList = computeRFMSegments(baseRows);
  const rfmMap = new Map<string, RFMSegment>();
  rfmList.forEach((item) => rfmMap.set(item.cliente, item));

  // Client stats in the period using fast single-pass maps
  const curTotalSub = curRows.reduce((acc, r) => acc + r.sub, 0) || 1;

  const curClientMap = new Map<string, { sub: number; doc: number; arts: Set<string>; vend: string; prov: string }>();
  for (let i = 0; i < curRows.length; i++) {
    const r = curRows[i];
    let c = curClientMap.get(r.cliente);
    if (!c) {
      c = { sub: 0, doc: 0, arts: new Set(), vend: r.vend || '—', prov: r.prov || '—' };
      curClientMap.set(r.cliente, c);
    }
    c.sub += r.sub;
    c.doc += r.doc;
    c.arts.add(r.art);
  }

  const prevClientMap = new Map<string, { sub: number; doc: number }>();
  for (let i = 0; i < prevRows.length; i++) {
    const r = prevRows[i];
    let c = prevClientMap.get(r.cliente);
    if (!c) {
      c = { sub: 0, doc: 0 };
      prevClientMap.set(r.cliente, c);
    }
    c.sub += r.sub;
    c.doc += r.doc;
  }

  // Calculate cadence and at-risk clients
  let maxTs = 0;
  baseRows.forEach((r) => {
    if (r.ts > maxTs) maxTs = r.ts;
  });

  const clientDatesMap = new Map<string, { dates: Set<number>; totalSub: number; vend: string; prov: string }>();
  baseRows.forEach((r) => {
    let cd = clientDatesMap.get(r.cliente);
    if (!cd) {
      cd = { dates: new Set(), totalSub: 0, vend: r.vend || '—', prov: r.prov || '—' };
      clientDatesMap.set(r.cliente, cd);
    }
    const dayTs = Math.floor(r.ts / 86400000) * 86400000;
    cd.dates.add(dayTs);
    cd.totalSub += r.sub;
    if (r.vend) cd.vend = r.vend;
    if (r.prov) cd.prov = r.prov;
  });

  interface AtRiskClientRow {
    name: string;
    vend: string;
    prov: string;
    avgCadence: number;
    daysSinceLast: number;
    overdueDays: number;
    totalSub: number;
  }

  const atRiskClients: AtRiskClientRow[] = [];
  clientDatesMap.forEach((cd, cName) => {
    if (inactiveClients.has(cName) || curClientMap.has(cName)) return;
    const sorted = Array.from(cd.dates).sort((a, b) => a - b);
    if (sorted.length >= 2) {
      let intervalSum = 0;
      for (let i = 1; i < sorted.length; i++) {
        intervalSum += (sorted[i] - sorted[i - 1]) / 86400000;
      }
      const avgCadence = Math.max(14, Math.round(intervalSum / (sorted.length - 1)));
      const lastTs = sorted[sorted.length - 1];
      const daysSinceLast = Math.floor((maxTs - lastTs) / 86400000);
      if (daysSinceLast > avgCadence * 1.35 && daysSinceLast < 365) {
        atRiskClients.push({
          name: cName,
          vend: cd.vend,
          prov: cd.prov,
          avgCadence,
          daysSinceLast,
          overdueDays: daysSinceLast - avgCadence,
          totalSub: cd.totalSub
        });
      }
    }
  });
  atRiskClients.sort((a, b) => b.overdueDays - a.overdueDays);

  const allClients = Array.from(curClientMap.keys()).filter(Boolean);

  let maxClientSub = 1;
  curClientMap.forEach((val) => {
    if (val.sub > maxClientSub) maxClientSub = val.sub;
  });

  const clientStats = allClients.map((c) => {
    const curC = curClientMap.get(c) || { sub: 0, doc: 0, arts: new Set<string>(), vend: '—', prov: '—' };
    const prevC = prevClientMap.get(c) || { sub: 0, doc: 0 };

    const sub = curC.sub;
    const prevSub = prevC.sub;
    const doc = curC.doc;
    const prevDoc = prevC.doc;

    const share = sub / curTotalSub;
    const deltaSub = getDelta(sub, prevSub);
    const deltaDoc = getDelta(doc, prevDoc);
    const pricePerDoc = doc > 0 ? sub / doc : 0;

    const vend = curC.vend;
    const prov = curC.prov;
    const distinctArts = curC.arts.size;

    const rfm = rfmMap.get(c);

    return {
      cliente: c,
      vend,
      prov,
      sub,
      share,
      prevSub,
      deltaSub,
      doc,
      prevDoc,
      deltaDoc,
      pricePerDoc,
      distinctArts,
      segment: rfm?.segment || 'Potenciales Fieles',
      segmentColor: rfm?.color || '#2563eb',
      daysSinceLast: rfm?.daysSinceLast ?? 0,
      barPct: (sub / maxClientSub) * 100,
      isInactive: inactiveClients.has(c)
    };
  });

  // Filter and sort
  const filteredClients = clientStats
    .filter((c) => {
      if (selectedSegment && c.segment !== selectedSegment) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        c.cliente.toLowerCase().includes(q) ||
        c.vend.toLowerCase().includes(q) ||
        c.prov.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      let valA = (a as any)[sortKey];
      let valB = (b as any)[sortKey];
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
    });

  // RFM Counts
  const rfmCounts: Record<string, { count: number; totalSub: number; color: string }> = {};
  rfmList.forEach((r) => {
    if (!rfmCounts[r.segment]) {
      rfmCounts[r.segment] = { count: 0, totalSub: 0, color: r.color };
    }
    rfmCounts[r.segment].count++;
    rfmCounts[r.segment].totalSub += r.totalSub;
  });

  // Dormant clients (>365 days) excluding registered inactivos
  const dormantClients = rfmList
    .filter((r) => r.daysSinceLast >= 365 && !inactiveClients.has(r.cliente))
    .sort((a, b) => b.totalSub - a.totalSub);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* RFM Segmentation Bar */}
      <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-sm font-bold text-[#141b2d]">Segmentación Estratégica RFM (Recencia · Frecuencia · Monto)</h2>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Clasificación de toda la cartera comercial. Hacé click en un segmento para filtrar la tabla inferior.
            </p>
          </div>
          {selectedSegment && (
            <button
              onClick={() => setSelectedSegment(null)}
              className="text-xs font-semibold text-[#206bc4] hover:underline"
            >
              Mostrar todos los clientes
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Object.entries(rfmCounts).map(([seg, data]) => {
            const isSelected = selectedSegment === seg;
            return (
              <div
                key={seg}
                onClick={() => setSelectedSegment(isSelected ? null : seg)}
                style={{
                  borderLeftColor: data.color
                }}
                className={`p-3.5 rounded-xl border border-l-4 cursor-pointer transition shadow-xs ${
                  isSelected ? 'bg-blue-50/80 ring-2 ring-[#206bc4]' : 'bg-slate-50/60 hover:bg-slate-100/80'
                }`}
              >
                <div className="text-xs font-bold truncate text-slate-800">{seg}</div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold font-mono text-slate-900">{data.count}</span>
                  <span className="text-[11px] font-mono font-medium text-slate-500">{fmt$M(data.totalSub)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Client Master Table */}
      <div className="bg-white rounded-xl border border-[#e4e8ef] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e4e8ef] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[#141b2d]">Cartera de Clientes ({filteredClients.length})</h3>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Hacé click en cualquier cliente para ver qué artículos compra y qué líneas faltan en su mix (cross-selling).
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar cliente, vendedor, provincia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-[#e4e8ef] rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[440px]">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 bg-[#f8fafc] z-10">
              <tr className="text-[#5b6478] border-b border-[#e4e8ef] font-semibold text-[11px] uppercase tracking-wider">
                <th
                  onClick={() => handleSort('cliente')}
                  className="py-3 px-4 cursor-pointer hover:text-[#206bc4]"
                >
                  Cliente {sortKey === 'cliente' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('segment')}
                  className="py-3 px-3 cursor-pointer hover:text-[#206bc4]"
                >
                  Segmento RFM
                </th>
                <th
                  onClick={() => handleSort('vend')}
                  className="py-3 px-3 cursor-pointer hover:text-[#206bc4]"
                >
                  Vendedor {sortKey === 'vend' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('prov')}
                  className="py-3 px-3 cursor-pointer hover:text-[#206bc4]"
                >
                  Provincia {sortKey === 'prov' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('sub')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Facturación {sortKey === 'sub' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('share')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  % Total {sortKey === 'share' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="py-3 px-3 text-right">Δ vs a.a.</th>
                <th
                  onClick={() => handleSort('doc')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Docenas {sortKey === 'doc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('distinctArts')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Artículos
                </th>
                <th className="py-3 px-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.map((c) => (
                <tr
                  key={c.cliente}
                  onClick={() => onOpenDrilldown({ type: 'cliente', id: c.cliente })}
                  className="hover:bg-blue-50/50 cursor-pointer transition"
                >
                  <td className="py-2.5 px-4 relative">
                    <div
                      className="absolute left-0 top-1 bottom-1 bg-blue-100/60 rounded-r -z-0"
                      style={{ width: `${Math.min(100, c.barPct)}%` }}
                    />
                    <div className="relative z-10 flex items-center gap-2">
                      <span className="font-bold text-slate-800">{c.cliente}</span>
                      {c.isInactive && (
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wider">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      style={{ color: c.segmentColor }}
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100"
                    >
                      {c.segment}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-700">{c.vend}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.prov}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">{fmt$M(c.sub)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtPct(c.share)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        c.deltaSub.direction === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : c.deltaSub.direction === 'down'
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {c.deltaSub.text}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">{fmtDoc(c.doc)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{c.distinctArts}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button className="text-xs text-[#206bc4] font-semibold inline-flex items-center gap-1 hover:underline">
                      <span>Ver</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Early Warning At-Risk Clients Table */}
      {atRiskClients.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
          <div className="p-5 bg-amber-50/50 border-b border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-950">
                  Alertas Preventivas de Frecuencia de Compra ({atRiskClients.length} cuentas en desvío)
                </h3>
                <p className="text-xs text-amber-800/80">
                  Clientes habituales que superaron más del 35% de su intervalo regular sin emitir pedido en este período.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-800 px-3 py-1 rounded-full bg-amber-100 border border-amber-200 self-start sm:self-auto">
              Detección Temprana
            </span>
          </div>

          <div className="overflow-x-auto max-h-[320px]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="sticky top-0 bg-[#f8fafc] z-10">
                <tr className="text-slate-600 font-semibold border-b border-[#e4e8ef]">
                  <th className="py-2.5 px-4">Cliente</th>
                  <th className="py-2.5 px-3">Vendedor</th>
                  <th className="py-2.5 px-3">Provincia</th>
                  <th className="py-2.5 px-3 text-right">Ciclo Habitual</th>
                  <th className="py-2.5 px-3 text-right">Días Sin Comprar</th>
                  <th className="py-2.5 px-3 text-right">Retraso vs Ciclo</th>
                  <th className="py-2.5 px-3 text-right">Facturación Histórica</th>
                  <th className="py-2.5 px-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atRiskClients.map((c) => (
                  <tr
                    key={c.name}
                    onClick={() => onOpenDrilldown({ type: 'cliente', id: c.name })}
                    className="hover:bg-amber-50/40 cursor-pointer transition"
                  >
                    <td className="py-2.5 px-4 font-bold text-slate-800">{c.name}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-700">{c.vend}</td>
                    <td className="py-2.5 px-3 text-slate-600">{c.prov}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                      cada <span className="font-bold">{c.avgCadence}</span> d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-semibold">
                      {c.daysSinceLast} d
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900">
                        +{c.overdueDays} d tarde
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">
                      {fmt$M(c.totalSub)}
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button className="text-xs text-amber-800 font-bold hover:underline inline-flex items-center gap-1">
                        <span>Contactar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dormant Clients Action Board */}
      <div className="bg-white rounded-xl border border-rose-200 shadow-xs overflow-hidden">
        <div className="p-5 bg-rose-50/40 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-rose-950">Plan de Reactivación: Clientes Dormidos (&gt; 365 días)</h3>
          </div>
          <span className="text-xs font-bold text-rose-700 px-2.5 py-0.5 rounded-full bg-rose-100">
            {dormantClients.length} cuentas a recuperar
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-600 font-semibold border-b border-[#e4e8ef]">
                <th className="py-2.5 px-4">Cliente</th>
                <th className="py-2.5 px-3">Vendedor Responsable</th>
                <th className="py-2.5 px-3">Provincia</th>
                <th className="py-2.5 px-3 text-right">Días Sin Comprar</th>
                <th className="py-2.5 px-3 text-right">Facturación Histórica</th>
                <th className="py-2.5 px-3 text-right">Docenas Históricas</th>
                <th className="py-2.5 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dormantClients.slice(0, 10).map((c) => (
                <tr
                  key={c.cliente}
                  onClick={() => onOpenDrilldown({ type: 'cliente', id: c.cliente })}
                  className="hover:bg-rose-50/30 cursor-pointer transition"
                >
                  <td className="py-2.5 px-4 font-bold text-slate-800">{c.cliente}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-700">{c.vend}</td>
                  <td className="py-2.5 px-3 text-slate-600">{c.prov}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-600">{c.daysSinceLast} d</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{fmt$M(c.totalSub)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtDoc(c.totalDoc)}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button className="text-xs text-[#206bc4] font-semibold hover:underline">
                      Reactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

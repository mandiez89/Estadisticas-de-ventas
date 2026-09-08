import React, { useState } from 'react';
import { SaleRow, DrilldownTarget } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct, fmtPp, getDelta } from '../utils/formatters';
import { Users, Scale, ArrowRight, ArrowUpRight, ArrowDownRight, Award } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface VendorsSectionProps {
  curRows: SaleRow[];
  prevRows: SaleRow[];
  baseRows: SaleRow[];
  periodLabel: string;
  prevPeriodLabel: string;
  onOpenDrilldown: (target: DrilldownTarget) => void;
}

export const VendorsSection: React.FC<VendorsSectionProps> = ({
  curRows,
  prevRows,
  baseRows,
  periodLabel,
  prevPeriodLabel,
  onOpenDrilldown
}) => {
  // Unique vendors
  const vendorSet = new Set<string>();
  curRows.forEach((r) => {
    if (r.vend && r.vend !== '(sin vendedor)') vendorSet.add(r.vend);
  });
  prevRows.forEach((r) => {
    if (r.vend && r.vend !== '(sin vendedor)') vendorSet.add(r.vend);
  });
  const allVendors = Array.from(vendorSet).sort();

  const [cmpVendA, setCmpVendA] = useState<string>(allVendors[0] || '');
  const [cmpVendB, setCmpVendB] = useState<string>('__ALL__');
  const [cmpDimension, setCmpDimension] = useState<'linea' | 'fam' | 'color' | 'talle' | 'art'>('linea');
  const [sortKey, setSortKey] = useState<string>('sub');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Aggregation per vendor for cur and prev using fast single-pass maps
  const curTotalSub = curRows.reduce((acc, r) => acc + r.sub, 0) || 1;

  // Single pass for curRows
  const curVendorMap = new Map<string, { sub: number; doc: number; clients: Set<string>; arts: Set<string> }>();
  for (let i = 0; i < curRows.length; i++) {
    const r = curRows[i];
    let v = curVendorMap.get(r.vend);
    if (!v) {
      v = { sub: 0, doc: 0, clients: new Set(), arts: new Set() };
      curVendorMap.set(r.vend, v);
    }
    v.sub += r.sub;
    v.doc += r.doc;
    v.clients.add(r.cliente);
    v.arts.add(r.art);
  }

  // Single pass for prevRows
  const prevVendorMap = new Map<string, { sub: number; doc: number; clients: Set<string> }>();
  for (let i = 0; i < prevRows.length; i++) {
    const r = prevRows[i];
    let v = prevVendorMap.get(r.vend);
    if (!v) {
      v = { sub: 0, doc: 0, clients: new Set() };
      prevVendorMap.set(r.vend, v);
    }
    v.sub += r.sub;
    v.doc += r.doc;
    v.clients.add(r.cliente);
  }

  // Monthly breakdown for sparklines & determine currentMaxIdx without spreading large arrays
  let currentMaxIdx = 0;
  const vendorMonthlyMap = new Map<string, Record<number, number>>();
  for (let i = 0; i < baseRows.length; i++) {
    const r = baseRows[i];
    const idx = r.y * 12 + r.m;
    if (idx > currentMaxIdx) currentMaxIdx = idx;

    let mObj = vendorMonthlyMap.get(r.vend);
    if (!mObj) {
      mObj = {};
      vendorMonthlyMap.set(r.vend, mObj);
    }
    mObj[idx] = (mObj[idx] || 0) + r.sub;
  }

  let maxVendorSub = 1;
  curVendorMap.forEach((val) => {
    if (val.sub > maxVendorSub) maxVendorSub = val.sub;
  });

  const vendorStats = allVendors.map((v) => {
    const curV = curVendorMap.get(v) || { sub: 0, doc: 0, clients: new Set<string>(), arts: new Set<string>() };
    const prevV = prevVendorMap.get(v) || { sub: 0, doc: 0, clients: new Set<string>() };

    const sub = curV.sub;
    const prevSub = prevV.sub;
    const doc = curV.doc;
    const prevDoc = prevV.doc;

    const share = sub / curTotalSub;
    const deltaSub = getDelta(sub, prevSub);
    const deltaDoc = getDelta(doc, prevDoc);

    const pricePerDoc = doc > 0 ? sub / doc : 0;

    const curClients = curV.clients;
    const prevClients = prevV.clients;

    let gained = 0;
    curClients.forEach((c) => {
      if (!prevClients.has(c)) gained++;
    });
    let lost = 0;
    prevClients.forEach((c) => {
      if (!curClients.has(c)) lost++;
    });
    const net = gained - lost;

    const distinctArts = curV.arts.size;

    // Monthly sparkline from precomputed map
    const monthlyVals: number[] = [];
    const monthsMap = vendorMonthlyMap.get(v) || {};
    for (let idx = currentMaxIdx - 11; idx <= currentMaxIdx; idx++) {
      monthlyVals.push(monthsMap[idx] || 0);
    }

    return {
      name: v,
      sub,
      share,
      prevSub,
      deltaSub,
      doc,
      prevDoc,
      deltaDoc,
      pricePerDoc,
      clientsCount: curClients.size,
      gained,
      lost,
      net,
      distinctArts,
      monthlyVals,
      barPct: (sub / maxVendorSub) * 100
    };
  });

  // Sort vendors
  vendorStats.sort((a, b) => {
    let valA = (a as any)[sortKey];
    let valB = (b as any)[sortKey];
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortAsc ? valA - valB : valB - valA;
    }
    return sortAsc ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
  });

  // Comparator calculations
  const getCmpRows = (who: string, isPrev = false) => {
    const dataset = isPrev ? prevRows : curRows;
    if (who === '__ALL__') return dataset;
    return dataset.filter((r) => r.vend === who);
  };

  const rowsA = getCmpRows(cmpVendA);
  const rowsB = getCmpRows(cmpVendB);
  const prevRowsA = getCmpRows(cmpVendA, true);
  const prevRowsB = getCmpRows(cmpVendB, true);

  const subA = rowsA.reduce((acc, r) => acc + r.sub, 0);
  const subB = rowsB.reduce((acc, r) => acc + r.sub, 0);
  const docA = rowsA.reduce((acc, r) => acc + r.doc, 0);
  const docB = rowsB.reduce((acc, r) => acc + r.doc, 0);

  const cliA = new Set(rowsA.map((r) => r.cliente)).size;
  const cliB = new Set(rowsB.map((r) => r.cliente)).size;

  const pxdA = docA > 0 ? subA / docA : 0;
  const pxdB = docB > 0 ? subB / docB : 0;

  const deltaA = getDelta(subA, prevRowsA.reduce((acc, r) => acc + r.sub, 0));
  const deltaB = getDelta(subB, prevRowsB.reduce((acc, r) => acc + r.sub, 0));

  const labelA = cmpVendA || 'Vendedor A';
  const labelB = cmpVendB === '__ALL__' ? 'Empresa (Total)' : cmpVendB;

  // Mix comparison across selected dimension
  const getAggMix = (rows: SaleRow[], dim: 'linea' | 'fam' | 'color' | 'talle' | 'art') => {
    const agg: Record<string, number> = {};
    rows.forEach((r) => {
      const key = r[dim] || '—';
      agg[key] = (agg[key] || 0) + r.sub;
    });
    const total = Object.values(agg).reduce((acc, v) => acc + v, 0) || 1;
    const mix: Record<string, number> = {};
    Object.entries(agg).forEach(([k, v]) => {
      mix[k] = v / total;
    });
    return { agg, mix, total };
  };

  const mixA = getAggMix(rowsA, cmpDimension);
  const mixB = getAggMix(rowsB, cmpDimension);

  const allKeys = Array.from(new Set([...Object.keys(mixA.mix), ...Object.keys(mixB.mix)]));
  const gapData = allKeys
    .map((k) => {
      const pctA = mixA.mix[k] || 0;
      const pctB = mixB.mix[k] || 0;
      const gap = pctA - pctB;
      return {
        key: k,
        name: k.length > 18 ? k.slice(0, 16) + '…' : k,
        fullName: k,
        pctA: Number((pctA * 100).toFixed(1)),
        pctB: Number((pctB * 100).toFixed(1)),
        gap: gap
      };
    })
    .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    .slice(0, 12);

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
      {/* Vendor Master Table */}
      <div className="bg-white rounded-xl border border-[#e4e8ef] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e4e8ef] flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-[#141b2d]">Fuerza Comercial: Desempeño por Vendedor</h2>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Hacé click en cualquier fila para abrir el desglose individual completo de clientes y productos.
            </p>
          </div>
          <div className="text-xs text-[#8b95a8] font-mono">
            {vendorStats.length} vendedores en el período
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-[#5b6478] border-b border-[#e4e8ef] font-semibold text-[11px] uppercase tracking-wider">
                <th
                  onClick={() => handleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-[#206bc4]"
                >
                  Vendedor {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
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
                <th className="py-3 px-3 text-right">Δ Fact. a.a.</th>
                <th
                  onClick={() => handleSort('doc')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Docenas {sortKey === 'doc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="py-3 px-3 text-right">Δ Docenas</th>
                <th
                  onClick={() => handleSort('pricePerDoc')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  $ / Docena {sortKey === 'pricePerDoc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('clientsCount')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Clientes {sortKey === 'clientsCount' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('gained')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Ganados {sortKey === 'gained' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('lost')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Perdidos {sortKey === 'lost' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('net')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Saldo Neto {sortKey === 'net' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="py-3 px-4 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendorStats.map((v) => (
                <tr
                  key={v.name}
                  onClick={() => onOpenDrilldown({ type: 'vend', id: v.name })}
                  className="hover:bg-blue-50/50 cursor-pointer transition"
                >
                  <td className="py-3 px-4 relative">
                    <div
                      className="absolute left-0 top-1.5 bottom-1.5 bg-blue-100/70 rounded-r -z-0"
                      style={{ width: `${Math.min(100, v.barPct)}%` }}
                    />
                    <div className="relative z-10 flex items-center gap-2 font-bold text-slate-800">
                      <span>{v.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-800">{fmt$M(v.sub)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-600">{fmtPct(v.share)}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        v.deltaSub.direction === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.deltaSub.direction === 'down'
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {v.deltaSub.text}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800 font-semibold">{fmtDoc(v.doc)}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        v.deltaDoc.direction === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.deltaDoc.direction === 'down'
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {v.deltaDoc.text}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-amber-700 font-medium">{fmt$(v.pricePerDoc)}</td>
                  <td className="py-3 px-3 text-right font-mono text-slate-700">{v.clientsCount}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-emerald-600">+{v.gained}</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-rose-600">-{v.lost}</td>
                  <td className="py-3 px-3 text-right font-mono">
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        v.net > 0 ? 'bg-emerald-100 text-emerald-800' : v.net < 0 ? 'bg-rose-100 text-rose-800' : 'text-slate-600'
                      }`}
                    >
                      {v.net > 0 ? `+${v.net}` : v.net}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button className="text-xs text-[#206bc4] font-semibold inline-flex items-center gap-1 hover:underline">
                      <span>Ver ficha</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Head-to-Head Comparator */}
      <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e4e8ef]">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#206bc4]" />
              <h2 className="text-sm font-bold text-[#141b2d]">Comparador de Desempeño Comercial</h2>
            </div>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Compará dos ejecutivos de venta o un vendedor contra el estándar promedio de la empresa.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Vendor A */}
            <select
              value={cmpVendA}
              onChange={(e) => setCmpVendA(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-blue-50 border border-blue-200 text-[#206bc4] rounded-lg focus:outline-none"
            >
              {allVendors.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>

            <span className="text-xs font-bold text-slate-400">vs</span>

            {/* Vendor B */}
            <select
              value={cmpVendB}
              onChange={(e) => setCmpVendB(e.target.value)}
              className="text-xs font-semibold px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg focus:outline-none"
            >
              <option value="__ALL__">Empresa (Total Promedio)</option>
              {allVendors
                .filter((v) => v !== cmpVendA)
                .map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
            </select>

            {/* Dimension */}
            <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg text-xs font-semibold">
              {[
                { id: 'linea', label: 'Líneas' },
                { id: 'fam', label: 'Familias' },
                { id: 'color', label: 'Colores' },
                { id: 'talle', label: 'Talles' },
                { id: 'art', label: 'Artículos' }
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setCmpDimension(d.id as any)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    cmpDimension === d.id ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Head-to-Head KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#e4e8ef]">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Facturación</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-sm font-bold text-[#206bc4]">{fmt$M(subA)}</span>
              <span className="text-sm font-bold text-amber-700">{fmt$M(subB)}</span>
            </div>
          </div>

          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#e4e8ef]">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Docenas Entregadas</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-sm font-bold text-[#206bc4]">{fmtDoc(docA)}</span>
              <span className="text-sm font-bold text-amber-700">{fmtDoc(docB)}</span>
            </div>
          </div>

          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#e4e8ef]">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Precio / Docena ($/dz)</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-sm font-bold text-[#206bc4]">{fmt$(pxdA)}</span>
              <span className="text-sm font-bold text-amber-700">{fmt$(pxdB)}</span>
            </div>
          </div>

          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#e4e8ef]">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Clientes con Compra</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-sm font-bold text-[#206bc4]">{cliA}</span>
              <span className="text-sm font-bold text-amber-700">{cliB}</span>
            </div>
          </div>

          <div className="bg-[#f8fafc] p-3 rounded-lg border border-[#e4e8ef]">
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Crecimiento vs a.a.</div>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-xs font-bold text-[#206bc4]">{deltaA.text}</span>
              <span className="text-xs font-bold text-amber-700">{deltaB.text}</span>
            </div>
          </div>
        </div>

        {/* Dual Chart and Gap Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Chart */}
          <div className="lg:col-span-7">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Mix de Participación (%) por {cmpDimension}
            </h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gapData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" horizontal={false} />
                  <XAxis type="number" unit="%" stroke="#8b95a8" fontSize={11} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#8b95a8" fontSize={11} tickLine={false} />
                  <Tooltip
                    formatter={(val: any, name: string) => [`${val}%`, name === 'pctA' ? labelA : labelB]}
                    contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Legend formatter={(val) => (val === 'pctA' ? labelA : labelB)} />
                  <Bar dataKey="pctA" fill="#206bc4" radius={[0, 4, 4, 0]} maxBarSize={12} />
                  <Bar dataKey="pctB" fill="#a35a00" radius={[0, 4, 4, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gap Table */}
          <div className="lg:col-span-5">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              Mayores Brechas de Mix (Puntos Porcentuales)
            </h3>
            <div className="border border-[#e4e8ef] rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-[#f8fafc] text-[#5b6478] border-b border-[#e4e8ef] font-semibold">
                    <th className="py-2 px-3">{cmpDimension}</th>
                    <th className="py-2 px-2 text-right">{labelA.slice(0, 10)}</th>
                    <th className="py-2 px-2 text-right">{labelB.slice(0, 10)}</th>
                    <th className="py-2 px-3 text-right">Brecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gapData.map((g) => (
                    <tr key={g.key} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-medium text-slate-800 truncate max-w-[130px]">{g.fullName}</td>
                      <td className="py-2 px-2 text-right font-mono text-[#206bc4]">{g.pctA}%</td>
                      <td className="py-2 px-2 text-right font-mono text-amber-700">{g.pctB}%</td>
                      <td className="py-2 px-3 text-right font-mono font-semibold">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[11px] ${
                            g.gap > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {fmtPp(g.gap)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

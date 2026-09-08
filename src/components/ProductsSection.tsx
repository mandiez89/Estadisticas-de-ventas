import React, { useState } from 'react';
import { SaleRow, DrilldownTarget } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct, getDelta, talleSort } from '../utils/formatters';
import { Search, Grid, Eye, Layers, Package, ArrowRight } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface ProductsSectionProps {
  curRows: SaleRow[];
  prevRows: SaleRow[];
  baseRows: SaleRow[];
  periodLabel: string;
  onOpenDrilldown: (target: DrilldownTarget) => void;
}

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  curRows,
  prevRows,
  baseRows,
  periodLabel,
  onOpenDrilldown
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<string>('sub');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [treemapDim, setTreemapDim] = useState<'linea' | 'fam' | 'art'>('linea');

  // Aggregation per article
  const curTotalSub = curRows.reduce((acc, r) => acc + r.sub, 0) || 1;
  const allArticles: string[] = Array.from(new Set(curRows.map((r) => r.art))).filter((a): a is string => Boolean(a));
  const maxArtDoc = Math.max(
    ...allArticles.map((a) => curRows.filter((r) => r.art === a).reduce((acc, r) => acc + r.doc, 0)),
    1
  );

  const articleStats = allArticles.map((art) => {
    const curA = curRows.filter((r) => r.art === art);
    const prevA = prevRows.filter((r) => r.art === art);

    const sub = curA.reduce((acc, r) => acc + r.sub, 0);
    const prevSub = prevA.reduce((acc, r) => acc + r.sub, 0);
    const doc = curA.reduce((acc, r) => acc + r.doc, 0);
    const prevDoc = prevA.reduce((acc, r) => acc + r.doc, 0);

    const share = sub / curTotalSub;
    const deltaSub = getDelta(sub, prevSub);
    const deltaDoc = getDelta(doc, prevDoc);
    const pricePerDoc = doc > 0 ? sub / doc : 0;

    const sample = curA[0] || {};
    const fam = sample.fam || '—';
    const linea = sample.linea || '—';

    const clientCount = new Set(curA.map((r) => r.cliente)).size;

    return {
      art,
      fam,
      linea,
      sub,
      share,
      prevSub,
      deltaSub,
      doc,
      prevDoc,
      deltaDoc,
      pricePerDoc,
      clientCount,
      barPct: (doc / maxArtDoc) * 100
    };
  });

  // Filter & sort
  const filteredArticles = articleStats
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.art.toLowerCase().includes(q) ||
        a.fam.toLowerCase().includes(q) ||
        a.linea.toLowerCase().includes(q)
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

  // Colors aggregation (Top 10)
  const colorMap: Record<string, number> = {};
  curRows.forEach((r) => {
    if (r.color && r.color !== '—') {
      colorMap[r.color] = (colorMap[r.color] || 0) + r.doc;
    }
  });
  const colorData = Object.entries(colorMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([color, doc]) => ({ name: color, doc: Math.round(doc) }));

  // Talles aggregation (Ordered standard textile curve)
  const talleMap: Record<string, number> = {};
  curRows.forEach((r) => {
    if (r.talle && r.talle !== '—') {
      talleMap[r.talle] = (talleMap[r.talle] || 0) + r.doc;
    }
  });
  const talleData = Object.entries(talleMap)
    .map(([talle, doc]) => ({ name: talle, doc: Math.round(doc) }))
    .sort((a, b) => talleSort(a.name, b.name));

  // Color x Talle Heatmap matrix
  const topColors = Object.keys(colorMap)
    .sort((a, b) => colorMap[b] - colorMap[a])
    .slice(0, 10);
  const topTalles = Object.keys(talleMap).sort(talleSort);

  const matrixCells: Record<string, number> = {};
  let maxCellVal = 0;
  curRows.forEach((r) => {
    const k = `${r.color}||${r.talle}`;
    const v = (matrixCells[k] || 0) + r.doc;
    matrixCells[k] = v;
    if (v > maxCellVal) maxCellVal = v;
  });

  // Treemap custom layout blocks
  const treemapAgg: Record<string, number> = {};
  curRows.forEach((r) => {
    const key = r[treemapDim] || '—';
    treemapAgg[key] = (treemapAgg[key] || 0) + r.sub;
  });
  const treemapItems = Object.entries(treemapAgg)
    .sort((a, b) => b[1] - a[1])
    .map(([name, val], idx) => ({
      name,
      val,
      pct: val / curTotalSub,
      color: [
        '#206bc4',
        '#0f766e',
        '#a35a00',
        '#7c3aed',
        '#be123c',
        '#0e7490',
        '#4d7c0f',
        '#9333ea',
        '#b91c1c',
        '#475569'
      ][idx % 10]
    }));

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
      {/* Product Master Table */}
      <div className="bg-white rounded-xl border border-[#e4e8ef] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e4e8ef] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[#141b2d]">Matriz de Artículos</h2>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Rendimiento por código de artículo, familia, docenas físicas y precio realizado.
            </p>
          </div>
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar artículo, familia..."
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
                  onClick={() => handleSort('art')}
                  className="py-3 px-4 cursor-pointer hover:text-[#206bc4]"
                >
                  Artículo {sortKey === 'art' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('fam')}
                  className="py-3 px-3 cursor-pointer hover:text-[#206bc4]"
                >
                  Familia {sortKey === 'fam' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('linea')}
                  className="py-3 px-3 cursor-pointer hover:text-[#206bc4]"
                >
                  Línea {sortKey === 'linea' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('doc')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Docenas {sortKey === 'doc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="py-3 px-3 text-right">Δ Docenas a.a.</th>
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
                <th
                  onClick={() => handleSort('pricePerDoc')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  $ / Docena {sortKey === 'pricePerDoc' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th
                  onClick={() => handleSort('clientCount')}
                  className="py-3 px-3 text-right cursor-pointer hover:text-[#206bc4]"
                >
                  Clientes {sortKey === 'clientCount' ? (sortAsc ? '▲' : '▼') : ''}
                </th>
                <th className="py-3 px-4 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredArticles.map((a) => (
                <tr
                  key={a.art}
                  onClick={() => onOpenDrilldown({ type: 'art', id: a.art })}
                  className="hover:bg-blue-50/50 cursor-pointer transition"
                >
                  <td className="py-2.5 px-4 relative">
                    <div
                      className="absolute left-0 top-1 bottom-1 bg-emerald-100/60 rounded-r -z-0"
                      style={{ width: `${Math.min(100, a.barPct)}%` }}
                    />
                    <span className="relative z-10 font-bold text-slate-800">{a.art}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-600">{a.fam}</td>
                  <td className="py-2.5 px-3 text-slate-600">{a.linea}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-800">{fmtDoc(a.doc)}</td>
                  <td className="py-2.5 px-3 text-right font-mono">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                        a.deltaDoc.direction === 'up'
                          ? 'bg-emerald-50 text-emerald-700'
                          : a.deltaDoc.direction === 'down'
                          ? 'bg-rose-50 text-rose-700'
                          : 'text-slate-500'
                      }`}
                    >
                      {a.deltaDoc.text}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#206bc4]">{fmt$M(a.sub)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtPct(a.share)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-700 font-medium">{fmt$(a.pricePerDoc)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-700">{a.clientCount}</td>
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

      {/* Visual Treemap of Revenue */}
      <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-[#141b2d]">Distribución de Facturación (Treemap)</h3>
            <p className="text-xs text-[#5b6478] mt-0.5">Área proporcional al volumen monetario facturado</p>
          </div>
          <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg text-xs font-semibold">
            {(['linea', 'fam', 'art'] as const).map((dim) => (
              <button
                key={dim}
                onClick={() => setTreemapDim(dim)}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  treemapDim === dim ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                }`}
              >
                {dim === 'linea' ? 'Líneas' : dim === 'fam' ? 'Familias' : 'Artículos'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {treemapItems.map((item) => (
            <div
              key={item.name}
              style={{
                backgroundColor: item.color,
                flexGrow: Math.max(1, Math.round(item.pct * 100))
              }}
              className="p-3.5 rounded-xl text-white min-w-[130px] flex flex-col justify-between shadow-xs transition hover:brightness-105"
            >
              <div className="font-bold text-xs truncate" title={item.name}>
                {item.name}
              </div>
              <div className="mt-2 font-mono text-xs flex items-baseline justify-between gap-2">
                <span className="font-semibold">{fmt$M(item.val)}</span>
                <span className="opacity-80 text-[11px]">{fmtPct(item.pct)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Colors and Sizes Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Colors Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#141b2d]">Top 10 Colores Más Demandados</h3>
            <p className="text-xs text-[#5b6478] mt-0.5">Volumen en docenas físicas</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={colorData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis dataKey="name" stroke="#8b95a8" fontSize={10} tickLine={false} angle={-30} textAnchor="end" />
                <YAxis stroke="#8b95a8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => fmtDoc(v)} />
                <Tooltip
                  formatter={(v: any) => [`${fmtDoc(v)} docenas`, 'Volumen']}
                  contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="doc" fill="#206bc4" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sizes Chart (Curva de Talles) */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-[#141b2d]">Curva de Talles</h3>
            <p className="text-xs text-[#5b6478] mt-0.5">Ordenado según escala estándar de confección</p>
          </div>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={talleData} margin={{ top: 10, right: 10, left: 10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis dataKey="name" stroke="#8b95a8" fontSize={10} tickLine={false} />
                <YAxis stroke="#8b95a8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => fmtDoc(v)} />
                <Tooltip
                  formatter={(v: any) => [`${fmtDoc(v)} docenas`, 'Volumen']}
                  contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="doc" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mix Color x Talle Heatmap */}
      <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs overflow-hidden">
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Grid className="w-4 h-4 text-[#206bc4]" />
            <h3 className="text-sm font-bold text-[#141b2d]">Matriz Color × Talle (Curva de Producción)</h3>
          </div>
          <p className="text-xs text-[#5b6478] mt-0.5">
            Docenas requeridas por celda en el período seleccionado. Base para programación de tejeduría y corte.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-600 font-semibold border-b border-[#e4e8ef]">
                <th className="py-2.5 px-3 text-left font-bold text-slate-800">Color \ Talle</th>
                {topTalles.map((t) => (
                  <th key={t} className="py-2.5 px-2 min-w-[48px]">
                    {t}
                  </th>
                ))}
                <th className="py-2.5 px-3 text-right bg-slate-100 font-bold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topColors.map((col) => {
                let rowSum = 0;
                return (
                  <tr key={col} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-left font-semibold text-slate-800 truncate max-w-[130px]">{col}</td>
                    {topTalles.map((tal) => {
                      const val = matrixCells[`${col}||${tal}`] || 0;
                      rowSum += val;
                      const intensity = maxCellVal > 0 ? val / maxCellVal : 0;
                      return (
                        <td
                          key={tal}
                          style={{
                            backgroundColor: val > 0 ? `rgba(32, 107, 196, ${Math.max(0.08, intensity * 0.85)})` : '#f8fafc',
                            color: intensity > 0.45 ? '#ffffff' : val > 0 ? '#141b2d' : '#cbd5e1'
                          }}
                          className="py-2 px-1 font-mono text-[11px] font-medium"
                          title={`${col} · ${tal}: ${fmtDoc(val)} dz`}
                        >
                          {val > 0 ? fmtDoc(val) : '·'}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 bg-slate-50">
                      {fmtDoc(rowSum)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

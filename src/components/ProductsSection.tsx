import React, { useState } from 'react';
import { SaleRow, DrilldownTarget } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct, getDelta, talleSort } from '../utils/formatters';
import { Search, Grid, Eye, Layers, Package, ArrowRight, SlidersHorizontal, Calculator } from 'lucide-react';
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
  const [matrixArticle, setMatrixArticle] = useState<string>('__ALL__');
  const [matrixMetric, setMatrixMetric] = useState<'doc' | 'pct'>('doc');
  const [simulatedBatch, setSimulatedBatch] = useState<string>('');

  // Aggregation per article using fast single-pass maps
  const curTotalSub = curRows.reduce((acc, r) => acc + r.sub, 0) || 1;

  const curArtMap = new Map<string, { sub: number; doc: number; clients: Set<string>; fam: string; linea: string }>();
  for (let i = 0; i < curRows.length; i++) {
    const r = curRows[i];
    let a = curArtMap.get(r.art);
    if (!a) {
      a = { sub: 0, doc: 0, clients: new Set(), fam: r.fam || '—', linea: r.linea || '—' };
      curArtMap.set(r.art, a);
    }
    a.sub += r.sub;
    a.doc += r.doc;
    a.clients.add(r.cliente);
  }

  const prevArtMap = new Map<string, { sub: number; doc: number }>();
  for (let i = 0; i < prevRows.length; i++) {
    const r = prevRows[i];
    let a = prevArtMap.get(r.art);
    if (!a) {
      a = { sub: 0, doc: 0 };
      prevArtMap.set(r.art, a);
    }
    a.sub += r.sub;
    a.doc += r.doc;
  }

  const allArticles = Array.from(curArtMap.keys()).filter(Boolean);

  let maxArtDoc = 1;
  curArtMap.forEach((val) => {
    if (val.doc > maxArtDoc) maxArtDoc = val.doc;
  });

  const articleStats = allArticles.map((art) => {
    const curA = curArtMap.get(art) || { sub: 0, doc: 0, clients: new Set<string>(), fam: '—', linea: '—' };
    const prevA = prevArtMap.get(art) || { sub: 0, doc: 0 };

    const sub = curA.sub;
    const prevSub = prevA.sub;
    const doc = curA.doc;
    const prevDoc = prevA.doc;

    const share = sub / curTotalSub;
    const deltaSub = getDelta(sub, prevSub);
    const deltaDoc = getDelta(doc, prevDoc);
    const pricePerDoc = doc > 0 ? sub / doc : 0;

    const fam = curA.fam;
    const linea = curA.linea;
    const clientCount = curA.clients.size;

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

  // Curva de Producción Matrix Data (Per Article or Company Total)
  const matrixRows = matrixArticle === '__ALL__' ? curRows : curRows.filter((r) => r.art === matrixArticle);
  const matrixTotalDoc = matrixRows.reduce((a, b) => a + b.doc, 0) || 1;

  const matColorMap: Record<string, number> = {};
  matrixRows.forEach((r) => {
    if (r.color && r.color !== '—') {
      matColorMap[r.color] = (matColorMap[r.color] || 0) + r.doc;
    }
  });
  const matColors = Object.keys(matColorMap).sort((a, b) => matColorMap[b] - matColorMap[a]).slice(0, 15);

  const matTalleMap: Record<string, number> = {};
  matrixRows.forEach((r) => {
    if (r.talle && r.talle !== '—') {
      matTalleMap[r.talle] = (matTalleMap[r.talle] || 0) + r.doc;
    }
  });
  const matTalles = Object.keys(matTalleMap).sort(talleSort);

  const matCells: Record<string, number> = {};
  let matMaxCell = 0;
  matrixRows.forEach((r) => {
    const k = `${r.color}||${r.talle}`;
    const v = (matCells[k] || 0) + r.doc;
    matCells[k] = v;
    if (v > matMaxCell) matMaxCell = v;
  });

  const parsedBatch = Number(simulatedBatch) > 0 ? Number(simulatedBatch) : 0;

  const articleListForMatrix = Array.from(curArtMap.entries())
    .map(([art, d]) => ({
      art,
      fam: d.fam,
      doc: d.doc
    }))
    .sort((a, b) => b.doc - a.doc);

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
                    <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => {
                          setMatrixArticle(a.art);
                          const el = document.getElementById('curva-matrix-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }}
                        className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-[#206bc4] rounded text-[11px] font-semibold transition"
                        title="Ver matriz y curva de producción de este artículo"
                      >
                        Curva
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenDrilldown({ type: 'art', id: a.art })}
                        className="text-xs text-slate-500 font-semibold p-1 hover:text-[#206bc4]"
                        title="Ver desglose detallado"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
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

      {/* Matriz Curva de Producción Color x Talle por Artículo */}
      <div id="curva-matrix-section" className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
        {/* Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#e4e8ef] mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Grid className="w-4 h-4 text-[#206bc4]" />
              <h3 className="text-sm font-bold text-[#141b2d]">
                Matriz y Curva de Producción Color × Talle {matrixArticle !== '__ALL__' ? `(${matrixArticle})` : ''}
              </h3>
            </div>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Curva porcentual de venta por talle y color para balanceo de tejeduría, corte y reposición de stock.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Article Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500">Artículo:</span>
              <select
                value={matrixArticle}
                onChange={(e) => setMatrixArticle(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 bg-blue-50 border border-blue-200 text-[#206bc4] rounded-lg focus:outline-none max-w-[240px]"
              >
                <option value="__ALL__">Todos los artículos (Planta Total)</option>
                {articleListForMatrix.map((item) => (
                  <option key={item.art} value={item.art}>
                    {item.art} · {item.fam} ({fmtDoc(item.doc)} dz)
                  </option>
                ))}
              </select>
            </div>

            {/* Metric Toggle */}
            <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setMatrixMetric('doc')}
                className={`px-2.5 py-1 rounded-md transition ${
                  matrixMetric === 'doc' ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                }`}
              >
                Docenas
              </button>
              <button
                type="button"
                onClick={() => setMatrixMetric('pct')}
                className={`px-2.5 py-1 rounded-md transition ${
                  matrixMetric === 'pct' ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                }`}
              >
                % Curva
              </button>
            </div>

            {/* Batch Simulator */}
            <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
              <Calculator className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="text-xs font-medium text-slate-600 whitespace-nowrap">Simular Lote:</span>
              <input
                type="number"
                placeholder="dz a tejer..."
                value={simulatedBatch}
                onChange={(e) => setSimulatedBatch(e.target.value)}
                className="w-20 px-2 py-0.5 text-xs bg-white border border-slate-200 rounded font-mono text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
              />
              {parsedBatch > 0 && (
                <button
                  type="button"
                  onClick={() => setSimulatedBatch('')}
                  className="text-[10px] text-slate-400 hover:text-slate-600 font-bold px-1"
                  title="Limpiar simulador"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Curva de Talles & Colores Breakdown Pills */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Curva de Talles */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">
                Curva de Talles {matrixArticle !== '__ALL__' ? `· ${matrixArticle}` : ''}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Participación % sobre demanda</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {matTalles.map((t) => {
                const docVal = matTalleMap[t] || 0;
                const pctVal = matrixTotalDoc > 0 ? (docVal / matrixTotalDoc) * 100 : 0;
                const sugVal = parsedBatch > 0 ? Math.round((pctVal / 100) * parsedBatch) : 0;
                return (
                  <div key={t} className="bg-white p-2 rounded border border-slate-200 text-center">
                    <span className="text-xs font-bold text-slate-900 block">{t}</span>
                    <span className="text-xs font-mono font-bold text-[#206bc4]">{pctVal.toFixed(1)}%</span>
                    <span className="text-[10px] font-mono text-slate-400 block">{fmtDoc(docVal)} dz</span>
                    {parsedBatch > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 bg-amber-100 text-amber-900 font-mono font-bold text-[10px] rounded">
                        {fmtDoc(sugVal)} dz
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Curva de Colores */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700">Top Colores Más Demandados</span>
              <span className="text-[10px] text-slate-500 font-medium">Colorimétrico</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {matColors.slice(0, 8).map((c) => {
                const docVal = matColorMap[c] || 0;
                const pctVal = matrixTotalDoc > 0 ? (docVal / matrixTotalDoc) * 100 : 0;
                const sugVal = parsedBatch > 0 ? Math.round((pctVal / 100) * parsedBatch) : 0;
                return (
                  <div key={c} className="bg-white p-2 rounded border border-slate-200 text-center">
                    <span className="text-xs font-bold text-slate-900 block truncate" title={c}>
                      {c}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-700">{pctVal.toFixed(1)}%</span>
                    <span className="text-[10px] font-mono text-slate-400 block">{fmtDoc(docVal)} dz</span>
                    {parsedBatch > 0 && (
                      <span className="inline-block mt-1 px-1.5 py-0.2 bg-amber-100 text-amber-900 font-mono font-bold text-[10px] rounded">
                        {fmtDoc(sugVal)} dz
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-slate-600 font-semibold border-b border-[#e4e8ef]">
                <th className="py-2.5 px-3 text-left font-bold text-slate-800">Color \ Talle</th>
                {matTalles.map((t) => {
                  const tDoc = matTalleMap[t] || 0;
                  const tPct = matrixTotalDoc > 0 ? (tDoc / matrixTotalDoc) * 100 : 0;
                  return (
                    <th key={t} className="py-2.5 px-2 min-w-[64px]">
                      <div>{t}</div>
                      <div className="text-[10px] font-normal text-slate-400 font-mono">{tPct.toFixed(0)}%</div>
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 text-right bg-slate-100 font-bold min-w-[70px]">Total Color</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matColors.map((col) => {
                const colDoc = matColorMap[col] || 0;
                const colPct = matrixTotalDoc > 0 ? (colDoc / matrixTotalDoc) * 100 : 0;
                return (
                  <tr key={col} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 text-left font-semibold text-slate-800 truncate max-w-[140px]">
                      <span>{col}</span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1.5">({colPct.toFixed(0)}%)</span>
                    </td>
                    {matTalles.map((tal) => {
                      const val = matCells[`${col}||${tal}`] || 0;
                      const cellPct = matrixTotalDoc > 0 ? (val / matrixTotalDoc) * 100 : 0;
                      const intensity = matMaxCell > 0 ? val / matMaxCell : 0;
                      const sugUnits = parsedBatch > 0 && cellPct > 0 ? Math.round((cellPct / 100) * parsedBatch) : 0;

                      return (
                        <td
                          key={tal}
                          style={{
                            backgroundColor:
                              val > 0 ? `rgba(32, 107, 196, ${Math.max(0.08, intensity * 0.85)})` : '#f8fafc',
                            color: intensity > 0.45 ? '#ffffff' : val > 0 ? '#141b2d' : '#cbd5e1'
                          }}
                          className="py-2 px-1 font-mono text-[11px] font-medium"
                          title={`${col} · ${tal}: ${fmtDoc(val)} dz (${cellPct.toFixed(1)}%)`}
                        >
                          {val > 0 ? (
                            <div>
                              <div>{matrixMetric === 'doc' ? fmtDoc(val) : `${cellPct.toFixed(1)}%`}</div>
                              {sugUnits > 0 && (
                                <div
                                  className={`text-[9px] font-bold ${
                                    intensity > 0.45 ? 'text-amber-200' : 'text-amber-700'
                                  }`}
                                >
                                  sug: {fmtDoc(sugUnits)}
                                </div>
                              )}
                            </div>
                          ) : (
                            '·'
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-mono font-bold text-slate-800 bg-slate-50">
                      <div>{matrixMetric === 'doc' ? fmtDoc(colDoc) : `${colPct.toFixed(1)}%`}</div>
                      {parsedBatch > 0 && (
                        <div className="text-[9px] font-bold text-amber-700">
                          sug: {fmtDoc(Math.round((colPct / 100) * parsedBatch))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals per Talle Column Footer */}
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <td className="py-2.5 px-3 text-left font-bold text-slate-900">Total Talle</td>
                {matTalles.map((t) => {
                  const tDoc = matTalleMap[t] || 0;
                  const tPct = matrixTotalDoc > 0 ? (tDoc / matrixTotalDoc) * 100 : 0;
                  const tSug = parsedBatch > 0 ? Math.round((tPct / 100) * parsedBatch) : 0;
                  return (
                    <td key={t} className="py-2.5 px-2 font-mono text-[11px] text-slate-900">
                      <div>{matrixMetric === 'doc' ? fmtDoc(tDoc) : `${tPct.toFixed(1)}%`}</div>
                      {parsedBatch > 0 && (
                        <div className="text-[9px] font-bold text-amber-800">sug: {fmtDoc(tSug)}</div>
                      )}
                    </td>
                  );
                })}
                <td className="py-2.5 px-3 text-right font-mono font-black text-slate-900 bg-slate-200">
                  <div>{matrixMetric === 'doc' ? fmtDoc(matrixTotalDoc) : '100%'}</div>
                  {parsedBatch > 0 && (
                    <div className="text-[9px] font-bold text-amber-900">lote: {fmtDoc(parsedBatch)}</div>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

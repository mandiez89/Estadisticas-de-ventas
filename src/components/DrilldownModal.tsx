import React from 'react';
import { SaleRow, DrilldownTarget } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct, fmtPp, getDelta, talleSort } from '../utils/formatters';
import { X, Calendar, User, Package, MapPin, Tag, ShoppingBag, TrendingUp, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DrilldownModalProps {
  target: DrilldownTarget | null;
  curRows: SaleRow[];
  prevRows: SaleRow[];
  baseRows: SaleRow[];
  periodLabel: string;
  onClose: () => void;
  onOpenDrilldown: (target: DrilldownTarget) => void;
}

export const DrilldownModal: React.FC<DrilldownModalProps> = ({
  target,
  curRows,
  prevRows,
  baseRows,
  periodLabel,
  onClose,
  onOpenDrilldown
}) => {
  if (!target) return null;

  const { type, id } = target;

  // Filter rows for this entity
  const hist = baseRows.filter((r) => {
    if (type === 'art') return r.art === id;
    if (type === 'vend') return r.vend === id;
    return r.cliente === id;
  });

  const cur = curRows.filter((r) => {
    if (type === 'art') return r.art === id;
    if (type === 'vend') return r.vend === id;
    return r.cliente === id;
  });

  const prev = prevRows.filter((r) => {
    if (type === 'art') return r.art === id;
    if (type === 'vend') return r.vend === id;
    return r.cliente === id;
  });

  const curSub = cur.reduce((acc, r) => acc + r.sub, 0);
  const prevSub = prev.reduce((acc, r) => acc + r.sub, 0);
  const curDoc = cur.reduce((acc, r) => acc + r.doc, 0);
  const prevDoc = prev.reduce((acc, r) => acc + r.doc, 0);
  const curNeto = cur.reduce((acc, r) => acc + r.neto, 0);

  const deltaSub = getDelta(curSub, prevSub);
  const deltaDoc = getDelta(curDoc, prevDoc);
  const pxd = curDoc > 0 ? curSub / curDoc : 0;
  const discountRate = curNeto > 0 ? Math.max(0, 1 - curSub / curNeto) : 0;

  // Monthly trend for chart
  const allYears: number[] = Array.from(new Set(hist.map((r) => r.y))).map(Number).sort((a, b) => a - b);
  const maxYear = allYears.length > 0 ? Math.max(...allYears) : 0;
  const mesesNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyChartData = mesesNames.map((mName, mIdx) => {
    const item: Record<string, any> = { month: mName };
    allYears.forEach((y) => {
      const match = hist.filter((r) => r.y === y && r.m === mIdx);
      const val = type === 'art' ? match.reduce((acc, r) => acc + r.doc, 0) : match.reduce((acc, r) => acc + r.sub, 0);
      item[`val_${y}`] = val;
    });
    return item;
  });

  // Client specifics: cross-sell lines
  const allLines = Array.from(new Set(baseRows.map((r) => r.linea))).filter((l) => l && l !== '—');
  const boughtLines = new Set(hist.map((r) => r.linea));
  const missingLines = allLines.filter((l) => !boughtLines.has(l));

  // Vendor specifics: gained/lost
  const curCliSet = new Set(cur.map((r) => r.cliente));
  const prevCliSet = new Set(prev.map((r) => r.cliente));
  const gainedCli = Array.from(curCliSet).filter((c) => !prevCliSet.has(c));
  const lostCli = Array.from(prevCliSet).filter((c) => !curCliSet.has(c));

  // Article specifics: color x talle heatmap
  const colorMap: Record<string, number> = {};
  const talleMap: Record<string, number> = {};
  const cellMap: Record<string, number> = {};
  let maxCell = 0;
  cur.forEach((r) => {
    colorMap[r.color] = (colorMap[r.color] || 0) + r.doc;
    talleMap[r.talle] = (talleMap[r.talle] || 0) + r.doc;
    const k = `${r.color}||${r.talle}`;
    cellMap[k] = (cellMap[k] || 0) + r.doc;
    if (cellMap[k] > maxCell) maxCell = cellMap[k];
  });
  const colorsList = Object.keys(colorMap).sort((a, b) => colorMap[b] - colorMap[a]);
  const tallesList = Object.keys(talleMap).sort(talleSort);

  // Top sub-items
  const getTopBreakdown = (key: 'art' | 'cliente' | 'vend' | 'linea' | 'prov') => {
    const agg: Record<string, { sub: number; doc: number }> = {};
    cur.forEach((r) => {
      const k = r[key] || '—';
      if (!agg[k]) agg[k] = { sub: 0, doc: 0 };
      agg[k].sub += r.sub;
      agg[k].doc += r.doc;
    });
    return Object.entries(agg)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.sub - a.sub)
      .slice(0, 8);
  };

  const topItems = getTopBreakdown(type === 'art' ? 'cliente' : 'art');

  const metaSample = cur[0] || hist[0] || ({} as SaleRow);

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2d]/60 backdrop-blur-xs flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-[#e4e8ef]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#e4e8ef] flex items-center justify-between bg-[#f8fafc]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#206bc4] text-white flex items-center justify-center font-bold">
              {type === 'art' ? <Package className="w-5 h-5" /> : type === 'vend' ? <User className="w-5 h-5" /> : <ShoppingBag className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Ficha de {type === 'art' ? 'Artículo' : type === 'vend' ? 'Vendedor' : 'Cliente'}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  {periodLabel}
                </span>
              </div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">{id}</h2>
              <div className="text-xs text-slate-500 mt-0.5">
                {type === 'art' && `${metaSample.fam || '—'} · ${metaSample.linea || '—'} · ${metaSample.tipo || '—'}`}
                {type === 'vend' && `${curCliSet.size} clientes atendidos`}
                {type === 'cliente' && `Vendedor: ${metaSample.vend || '—'} · ${metaSample.prov || '—'}`}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Facturación</div>
              <div className="text-lg font-bold text-[#206bc4] font-mono mt-0.5">{fmt$M(curSub)}</div>
              <div className="text-xs mt-1">
                <span className={`font-semibold ${deltaSub.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {deltaSub.text}
                </span>
                <span className="text-slate-400 text-[10px] ml-1">vs a.a.</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">Docenas Físicas</div>
              <div className="text-lg font-bold text-[#0f766e] font-mono mt-0.5">{fmtDoc(curDoc)}</div>
              <div className="text-xs mt-1">
                <span className={`font-semibold ${deltaDoc.direction === 'up' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {deltaDoc.text}
                </span>
                <span className="text-slate-400 text-[10px] ml-1">vs a.a.</span>
              </div>
            </div>

            <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">$ / Docena Realizado</div>
              <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{fmt$(pxd)}</div>
              <div className="text-[11px] text-slate-500 mt-1 font-mono">Dto: {fmtPct(discountRate)}</div>
            </div>

            <div className="bg-[#f8fafc] p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500 uppercase">
                {type === 'art' ? 'Clientes Compradores' : 'Artículos Operados'}
              </div>
              <div className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                {type === 'art' ? curCliSet.size : new Set(cur.map((r) => r.art)).size}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">en el período</div>
            </div>
          </div>

          {/* Historical Evolution Chart */}
          <div className="bg-white rounded-xl p-4 border border-[#e4e8ef]">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Evolución Mensual {type === 'art' ? '(Docenas Físicas)' : '(Facturación $)'}
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyChartData} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                  <XAxis dataKey="month" stroke="#8b95a8" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#8b95a8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (type === 'art' ? fmtDoc(v) : fmt$M(v))}
                  />
                  <Tooltip
                    formatter={(v: any, name: string) => [
                      type === 'art' ? `${fmtDoc(v)} dz` : fmt$(v),
                      `Año ${name.replace('val_', '')}`
                    ]}
                    contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '11px' }}
                  />
                  {allYears.map((y) => (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={`val_${y}`}
                      stroke={y === maxYear ? '#206bc4' : '#a35a00'}
                      strokeWidth={y === maxYear ? 2.4 : 1.5}
                      strokeDasharray={y === maxYear ? undefined : '4 4'}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Client Specifics: Cross-Sell Opportunities */}
          {type === 'cliente' && (
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200">
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-700" />
                <span>Oportunidades de Cross-Selling (Líneas que la empresa ofrece y este cliente nunca compró)</span>
              </h3>
              {missingLines.length > 0 ? (
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {missingLines.map((l) => (
                    <span
                      key={l}
                      className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-amber-900 text-xs font-semibold shadow-xs"
                    >
                      + Ofrecer línea {l}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-emerald-700 mt-2 font-medium">
                  Excelente cliente: compra de todas las líneas disponibles de Sasre.
                </p>
              )}
            </div>
          )}

          {/* Vendor Specifics: Gained / Lost */}
          {type === 'vend' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50/50 p-3.5 rounded-xl border border-emerald-200">
                <div className="text-xs font-bold text-emerald-950 mb-1 flex items-center justify-between">
                  <span>Clientes Ganados (+{gainedCli.length})</span>
                  <span className="text-[10px] text-emerald-700 font-normal">Nuevos en el período</span>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {gainedCli.map((c) => (
                    <div
                      key={c}
                      onClick={() => onOpenDrilldown({ type: 'cliente', id: c })}
                      className="text-slate-700 font-medium hover:text-emerald-700 hover:underline cursor-pointer"
                    >
                      • {c}
                    </div>
                  ))}
                  {gainedCli.length === 0 && <div className="text-slate-400 text-xs">Sin clientes ganados</div>}
                </div>
              </div>

              <div className="bg-rose-50/50 p-3.5 rounded-xl border border-rose-200">
                <div className="text-xs font-bold text-rose-950 mb-1 flex items-center justify-between">
                  <span>Clientes Perdidos (-{lostCli.length})</span>
                  <span className="text-[10px] text-rose-700 font-normal">No compraron en este período</span>
                </div>
                <div className="max-h-32 overflow-y-auto text-xs space-y-1">
                  {lostCli.map((c) => (
                    <div
                      key={c}
                      onClick={() => onOpenDrilldown({ type: 'cliente', id: c })}
                      className="text-slate-700 font-medium hover:text-rose-700 hover:underline cursor-pointer"
                    >
                      • {c}
                    </div>
                  ))}
                  {lostCli.length === 0 && <div className="text-slate-400 text-xs">Sin clientes perdidos</div>}
                </div>
              </div>
            </div>
          )}

          {/* Article Specifics: Heatmap Color x Talle */}
          {type === 'art' && colorsList.length > 0 && (
            <div className="bg-white p-4 rounded-xl border border-[#e4e8ef]">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Mix Color × Talle de este Artículo (Docenas)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-center border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <th className="py-2 px-3 text-left">Color</th>
                      {tallesList.map((t) => (
                        <th key={t} className="py-2 px-2">
                          {t}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {colorsList.map((col) => (
                      <tr key={col} className="border-b border-slate-100">
                        <td className="py-1.5 px-3 text-left font-semibold text-slate-800">{col}</td>
                        {tallesList.map((tal) => {
                          const v = cellMap[`${col}||${tal}`] || 0;
                          return (
                            <td
                              key={tal}
                              className={`py-1.5 px-2 font-mono text-[11px] ${
                                v > 0 ? 'bg-blue-100/70 font-semibold text-blue-900' : 'text-slate-300'
                              }`}
                            >
                              {v > 0 ? fmtDoc(v) : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Breakdown Table */}
          <div className="bg-white rounded-xl border border-[#e4e8ef] overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-800">
              Top {type === 'art' ? 'Clientes Compradores' : 'Artículos Facturados'}
            </div>
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2 px-4">Nombre</th>
                  <th className="py-2 px-3 text-right">Facturación</th>
                  <th className="py-2 px-3 text-right">Docenas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topItems.map((item) => (
                  <tr key={item.name} className="hover:bg-slate-50">
                    <td className="py-2 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-2 px-3 text-right font-mono text-[#206bc4] font-semibold">
                      {fmt$M(item.sub)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-slate-700">{fmtDoc(item.doc)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

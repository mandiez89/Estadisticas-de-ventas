import React, { useState } from 'react';
import { KPIResults, CommercialAlerts } from '../utils/analytics';
import { fmt$, fmt$M, fmtDoc, fmtPct, getDelta } from '../utils/formatters';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  Package,
  Layers,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { SaleRow, DrilldownTarget } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart
} from 'recharts';

interface ExecutiveSummaryProps {
  kpis: KPIResults;
  alerts: CommercialAlerts;
  curRows: SaleRow[];
  prevRows: SaleRow[];
  baseRows: SaleRow[];
  year: number;
  month: number;
  periodLabel: string;
  prevPeriodLabel: string;
  primaryMetric: 'sub' | 'doc';
  onOpenDrilldown: (target: DrilldownTarget) => void;
}

export const ExecutiveSummary: React.FC<ExecutiveSummaryProps> = ({
  kpis,
  alerts,
  curRows,
  prevRows,
  baseRows,
  year,
  month,
  periodLabel,
  prevPeriodLabel,
  primaryMetric,
  onOpenDrilldown
}) => {
  const [paretoDim, setParetoDim] = useState<'cliente' | 'art' | 'vend'>('cliente');
  const [evolMetric, setEvolMetric] = useState<'sub' | 'doc'>('sub');

  // Sparkline SVG generator
  const renderSparkline = (values: number[], color: string) => {
    if (!values || values.length === 0) return null;
    const w = 110;
    const h = 28;
    const max = Math.max(...values, 0);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = (i / (values.length - 1 || 1)) * (w - 6) + 3;
      const y = h - 3 - ((v - min) / range) * (h - 6);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    const d = pts.join(' L ');
    const lastX = pts[pts.length - 1].split(',')[0];
    const lastY = pts[pts.length - 1].split(',')[1];

    return (
      <svg width={w} height={h} className="overflow-visible">
        <path d={`M ${d}`} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      </svg>
    );
  };

  // Deltas
  const deltaSub = getDelta(kpis.curSub, kpis.prevSub);
  const deltaDoc = getDelta(kpis.curDoc, kpis.prevDoc);
  const deltaPrice = getDelta(kpis.curPricePerDoc, kpis.prevPricePerDoc);
  const deltaClients = getDelta(kpis.curClientsCount, kpis.prevClientsCount);
  const deltaSubPerClient = getDelta(kpis.curSubPerClient, kpis.prevSubPerClient);
  const deltaNeto = getDelta(kpis.curNeto, kpis.prevNeto);

  // Evolución mensual multi-año
  const allYears = Array.from(new Set(baseRows.map((r) => r.y))).sort();
  const mesesNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlyData = mesesNames.map((mName, mIdx) => {
    const item: Record<string, any> = { month: mName };
    allYears.forEach((y) => {
      const matching = baseRows.filter((r) => r.y === y && r.m === mIdx);
      const val = evolMetric === 'sub' ? matching.reduce((acc, r) => acc + r.sub, 0) : matching.reduce((acc, r) => acc + r.doc, 0);
      item[`val_${y}`] = val;
    });
    return item;
  });

  // YTD acumulado
  const ytdData = mesesNames.map((mName, mIdx) => {
    const item: Record<string, any> = { month: mName };
    allYears.forEach((y) => {
      // If current year and month is after selected month, can still show or cap
      const matching = baseRows.filter((r) => r.y === y && r.m <= mIdx);
      const val = matching.reduce((acc, r) => acc + r.sub, 0);
      item[`ytd_${y}`] = val;
    });
    return item;
  });

  // Precio promedio por docena mensual
  const priceData = mesesNames.map((mName, mIdx) => {
    const item: Record<string, any> = { month: mName };
    allYears.forEach((y) => {
      const matching = baseRows.filter((r) => r.y === y && r.m === mIdx);
      const sub = matching.reduce((acc, r) => acc + r.sub, 0);
      const doc = matching.reduce((acc, r) => acc + r.doc, 0);
      item[`price_${y}`] = doc > 0 ? Math.round(sub / doc) : null;
    });
    return item;
  });

  // Pareto 80/20 data
  const paretoAgg: Record<string, number> = {};
  curRows.forEach((r) => {
    const key = paretoDim === 'cliente' ? r.cliente : paretoDim === 'art' ? r.art : r.vend;
    paretoAgg[key] = (paretoAgg[key] || 0) + r.sub;
  });
  const paretoSorted = Object.entries(paretoAgg).sort((a, b) => b[1] - a[1]);
  const totalPareto = paretoSorted.reduce((acc, [_, v]) => acc + v, 0) || 1;

  let cum = 0;
  const paretoChartData = paretoSorted.slice(0, 25).map(([key, val]) => {
    cum += val;
    return {
      name: key.length > 15 ? key.slice(0, 14) + '…' : key,
      fullName: key,
      val,
      cumPct: Math.round((cum / totalPareto) * 100)
    };
  });

  const pareto80Count = paretoChartData.filter((d) => d.cumPct <= 80).length + 1;

  return (
    <div className="space-y-6">
      {/* Top Strategic KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
        {/* Facturación */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">Facturación Real</div>
            <div className="text-2xl font-bold text-[#141b2d] mt-1 font-mono tracking-tight">{fmt$M(kpis.curSub)}</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5 font-mono">{fmt$(kpis.curSub)}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deltaSub.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : deltaSub.direction === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deltaSub.text}
            </span>
            {renderSparkline(kpis.sparklineSub, '#206bc4')}
          </div>
        </div>

        {/* Volumen Físico en Docenas */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">Volumen Físico</div>
            <div className="text-2xl font-bold text-[#0f766e] mt-1 font-mono tracking-tight">{fmtDoc(kpis.curDoc)} dz</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5 font-mono">
              {Math.round(kpis.curDoc * 12).toLocaleString('es-AR')} unidades
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deltaDoc.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : deltaDoc.direction === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deltaDoc.text}
            </span>
            {renderSparkline(kpis.sparklineDoc, '#0f766e')}
          </div>
        </div>

        {/* Precio Promedio por Docena */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">$ / Docena Realizado</div>
            <div className="text-2xl font-bold text-[#a35a00] mt-1 font-mono tracking-tight">{fmt$(kpis.curPricePerDoc)}</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5">Efecto precio vs volumen</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deltaPrice.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : deltaPrice.direction === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deltaPrice.text}
            </span>
            {renderSparkline(kpis.sparklinePrice, '#a35a00')}
          </div>
        </div>

        {/* Descuento Comercial Promedio */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">Descuento Comercial</div>
            <div className="text-2xl font-bold text-slate-800 mt-1 font-mono tracking-tight">{fmtPct(kpis.curDiscountPct)}</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5">Neto: {fmt$M(kpis.curNeto)}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">Margen concedido</span>
            <span className="text-xs font-mono text-slate-600 font-semibold">{fmt$M(kpis.curNeto - kpis.curSub)} dto</span>
          </div>
        </div>

        {/* Clientes Activos */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">Clientes con Compra</div>
            <div className="text-2xl font-bold text-[#141b2d] mt-1 font-mono tracking-tight">{kpis.curClientsCount}</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5">{kpis.curTransactionsCount.toLocaleString('es-AR')} pedidos</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deltaClients.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : deltaClients.direction === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deltaClients.text}
            </span>
            <span className="text-xs text-slate-400 font-mono">vs a.a.</span>
          </div>
        </div>

        {/* Ticket Promedio por Cliente */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">Fact. / Cliente</div>
            <div className="text-2xl font-bold text-[#141b2d] mt-1 font-mono tracking-tight">{fmt$M(kpis.curSubPerClient)}</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5 font-mono">{fmt$(kpis.curSubPerClient)}</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                deltaSubPerClient.direction === 'up'
                  ? 'bg-emerald-50 text-emerald-700'
                  : deltaSubPerClient.direction === 'down'
                  ? 'bg-rose-50 text-rose-700'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {deltaSubPerClient.text}
            </span>
            <span className="text-xs text-slate-400 font-mono">promedio</span>
          </div>
        </div>

        {/* Concentración Top 5 */}
        <div className="bg-white rounded-xl p-4 border border-[#e4e8ef] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#5b6478] uppercase tracking-wider">Concentración Top 5</div>
            <div className="text-2xl font-bold text-[#475569] mt-1 font-mono tracking-tight">{fmtPct(kpis.curTop5Concentration)}</div>
            <div className="text-[11px] text-[#8b95a8] mt-0.5">Riesgo en 5 cuentas</div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                kpis.curTop5Concentration > 0.5 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {kpis.curTop5Concentration > 0.5 ? 'Alta dependencia' : 'Diversificado'}
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              prev {fmtPct(kpis.prevTop5Concentration)}
            </span>
          </div>
        </div>
      </div>

      {/* Actionable Alerts ("Requiere Atención") */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <h2 className="text-xs font-bold text-[#5b6478] uppercase tracking-wider">Alertas Comerciales Accionables</h2>
          <div className="flex-1 h-px bg-[#e4e8ef]"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Lost Clients */}
          <div className="bg-white rounded-xl p-4 border border-rose-200 border-l-4 border-l-rose-500 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Clientes Perdidos</h3>
                <span className="text-lg font-bold text-rose-600 font-mono">{alerts.lostClients.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Compraron en {prevPeriodLabel} y 0 en {periodLabel}</p>
              <ul className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                {alerts.lostClients.slice(0, 3).map((c, i) => (
                  <li
                    key={i}
                    onClick={() => onOpenDrilldown({ type: 'cliente', id: c.name })}
                    className="flex items-center justify-between cursor-pointer hover:bg-rose-50/70 p-1 rounded transition"
                  >
                    <span className="truncate font-medium text-slate-700 max-w-[120px]">{c.name}</span>
                    <span className="font-mono text-[11px] text-rose-600 font-semibold">{fmt$M(c.prevSub)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {alerts.lostClients.length > 3 && (
              <div className="text-[11px] text-slate-400 mt-2 text-right">
                +{alerts.lostClients.length - 3} clientes más
              </div>
            )}
          </div>

          {/* Dropping Clients */}
          <div className="bg-white rounded-xl p-4 border border-amber-200 border-l-4 border-l-amber-500 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Clientes en Caída</h3>
                <span className="text-lg font-bold text-amber-600 font-mono">{alerts.droppingClients.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Bajaron más del 30% vs mismo período a.a.</p>
              <ul className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                {alerts.droppingClients.slice(0, 3).map((c, i) => (
                  <li
                    key={i}
                    onClick={() => onOpenDrilldown({ type: 'cliente', id: c.name })}
                    className="flex items-center justify-between cursor-pointer hover:bg-amber-50/70 p-1 rounded transition"
                  >
                    <span className="truncate font-medium text-slate-700 max-w-[120px]">{c.name}</span>
                    <span className="font-mono text-[11px] text-amber-700 font-semibold">
                      {fmtPct(c.dropPct)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            {alerts.droppingClients.length > 3 && (
              <div className="text-[11px] text-slate-400 mt-2 text-right">
                +{alerts.droppingClients.length - 3} clientes más
              </div>
            )}
          </div>

          {/* New Clients */}
          <div className="bg-white rounded-xl p-4 border border-emerald-200 border-l-4 border-l-emerald-500 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Clientes Nuevos</h3>
                <span className="text-lg font-bold text-emerald-600 font-mono">{alerts.newClients.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Compraron ahora sin historial en el período previo</p>
              <ul className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                {alerts.newClients.slice(0, 3).map((c, i) => (
                  <li
                    key={i}
                    onClick={() => onOpenDrilldown({ type: 'cliente', id: c.name })}
                    className="flex items-center justify-between cursor-pointer hover:bg-emerald-50/70 p-1 rounded transition"
                  >
                    <span className="truncate font-medium text-slate-700 max-w-[120px]">{c.name}</span>
                    <span className="font-mono text-[11px] text-emerald-600 font-semibold">{fmt$M(c.curSub)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {alerts.newClients.length > 3 && (
              <div className="text-[11px] text-slate-400 mt-2 text-right">
                +{alerts.newClients.length - 3} clientes más
              </div>
            )}
          </div>

          {/* Stalled Articles */}
          <div className="bg-white rounded-xl p-4 border border-purple-200 border-l-4 border-l-purple-500 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Artículos Frenados</h3>
                <span className="text-lg font-bold text-purple-600 font-mono">{alerts.stalledArticles.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Caída &gt; 30% en volumen de docenas vs a.a.</p>
              <ul className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                {alerts.stalledArticles.slice(0, 3).map((a, i) => (
                  <li
                    key={i}
                    onClick={() => onOpenDrilldown({ type: 'art', id: a.name })}
                    className="flex items-center justify-between cursor-pointer hover:bg-purple-50/70 p-1 rounded transition"
                  >
                    <span className="truncate font-medium text-slate-700 max-w-[120px]">{a.name}</span>
                    <span className="font-mono text-[11px] text-purple-700 font-semibold">{fmtPct(a.dropPct)}</span>
                  </li>
                ))}
              </ul>
            </div>
            {alerts.stalledArticles.length > 3 && (
              <div className="text-[11px] text-slate-400 mt-2 text-right">
                +{alerts.stalledArticles.length - 3} artículos más
              </div>
            )}
          </div>

          {/* Dormant Clients */}
          <div className="bg-white rounded-xl p-4 border border-slate-200 border-l-4 border-l-slate-500 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800">Clientes Dormidos</h3>
                <span className="text-lg font-bold text-slate-700 font-mono">{alerts.dormantClients.length}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Más de 365 días sin comprar en todo el historial</p>
              <ul className="mt-2.5 space-y-1.5 border-t border-slate-100 pt-2 text-xs">
                {alerts.dormantClients.slice(0, 3).map((c, i) => (
                  <li
                    key={i}
                    onClick={() => onOpenDrilldown({ type: 'cliente', id: c.name })}
                    className="flex items-center justify-between cursor-pointer hover:bg-slate-100 p-1 rounded transition"
                  >
                    <span className="truncate font-medium text-slate-700 max-w-[120px]">{c.name}</span>
                    <span className="font-mono text-[11px] text-slate-500">{c.daysDormant}d</span>
                  </li>
                ))}
              </ul>
            </div>
            {alerts.dormantClients.length > 3 && (
              <div className="text-[11px] text-slate-400 mt-2 text-right">
                +{alerts.dormantClients.length - 3} clientes más
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Evolution Chart */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#141b2d]">Evolución Mensual Interanual</h3>
              <p className="text-xs text-[#5b6478] mt-0.5">
                Comparación mes a mes contra años anteriores (líneas punteadas)
              </p>
            </div>
            <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg text-xs font-semibold">
              <button
                onClick={() => setEvolMetric('sub')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  evolMetric === 'sub' ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                }`}
              >
                Facturación ($)
              </button>
              <button
                onClick={() => setEvolMetric('doc')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                  evolMetric === 'doc' ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                }`}
              >
                Docenas (Físico)
              </button>
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis dataKey="month" stroke="#8b95a8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8b95a8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (evolMetric === 'sub' ? fmt$M(v) : fmtDoc(v))}
                />
                <Tooltip
                  formatter={(val: any, name: string) => {
                    const y = name.replace('val_', '');
                    return [evolMetric === 'sub' ? fmt$(val) : `${fmtDoc(val)} dz`, `Año ${y}`];
                  }}
                  contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                {allYears.map((y, idx) => {
                  const isCurrent = y === year;
                  const isPrev = y === year - 1;
                  const strokeColor = isCurrent ? '#206bc4' : isPrev ? '#a35a00' : '#94a3b8';
                  return (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={`val_${y}`}
                      stroke={strokeColor}
                      strokeWidth={isCurrent ? 2.6 : 1.6}
                      strokeDasharray={isCurrent ? undefined : '5 4'}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* YTD Acumulado */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#141b2d]">Ritmo de Facturación Acumulada (YTD)</h3>
              <p className="text-xs text-[#5b6478] mt-0.5">Suma acumulada desde enero hasta diciembre</p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
              Curva Año contra Año
            </span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ytdData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis dataKey="month" stroke="#8b95a8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8b95a8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmt$M(v)}
                />
                <Tooltip
                  formatter={(val: any, name: string) => {
                    const y = name.replace('ytd_', '');
                    return [fmt$(val), `Acumulado ${y}`];
                  }}
                  contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                {allYears.map((y) => {
                  const isCurrent = y === year;
                  const isPrev = y === year - 1;
                  const strokeColor = isCurrent ? '#206bc4' : isPrev ? '#a35a00' : '#cbd5e1';
                  return (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={`ytd_${y}`}
                      stroke={strokeColor}
                      strokeWidth={isCurrent ? 2.6 : 1.6}
                      strokeDasharray={isCurrent ? undefined : '5 4'}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Precio Promedio por Docena ($/dz) */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-[#141b2d]">Precio Promedio Realizado ($ / Docena)</h3>
              <p className="text-xs text-[#5b6478] mt-0.5">
                Facturación neta ÷ docenas entregadas por mes
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800">
              Efecto Precio Real
            </span>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ top: 10, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis dataKey="month" stroke="#8b95a8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#8b95a8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmt$M(v)}
                />
                <Tooltip
                  formatter={(val: any, name: string) => {
                    const y = name.replace('price_', '');
                    return [val ? `${fmt$(val)} / dz` : 's/d', `Precio ${y}`];
                  }}
                  contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                {allYears.map((y) => {
                  const isCurrent = y === year;
                  const isPrev = y === year - 1;
                  const strokeColor = isCurrent ? '#a35a00' : isPrev ? '#475569' : '#cbd5e1';
                  return (
                    <Line
                      key={y}
                      type="monotone"
                      dataKey={`price_${y}`}
                      stroke={strokeColor}
                      strokeWidth={isCurrent ? 2.4 : 1.5}
                      strokeDasharray={isCurrent ? undefined : '5 4'}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Concentración Pareto 80/20 */}
        <div className="bg-white rounded-xl p-5 border border-[#e4e8ef] shadow-xs">
          <div className="flex items-center justify-between gap-4 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#141b2d]">Concentración Pareto (Regla 80/20)</h3>
              <p className="text-xs text-[#5b6478] mt-0.5">
                <strong className="text-[#206bc4]">{pareto80Count}</strong> cuentas explican el 80% de la facturación
              </p>
            </div>
            <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg text-xs font-semibold">
              {(['cliente', 'art', 'vend'] as const).map((dim) => (
                <button
                  key={dim}
                  onClick={() => setParetoDim(dim)}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    paretoDim === dim ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478]'
                  }`}
                >
                  {dim === 'cliente' ? 'Clientes' : dim === 'art' ? 'Artículos' : 'Vendedores'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={paretoChartData} margin={{ top: 10, right: 20, left: 10, bottom: 35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#8b95a8"
                  fontSize={10}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  yAxisId="left"
                  stroke="#8b95a8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => fmt$M(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#a35a00"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(val: any, name: string) => [
                    name === 'cumPct' ? `${val}% acumulado` : fmt$(val),
                    name === 'cumPct' ? 'Acumulado' : 'Facturación'
                  ]}
                  contentStyle={{ backgroundColor: '#141b2d', color: '#fff', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar yAxisId="left" dataKey="val" fill="#206bc4" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="cumPct"
                  stroke="#a35a00"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#a35a00' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

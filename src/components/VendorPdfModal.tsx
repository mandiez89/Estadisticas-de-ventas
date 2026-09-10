import React from 'react';
import { SaleRow } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct, getDelta } from '../utils/formatters';
import { Printer, X, Award, AlertTriangle, TrendingUp, Users, Package } from 'lucide-react';

interface VendorPdfModalProps {
  vendor: string;
  isOpen: boolean;
  onClose: () => void;
  curRows: SaleRow[];
  prevRows: SaleRow[];
  baseRows: SaleRow[];
  periodLabel: string;
  prevPeriodLabel: string;
}

export const VendorPdfModal: React.FC<VendorPdfModalProps> = ({
  vendor,
  isOpen,
  onClose,
  curRows,
  prevRows,
  baseRows,
  periodLabel,
  prevPeriodLabel
}) => {
  if (!isOpen || !vendor) return null;

  // Filter vendor rows
  const vCurRows = curRows.filter((r) => r.vend === vendor);
  const vPrevRows = prevRows.filter((r) => r.vend === vendor);

  // Inactive clients set
  const inactiveClients = new Set<string>();
  baseRows.forEach((r) => {
    if (r.inactivo) inactiveClients.add(r.cliente);
  });
  prevRows.forEach((r) => {
    if (r.inactivo) inactiveClients.add(r.cliente);
  });

  // KPIs
  const curSub = vCurRows.reduce((a, b) => a + b.sub, 0);
  const prevSub = vPrevRows.reduce((a, b) => a + b.sub, 0);
  const deltaSub = getDelta(curSub, prevSub);

  const curDoc = vCurRows.reduce((a, b) => a + b.doc, 0);
  const prevDoc = vPrevRows.reduce((a, b) => a + b.doc, 0);
  const deltaDoc = getDelta(curDoc, prevDoc);

  const curPricePerDoc = curDoc > 0 ? curSub / curDoc : 0;
  const prevPricePerDoc = prevDoc > 0 ? prevSub / prevDoc : 0;
  const deltaPrice = getDelta(curPricePerDoc, prevPricePerDoc);

  // Clients
  const curClients = new Set<string>();
  vCurRows.forEach((r) => curClients.add(r.cliente));

  const prevClients = new Set<string>();
  vPrevRows.forEach((r) => prevClients.add(r.cliente));

  const gainedClients: string[] = [];
  curClients.forEach((c) => {
    if (!prevClients.has(c)) gainedClients.push(c);
  });

  const lostClients: string[] = [];
  prevClients.forEach((c) => {
    if (!curClients.has(c) && !inactiveClients.has(c)) lostClients.push(c);
  });

  // Top Articles
  const artMap: Record<string, { doc: number; sub: number; fam: string }> = {};
  vCurRows.forEach((r) => {
    if (!artMap[r.art]) artMap[r.art] = { doc: 0, sub: 0, fam: r.fam || '—' };
    artMap[r.art].doc += r.doc;
    artMap[r.art].sub += r.sub;
  });
  const topArticles = Object.entries(artMap)
    .sort((a, b) => b[1].sub - a[1].sub)
    .slice(0, 5)
    .map(([art, d]) => ({
      art,
      fam: d.fam,
      doc: d.doc,
      sub: d.sub,
      share: curSub > 0 ? (d.sub / curSub) * 100 : 0
    }));

  // Mix by Line: Vendor vs Total Company
  const totalCompanySub = curRows.reduce((a, b) => a + b.sub, 0) || 1;
  const companyLineMap: Record<string, number> = {};
  curRows.forEach((r) => {
    const l = r.linea || 'Otras';
    companyLineMap[l] = (companyLineMap[l] || 0) + r.sub;
  });

  const vendorLineMap: Record<string, number> = {};
  vCurRows.forEach((r) => {
    const l = r.linea || 'Otras';
    vendorLineMap[l] = (vendorLineMap[l] || 0) + r.sub;
  });

  const allLines = Array.from(new Set([...Object.keys(companyLineMap), ...Object.keys(vendorLineMap)])).sort();
  const lineMix = allLines
    .map((l) => {
      const vSub = vendorLineMap[l] || 0;
      const cSub = companyLineMap[l] || 0;
      const vPct = curSub > 0 ? (vSub / curSub) * 100 : 0;
      const cPct = (cSub / totalCompanySub) * 100;
      const gap = vPct - cPct;
      return {
        linea: l,
        vSub,
        vPct: Number(vPct.toFixed(1)),
        cPct: Number(cPct.toFixed(1)),
        gap: Number(gap.toFixed(1))
      };
    })
    .sort((a, b) => b.vSub - a.vSub)
    .slice(0, 5);

  // Early warning at-risk clients for this vendor
  const vendorBaseRows = baseRows.filter((r) => r.vend === vendor);
  let maxTs = 0;
  baseRows.forEach((r) => {
    if (r.ts > maxTs) maxTs = r.ts;
  });

  const clientDates: Record<string, { dates: Set<number>; sub: number }> = {};
  vendorBaseRows.forEach((r) => {
    if (!clientDates[r.cliente]) clientDates[r.cliente] = { dates: new Set(), sub: 0 };
    const dayTs = Math.floor(r.ts / 86400000) * 86400000;
    clientDates[r.cliente].dates.add(dayTs);
    clientDates[r.cliente].sub += r.sub;
  });

  const atRiskForVendor: { name: string; daysSinceLast: number; overdue: number }[] = [];
  Object.entries(clientDates).forEach(([cName, info]) => {
    if (curClients.has(cName) || inactiveClients.has(cName)) return;
    const sorted = Array.from(info.dates).sort((a, b) => a - b);
    if (sorted.length >= 2) {
      let intervalSum = 0;
      for (let i = 1; i < sorted.length; i++) {
        intervalSum += (sorted[i] - sorted[i - 1]) / 86400000;
      }
      const cadence = Math.max(14, Math.round(intervalSum / (sorted.length - 1)));
      const lastTs = sorted[sorted.length - 1];
      const daysSinceLast = Math.floor((maxTs - lastTs) / 86400000);
      if (daysSinceLast > cadence * 1.35 && daysSinceLast < 365) {
        atRiskForVendor.push({
          name: cName,
          daysSinceLast,
          overdue: daysSinceLast - cadence
        });
      }
    }
  });
  atRiskForVendor.sort((a, b) => b.overdue - a.overdue);

  const handlePrint = () => {
    window.print();
  };

  const currentDateStr = new Date().toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      {/* Container Box */}
      <div className="bg-white rounded-2xl shadow-2xl max-w-[850px] w-full overflow-hidden border border-slate-200 print:border-none print:shadow-none print:max-w-full">
        {/* Action Header - Hidden when printing */}
        <div className="no-print bg-[#141b2d] text-white px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold tracking-wide">Ficha Ejecutiva de Desempeño Comercial (1 Página)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#206bc4] hover:bg-blue-600 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir / Guardar como PDF</span>
            </button>
            <button
              onClick={onClose}
              type="button"
              className="p-1 text-slate-300 hover:text-white rounded-md transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet (Targeted by #vendor-pdf-sheet in index.css) */}
        <div id="vendor-pdf-sheet" className="p-8 bg-white text-slate-800 text-[11px] leading-relaxed">
          {/* Header Title & Meta */}
          <div className="border-b-2 border-[#141b2d] pb-4 mb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-widest text-[#206bc4] uppercase">SASRE</span>
                <span className="text-slate-300 font-bold">|</span>
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">Gestión Comercial</span>
              </div>
              <h1 className="text-xl font-black text-[#141b2d] mt-1 tracking-tight">
                INFORME DE DESEMPEÑO INDIVIDUAL
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Vendedor: <span className="text-slate-900 font-bold text-sm">{vendor}</span>
              </p>
            </div>
            <div className="text-right">
              <div className="inline-block bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded border border-slate-200 uppercase">
                Período: {periodLabel}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Comparado vs: {prevPeriodLabel}</p>
              <p className="text-[10px] text-slate-400">Emisión: {currentDateStr}</p>
            </div>
          </div>

          {/* KPI 4-Card Summary Strip */}
          <div className="grid grid-cols-4 gap-2.5 mb-4">
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Facturación Neta</span>
              <span className="text-base font-bold font-mono text-[#141b2d] block mt-0.5">{fmt$(curSub)}</span>
              <span
                className={`text-[10px] font-mono font-semibold ${
                  deltaSub.direction === 'up'
                    ? 'text-emerald-700'
                    : deltaSub.direction === 'down'
                    ? 'text-rose-700'
                    : 'text-slate-500'
                }`}
              >
                {deltaSub.text} vs a.a.
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Volumen Físico</span>
              <span className="text-base font-bold font-mono text-[#141b2d] block mt-0.5">{fmtDoc(curDoc)} dz</span>
              <span
                className={`text-[10px] font-mono font-semibold ${
                  deltaDoc.direction === 'up'
                    ? 'text-emerald-700'
                    : deltaDoc.direction === 'down'
                    ? 'text-rose-700'
                    : 'text-slate-500'
                }`}
              >
                {deltaDoc.text} vs a.a.
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Clientes Atendidos</span>
              <div className="flex items-baseline gap-1.5 mt-0.5">
                <span className="text-base font-bold font-mono text-[#141b2d]">{curClients.size}</span>
                <span className="text-[10px] text-slate-500">activos</span>
              </div>
              <span className="text-[10px] text-emerald-700 font-semibold">
                +{gainedClients.length} altas / -{lostClients.length} bajas
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-[10px] font-semibold text-slate-500 uppercase block">Precio Medio / Docena</span>
              <span className="text-base font-bold font-mono text-[#141b2d] block mt-0.5">{fmt$(curPricePerDoc)}</span>
              <span
                className={`text-[10px] font-mono font-semibold ${
                  deltaPrice.direction === 'up'
                    ? 'text-emerald-700'
                    : deltaPrice.direction === 'down'
                    ? 'text-rose-700'
                    : 'text-slate-500'
                }`}
              >
                {deltaPrice.text} vs a.a.
              </span>
            </div>
          </div>

          {/* 2-Column Section: Top Articles & Mix Participation */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Top 5 Articles */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#206bc4]" />
                  Top 5 Artículos Más Vendidos
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Por Facturación</span>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[9px] text-slate-500 uppercase border-b border-slate-200">
                    <th className="py-1">Artículo</th>
                    <th className="py-1 text-right">Docenas</th>
                    <th className="py-1 text-right">Subtotal</th>
                    <th className="py-1 text-right">% Vdor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-[10px]">
                  {topArticles.map((a) => (
                    <tr key={a.art}>
                      <td className="py-1 text-slate-800 font-semibold">
                        {a.art} <span className="text-slate-400 font-normal">({a.fam})</span>
                      </td>
                      <td className="py-1 text-right font-mono text-slate-600">{fmtDoc(a.doc)}</td>
                      <td className="py-1 text-right font-mono font-bold text-slate-900">{fmt$M(a.sub)}</td>
                      <td className="py-1 text-right font-mono text-[#206bc4] font-semibold">{a.share.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {topArticles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-3 text-center text-slate-400">
                        Sin operaciones registradas en el período
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Line Mix Comparison */}
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  Mix por Línea vs Promedio Empresa
                </h3>
                <span className="text-[10px] text-slate-400 font-medium">Oportunidades</span>
              </div>
              <div className="space-y-2">
                {lineMix.map((l) => (
                  <div key={l.linea} className="text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate max-w-[140px]">{l.linea}</span>
                      <span className="font-mono">
                        <span className="text-[#206bc4] font-bold">{l.vPct}%</span>
                        <span className="text-slate-400 mx-1">vs</span>
                        <span className="text-slate-600 font-medium">{l.cPct}%</span>
                        <span
                          className={`ml-1.5 px-1 py-0.2 rounded font-bold ${
                            l.gap >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
                          }`}
                        >
                          {l.gap >= 0 ? `+${l.gap}` : l.gap} pp
                        </span>
                      </span>
                    </div>
                    {/* Visual Comparison Bar */}
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1 flex">
                      <div className="bg-[#206bc4] h-full" style={{ width: `${Math.min(100, l.vPct * 2)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Attention Accounts: Early Warning Re-purchase + Churned Accounts */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Early Warning At Risk */}
            <div className="border border-amber-200 bg-amber-50/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-amber-200">
                <h3 className="font-bold text-amber-900 text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Alerta Temprana de Recompra ({atRiskForVendor.length})
                </h3>
                <span className="text-[9px] text-amber-700 font-semibold">Desvío de ciclo</span>
              </div>
              <p className="text-[9px] text-slate-500 mb-1.5">
                Clientes que superaron su intervalo habitual de compra y no registraron pedido este período:
              </p>
              <ul className="space-y-1 text-[10px]">
                {atRiskForVendor.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-slate-800">
                    <span className="truncate max-w-[170px] font-medium">{c.name}</span>
                    <span className="font-mono text-amber-800 font-semibold">+{c.overdue} días tarde</span>
                  </li>
                ))}
                {atRiskForVendor.length === 0 && (
                  <li className="text-slate-400 text-[10px]">Todos los clientes regulares están al día.</li>
                )}
              </ul>
            </div>

            {/* Churned Accounts (Lost Clients) */}
            <div className="border border-rose-200 bg-rose-50/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-rose-200">
                <h3 className="font-bold text-rose-900 text-xs flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-rose-600" />
                  Clientes Sin Compra vs a.a. ({lostClients.length})
                </h3>
                <span className="text-[9px] text-rose-700 font-semibold">Recuperar</span>
              </div>
              <p className="text-[9px] text-slate-500 mb-1.5">
                Cuentas activas que compraron en {prevPeriodLabel} y aún no registran pedidos (inactivos excluidos):
              </p>
              <ul className="space-y-1 text-[10px]">
                {lostClients.slice(0, 3).map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-slate-800">
                    <span className="truncate max-w-[170px] font-medium">{c}</span>
                    <span className="text-rose-600 font-bold text-[9px] uppercase">Plan Contacto</span>
                  </li>
                ))}
                {lostClients.length === 0 && (
                  <li className="text-slate-400 text-[10px]">Sin cuentas activas perdidas en el período.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Feedback & Action Plan Signature Area */}
          <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <h4 className="text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1">
              Compromisos Comerciales y Observaciones del Mes
            </h4>
            <div className="h-12 border-b border-dashed border-slate-300"></div>

            <div className="grid grid-cols-2 gap-8 mt-5 pt-2 text-[10px] text-slate-600">
              <div className="text-center">
                <div className="border-t border-slate-400 w-40 mx-auto pt-1 font-semibold text-slate-800">
                  {vendor}
                </div>
                <span className="text-[9px] text-slate-400">Firma Vendedor</span>
              </div>
              <div className="text-center">
                <div className="border-t border-slate-400 w-40 mx-auto pt-1 font-semibold text-slate-800">
                  Gerencia Comercial Sasre
                </div>
                <span className="text-[9px] text-slate-400">Firma y Sello</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

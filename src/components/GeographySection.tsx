import React, { useState } from 'react';
import { SaleRow, DrilldownTarget } from '../types';
import { fmt$, fmt$M, fmtDoc, fmtPct } from '../utils/formatters';
import { MapPin, ChevronRight, ChevronDown, Building, User } from 'lucide-react';

interface GeographySectionProps {
  curRows: SaleRow[];
  periodLabel: string;
  onOpenDrilldown: (target: DrilldownTarget) => void;
}

export const GeographySection: React.FC<GeographySectionProps> = ({
  curRows,
  periodLabel,
  onOpenDrilldown
}) => {
  const [openProvinces, setOpenProvinces] = useState<Set<string>>(new Set());
  const [openLocalities, setOpenLocalities] = useState<Set<string>>(new Set());

  const curTotalSub = curRows.reduce((acc, r) => acc + r.sub, 0) || 1;

  // Build tree: Province -> Locality -> Client
  const provMap: Record<
    string,
    {
      sub: number;
      doc: number;
      clients: Set<string>;
      localities: Record<
        string,
        {
          sub: number;
          doc: number;
          clients: Record<string, { sub: number; doc: number }>;
        }
      >;
    }
  > = {};

  curRows.forEach((r) => {
    const p = r.prov || '(sin provincia)';
    const l = r.loc || '(sin localidad)';
    const c = r.cliente;

    if (!provMap[p]) {
      provMap[p] = { sub: 0, doc: 0, clients: new Set(), localities: {} };
    }
    provMap[p].sub += r.sub;
    provMap[p].doc += r.doc;
    provMap[p].clients.add(c);

    if (!provMap[p].localities[l]) {
      provMap[p].localities[l] = { sub: 0, doc: 0, clients: {} };
    }
    provMap[p].localities[l].sub += r.sub;
    provMap[p].localities[l].doc += r.doc;

    if (!provMap[p].localities[l].clients[c]) {
      provMap[p].localities[l].clients[c] = { sub: 0, doc: 0 };
    }
    provMap[p].localities[l].clients[c].sub += r.sub;
    provMap[p].localities[l].clients[c].doc += r.doc;
  });

  const sortedProvs = Object.keys(provMap).sort((a, b) => provMap[b].sub - provMap[a].sub);
  const maxProvSub = sortedProvs.length ? provMap[sortedProvs[0]].sub : 1;

  const toggleProv = (p: string) => {
    const next = new Set(openProvinces);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setOpenProvinces(next);
  };

  const toggleLoc = (key: string) => {
    const next = new Set(openLocalities);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setOpenLocalities(next);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-[#e4e8ef] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#e4e8ef] flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#206bc4]" />
              <h2 className="text-sm font-bold text-[#141b2d]">Desglose Territorial Jerárquico</h2>
            </div>
            <p className="text-xs text-[#5b6478] mt-0.5">
              Navegá desde Provincia → Localidad → Cliente para identificar zonas desatendidas o de alta penetración.
            </p>
          </div>
          <div className="text-xs text-[#8b95a8] font-mono">
            {sortedProvs.length} provincias activas en {periodLabel}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#f8fafc] text-[#5b6478] border-b border-[#e4e8ef] font-semibold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4">Territorio / Entidad</th>
                <th className="py-3 px-3 text-right">Facturación</th>
                <th className="py-3 px-3 text-right">% Total</th>
                <th className="py-3 px-3 text-right">Docenas</th>
                <th className="py-3 px-3 text-right">Clientes</th>
                <th className="py-3 px-3 text-right">$ / Docena</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedProvs.map((p) => {
                const P = provMap[p];
                const isOpenP = openProvinces.has(p);
                const sortedLocs = Object.keys(P.localities).sort(
                  (a, b) => P.localities[b].sub - P.localities[a].sub
                );
                const barPct = (P.sub / maxProvSub) * 100;

                return (
                  <React.Fragment key={p}>
                    {/* Province Row */}
                    <tr
                      onClick={() => toggleProv(p)}
                      className="hover:bg-blue-50/50 cursor-pointer transition select-none bg-slate-50/30"
                    >
                      <td className="py-2.5 px-4 relative">
                        <div
                          className="absolute left-0 top-1 bottom-1 bg-blue-100/60 rounded-r -z-0"
                          style={{ width: `${barPct}%` }}
                        />
                        <div className="relative z-10 flex items-center gap-2 font-bold text-slate-800">
                          {isOpenP ? (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>{p}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">{fmt$M(P.sub)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">{fmtPct(P.sub / curTotalSub)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800 font-semibold">{fmtDoc(P.doc)}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-700">{P.clients.size}</td>
                      <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                        {fmt$(P.doc > 0 ? P.sub / P.doc : 0)}
                      </td>
                    </tr>

                    {/* Localities rows */}
                    {isOpenP &&
                      sortedLocs.map((loc) => {
                        const L = P.localities[loc];
                        const locKey = `${p}||${loc}`;
                        const isOpenLoc = openLocalities.has(locKey);
                        const sortedClients = Object.keys(L.clients).sort(
                          (a, b) => L.clients[b].sub - L.clients[a].sub
                        );

                        return (
                          <React.Fragment key={locKey}>
                            <tr
                              onClick={() => toggleLoc(locKey)}
                              className="hover:bg-slate-100/80 cursor-pointer transition select-none bg-slate-50/70"
                            >
                              <td className="py-2 px-4 pl-9 flex items-center gap-2 font-semibold text-slate-700">
                                {isOpenLoc ? (
                                  <ChevronDown className="w-3 h-3 text-slate-600" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-slate-400" />
                                )}
                                <Building className="w-3.5 h-3.5 text-slate-400" />
                                <span>{loc}</span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-800 font-semibold">{fmt$M(L.sub)}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-500">
                                {fmtPct(L.sub / curTotalSub)}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-slate-700">{fmtDoc(L.doc)}</td>
                              <td className="py-2 px-3 text-right font-mono text-slate-600">
                                {Object.keys(L.clients).length}
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-amber-700">
                                {fmt$(L.doc > 0 ? L.sub / L.doc : 0)}
                              </td>
                            </tr>

                            {/* Clients inside Locality */}
                            {isOpenLoc &&
                              sortedClients.map((cli) => {
                                const C = L.clients[cli];
                                return (
                                  <tr
                                    key={cli}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onOpenDrilldown({ type: 'cliente', id: cli });
                                    }}
                                    className="hover:bg-blue-50 cursor-pointer transition text-slate-600"
                                  >
                                    <td className="py-1.5 px-4 pl-16 flex items-center gap-2">
                                      <User className="w-3 h-3 text-blue-500" />
                                      <span className="hover:text-blue-600 hover:underline">{cli}</span>
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono text-slate-700">{fmt$M(C.sub)}</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-slate-400">
                                      {fmtPct(C.sub / curTotalSub)}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono text-slate-600">{fmtDoc(C.doc)}</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-slate-400">—</td>
                                    <td className="py-1.5 px-3 text-right font-mono text-slate-500">
                                      {fmt$(C.doc > 0 ? C.sub / C.doc : 0)}
                                    </td>
                                  </tr>
                                );
                              })}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

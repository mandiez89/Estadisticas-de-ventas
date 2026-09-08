import React from 'react';
import { FilterState, ViewPeriodMode, PrimaryMetric } from '../types';
import { MESES } from '../utils/formatters';
import { RotateCcw, Bookmark, Ban, DollarSign, Package } from 'lucide-react';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (newFilters: Partial<FilterState>) => void;
  years: number[];
  vendors: string[];
  lines: string[];
  families: string[];
  colors: string[];
  provinces: string[];
  excludedCount: number;
  onOpenExclusions: () => void;
  onOpenSavedViews: () => void;
  onResetFilters: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  years,
  vendors,
  lines,
  families,
  colors,
  provinces,
  excludedCount,
  onOpenExclusions,
  onOpenSavedViews,
  onResetFilters
}) => {
  return (
    <div className="sticky top-0 z-20 bg-[#f2f4f8]/95 backdrop-blur-md border-b border-[#e4e8ef] py-3 px-6 md:px-8 shadow-xs">
      <div className="max-w-[1680px] mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Period mode + Primary metric switch */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Segmented Buttons */}
          <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg border border-[#d8dfea]">
            {(['mes', 'tri', 'anual'] as ViewPeriodMode[]).map((mode) => {
              const active = filters.mode === mode;
              const labels = { mes: 'Mes', tri: 'Trimestre', anual: 'Acum. Anual' };
              return (
                <button
                  key={mode}
                  onClick={() => onFilterChange({ mode })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                    active ? 'bg-white text-[#141b2d] shadow-xs' : 'text-[#5b6478] hover:text-[#141b2d]'
                  }`}
                >
                  {labels[mode]}
                </button>
              );
            })}
          </div>

          {/* Metric Toggle: Facturación vs Volumen */}
          <div className="inline-flex bg-[#e2e7ef] p-0.5 rounded-lg border border-[#d8dfea]" title="Alternar métrica primaria para aislar la inflación de la producción real">
            <button
              onClick={() => onFilterChange({ primaryMetric: 'sub' })}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                filters.primaryMetric === 'sub' ? 'bg-[#206bc4] text-white shadow-xs' : 'text-[#5b6478] hover:text-[#141b2d]'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Facturación</span>
            </button>
            <button
              onClick={() => onFilterChange({ primaryMetric: 'doc' })}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-md transition cursor-pointer ${
                filters.primaryMetric === 'doc' ? 'bg-[#0f766e] text-white shadow-xs' : 'text-[#5b6478] hover:text-[#141b2d]'
              }`}
            >
              <Package className="w-3 h-3" />
              <span>Docenas (Físico)</span>
            </button>
          </div>

          {/* Year selector */}
          <select
            value={filters.year}
            onChange={(e) => onFilterChange({ year: Number(e.target.value) })}
            className="text-xs font-semibold px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          {/* Month or Quarter */}
          {filters.mode === 'tri' ? (
            <select
              value={filters.quarter}
              onChange={(e) => onFilterChange({ quarter: Number(e.target.value) })}
              className="text-xs font-medium px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
            >
              <option value={0}>Q1 (Ene–Mar)</option>
              <option value={1}>Q2 (Abr–Jun)</option>
              <option value={2}>Q3 (Jul–Sep)</option>
              <option value={3}>Q4 (Oct–Dic)</option>
            </select>
          ) : (
            <select
              value={filters.month}
              onChange={(e) => onFilterChange({ month: Number(e.target.value) })}
              className="text-xs font-medium px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
            >
              {MESES.map((m, idx) => (
                <option key={idx} value={idx}>
                  {m}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Dimension filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.vend}
            onChange={(e) => onFilterChange({ vend: e.target.value })}
            className="text-xs px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] max-w-[150px] truncate focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
          >
            <option value="">Todos los vendedores</option>
            {vendors.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>

          <select
            value={filters.linea}
            onChange={(e) => onFilterChange({ linea: e.target.value })}
            className="text-xs px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
          >
            <option value="">Todas las líneas</option>
            {lines.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>

          <select
            value={filters.fam}
            onChange={(e) => onFilterChange({ fam: e.target.value })}
            className="text-xs px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
          >
            <option value="">Todas las familias</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={filters.color}
            onChange={(e) => onFilterChange({ color: e.target.value })}
            className="text-xs px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] max-w-[130px] truncate focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
          >
            <option value="">Todos los colores</option>
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={filters.prov}
            onChange={(e) => onFilterChange({ prov: e.target.value })}
            className="text-xs px-2.5 py-1.5 bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
          >
            <option value="">Todas las provincias</option>
            {provinces.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Action buttons */}
          <button
            onClick={onOpenSavedViews}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-white border border-[#e4e8ef] rounded-lg text-[#141b2d] hover:bg-slate-50 transition cursor-pointer"
            title="Guardar o cargar configuraciones de filtros"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-600" />
            <span>Vistas</span>
          </button>

          <button
            onClick={onOpenExclusions}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
              excludedCount > 0
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : 'bg-white text-[#141b2d] border-[#e4e8ef] hover:bg-slate-50'
            }`}
            title="Excluir productos atípicos o descontinuados"
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Exclusiones</span>
            {excludedCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                {excludedCount}
              </span>
            )}
          </button>

          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5b6478] hover:text-[#141b2d] bg-white border border-[#e4e8ef] rounded-lg hover:bg-slate-50 transition cursor-pointer"
            title="Limpiar filtros"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

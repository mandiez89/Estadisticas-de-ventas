import React, { useRef } from 'react';
import { Upload, Sparkles, Download, Layers, RefreshCw, BarChart2 } from 'lucide-react';
import { SaleRow } from '../types';
import * as XLSX from 'xlsx';

interface HeaderProps {
  rows: SaleRow[];
  sourceName: string;
  sheetsInfo: string[];
  isDemo: boolean;
  onFileUpload: (file: File) => void;
  onLoadDemo: () => void;
  onExportExcel: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  rows,
  sourceName,
  sheetsInfo,
  isDemo,
  onFileUpload,
  onLoadDemo,
  onExportExcel,
  activeTab,
  setActiveTab
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs = [
    { id: 'resumen', label: 'Resumen Ejecutivo' },
    { id: 'vendedores', label: 'Vendedores' },
    { id: 'productos', label: 'Productos & Producción' },
    { id: 'clientes', label: 'Clientes & Cartera RFM' },
    { id: 'geografia', label: 'Zonas & Territorio' },
    { id: 'diagnostico', label: 'Diagnóstico & Mejoras' }
  ];

  return (
    <header className="bg-white border-b border-[#e4e8ef] pt-4 px-6 md:px-8">
      <div className="max-w-[1680px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#141b2d] text-white flex items-center justify-center font-bold text-base shadow-sm">
              S
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#141b2d] leading-none">
                  Sasre · Tablero Comercial
                </h1>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#e9f1fb] text-[#206bc4] border border-[#bcd5f0]">
                  v2.0 Mejorado
                </span>
                {isDemo && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] border border-[#fde68a]">
                    Datos Demo
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5b6478] mt-1 flex items-center gap-2">
                <span>Análisis de ventas, volumen físico, rentabilidad y curvas de confección</span>
                <span className="text-slate-300">·</span>
                <span className="font-mono text-slate-500">
                  {rows.length.toLocaleString('es-AR')} renglones cargados
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFileUpload(f);
              }}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e4e8ef] bg-white text-[#141b2d] hover:bg-slate-50 transition cursor-pointer shadow-xs"
              title="Cargar archivo Excel con columnas de Sasre"
            >
              <Upload className="w-3.5 h-3.5 text-[#206bc4]" />
              <span>Cargar Excel</span>
            </button>

            <button
              onClick={onLoadDemo}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-[#e4e8ef] bg-white text-[#5b6478] hover:text-[#141b2d] hover:bg-slate-50 transition cursor-pointer shadow-xs"
              title="Recargar dataset simulado de 3 años"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Cargar Demo (3 años)</span>
            </button>

            <button
              onClick={onExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-[#206bc4] text-white hover:bg-[#1a559d] transition cursor-pointer shadow-xs"
              title="Exportar resumen comercial a Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 border-t border-[#f1f3f7] pt-2 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap rounded-t-lg transition relative border-b-2 cursor-pointer ${
                  isActive
                    ? 'text-[#206bc4] border-[#206bc4] bg-[#f8fafc]'
                    : 'text-[#5b6478] border-transparent hover:text-[#141b2d] hover:bg-slate-50'
                }`}
              >
                {t.label}
                {t.id === 'diagnostico' && (
                  <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
                    Recomendaciones
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

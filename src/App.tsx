import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SaleRow, FilterState, DrilldownTarget } from './types';
import { generateDemoData } from './data/demoData';
import { parseExcelBuffer } from './utils/excelParser';
import {
  filterRows,
  isRowInPeriod,
  getPeriodLabel,
  computeKPIs,
  computeAlerts
} from './utils/analytics';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { ExecutiveSummary } from './components/ExecutiveSummary';
import { VendorsSection } from './components/VendorsSection';
import { ProductsSection } from './components/ProductsSection';
import { ClientsSection } from './components/ClientsSection';
import { GeographySection } from './components/GeographySection';
import { AuditImprovementsSection } from './components/AuditImprovementsSection';
import { DrilldownModal } from './components/DrilldownModal';
import { ExclusionModal } from './components/ExclusionModal';
import { SavedViewsModal } from './components/SavedViewsModal';
import { LoginScreen } from './components/LoginScreen';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import * as XLSX from 'xlsx';

const EXCLUSION_STORAGE_KEY = 'sasre_excluded_articles_v2';
const AUTH_STORAGE_KEY = 'sasre_auth_session';
const PASSWORD_STORAGE_KEY = 'sasre_custom_password';
const DEFAULT_PASSWORD = 'sasre2025';

export default function App() {
  // Authentication & Security State
  const [savedPassword, setSavedPassword] = useState<string>(() => {
    try {
      return localStorage.getItem(PASSWORD_STORAGE_KEY) || DEFAULT_PASSWORD;
    } catch {
      return DEFAULT_PASSWORD;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return (
        localStorage.getItem(AUTH_STORAGE_KEY) === 'unlocked' ||
        sessionStorage.getItem(AUTH_STORAGE_KEY) === 'unlocked'
      );
    } catch {
      return false;
    }
  });

  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState<boolean>(false);

  // Load initial demo data so the app displays immediately
  const [rows, setRows] = useState<SaleRow[]>(() => generateDemoData());
  const [sourceName, setSourceName] = useState<string>('Datos Demostración Sasre (2024-2026)');
  const [sheetsInfo, setSheetsInfo] = useState<string[]>(['Ventas 2024-2026']);
  const [isDemo, setIsDemo] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('resumen');

  // Excluded articles
  const [excludedArticles, setExcludedArticles] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(EXCLUSION_STORAGE_KEY);
      if (stored) return new Set(JSON.parse(stored));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
    return new Set();
  });

  // Filters state
  const [filters, setFilters] = useState<FilterState>(() => {
    // Default to the latest year and latest available month in rows
    return {
      mode: 'mes',
      year: 2026,
      month: 7, // Agosto
      quarter: 2, // Q3
      vend: '',
      linea: '',
      fam: '',
      color: '',
      prov: '',
      searchArt: '',
      searchCli: '',
      primaryMetric: 'sub'
    };
  });

  // Drilldown modal state
  const [drilldownTarget, setDrilldownTarget] = useState<DrilldownTarget | null>(null);
  const [isExclusionOpen, setIsExclusionOpen] = useState<boolean>(false);
  const [isSavedViewsOpen, setIsSavedViewsOpen] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  // Sync year/month bounds whenever rows change
  useEffect(() => {
    if (rows.length > 0) {
      let maxTs = 0;
      for (let i = 0; i < rows.length; i++) {
        if (rows[i].ts > maxTs) maxTs = rows[i].ts;
      }
      const maxD = new Date(maxTs);
      setFilters((prev) => ({
        ...prev,
        year: maxD.getFullYear(),
        month: maxD.getMonth(),
        quarter: Math.floor(maxD.getMonth() / 3)
      }));
    }
  }, [rows]);

  // Handle file uploads (.xlsx or .xls)
  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buf = e.target?.result as ArrayBuffer;
      if (!buf) return;
      try {
        const parsed = parseExcelBuffer(buf);
        if (!parsed.rows.length) {
          alert('No se encontraron filas con las columnas requeridas (Fecha, Artículo, Unidades, Vendedor).');
          return;
        }
        setRows(parsed.rows);
        setSourceName(file.name);
        setSheetsInfo(parsed.sheetsUsed);
        setIsDemo(false);
      } catch (err: any) {
        alert('Error al procesar el archivo Excel: ' + (err?.message || err));
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // Reload demo data
  const handleLoadDemo = useCallback(() => {
    const demo = generateDemoData();
    setRows(demo);
    setSourceName('Datos Demostración Sasre (2024-2026)');
    setSheetsInfo(['Simulación 3 Años']);
    setIsDemo(true);
  }, []);

  // Filter handlers
  const handleFilterChange = useCallback((newFilters: Partial<FilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      vend: '',
      linea: '',
      fam: '',
      color: '',
      prov: '',
      searchArt: '',
      searchCli: ''
    }));
  }, []);

  // Exclusions handlers
  const handleToggleExclude = useCallback((art: string) => {
    setExcludedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(art)) next.delete(art);
      else next.add(art);
      try {
        localStorage.setItem(EXCLUSION_STORAGE_KEY, JSON.stringify(Array.from(next)));
      } catch (e) {}
      return next;
    });
  }, []);

  const handleClearExclusions = useCallback(() => {
    setExcludedArticles(new Set());
    try {
      localStorage.removeItem(EXCLUSION_STORAGE_KEY);
    } catch (e) {}
  }, []);

  // Filtered rows
  const baseRows = useMemo(() => {
    return filterRows(rows, filters, excludedArticles);
  }, [rows, filters, excludedArticles]);

  const curRows = useMemo(() => {
    return baseRows.filter((r) => isRowInPeriod(r, filters.year, filters.mode, filters.month, filters.quarter));
  }, [baseRows, filters.year, filters.mode, filters.month, filters.quarter]);

  const prevRows = useMemo(() => {
    return baseRows.filter((r) => isRowInPeriod(r, filters.year - 1, filters.mode, filters.month, filters.quarter));
  }, [baseRows, filters.year, filters.mode, filters.month, filters.quarter]);

  // KPIs and Alerts
  const kpis = useMemo(() => {
    return computeKPIs(curRows, prevRows, baseRows, filters.year, filters.month);
  }, [curRows, prevRows, baseRows, filters.year, filters.month]);

  const alerts = useMemo(() => {
    return computeAlerts(curRows, prevRows, baseRows, 30, 365);
  }, [curRows, prevRows, baseRows]);

  // Dimension lists for filter selects
  const availableYears = useMemo(() => Array.from(new Set(rows.map((r) => r.y))).sort(), [rows]);
  const availableVendors = useMemo(() => Array.from(new Set(rows.map((r) => r.vend))).filter(Boolean).sort(), [rows]);
  const availableLines = useMemo(() => Array.from(new Set(rows.map((r) => r.linea))).filter(Boolean).sort(), [rows]);
  const availableFamilies = useMemo(() => Array.from(new Set(rows.map((r) => r.fam))).filter(Boolean).sort(), [rows]);
  const availableColors = useMemo(() => Array.from(new Set(rows.map((r) => r.color))).filter(Boolean).sort(), [rows]);
  const availableProvinces = useMemo(() => Array.from(new Set(rows.map((r) => r.prov))).filter(Boolean).sort(), [rows]);

  const allArticlesWithStats = useMemo(() => {
    const map: Record<string, { fam: string; totalDoc: number }> = {};
    rows.forEach((r) => {
      if (!map[r.art]) map[r.art] = { fam: r.fam, totalDoc: 0 };
      map[r.art].totalDoc += r.doc;
    });
    return Object.entries(map)
      .map(([art, d]) => ({ art, ...d }))
      .sort((a, b) => b.totalDoc - a.totalDoc);
  }, [rows]);

  // Labels
  const periodLabel = useMemo(
    () => getPeriodLabel(filters.year, filters.mode, filters.month, filters.quarter),
    [filters.year, filters.mode, filters.month, filters.quarter]
  );
  const prevPeriodLabel = useMemo(
    () => getPeriodLabel(filters.year - 1, filters.mode, filters.month, filters.quarter),
    [filters.year, filters.mode, filters.month, filters.quarter]
  );

  // Export to Excel
  const handleExportExcel = useCallback(() => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Filtered Transactions
    const exportData = curRows.map((r) => ({
      Fecha: new Date(r.ts).toISOString().split('T')[0],
      Cliente: r.cliente,
      Artículo: r.art,
      Familia: r.fam,
      Línea: r.linea,
      Color: r.color,
      Talle: r.talle,
      Docenas: r.doc,
      Unidades: r.un,
      Neto: r.neto,
      Subtotal: r.sub,
      Vendedor: r.vend,
      Provincia: r.prov,
      Localidad: r.loc
    }));
    const wsTransactions = XLSX.utils.json_to_sheet(exportData);
    XLSX.utils.book_append_sheet(wb, wsTransactions, 'Ventas Filtradas');

    // Sheet 2: KPIs
    const kpiData = [
      { Métrica: 'Período Analizado', Valor: periodLabel },
      { Métrica: 'Facturación ($)', Valor: kpis.curSub },
      { Métrica: 'Docenas (dz)', Valor: kpis.curDoc },
      { Métrica: '$ / Docena Realizado', Valor: kpis.curPricePerDoc },
      { Métrica: 'Descuento Comercial Promedio', Valor: `${(kpis.curDiscountPct * 100).toFixed(1)}%` },
      { Métrica: 'Clientes con Compra', Valor: kpis.curClientsCount },
      { Métrica: 'Facturación / Cliente', Valor: kpis.curSubPerClient },
      { Métrica: 'Concentración Top 5 (%)', Valor: `${(kpis.curTop5Concentration * 100).toFixed(1)}%` }
    ];
    const wsKPIs = XLSX.utils.json_to_sheet(kpiData);
    XLSX.utils.book_append_sheet(wb, wsKPIs, 'Resumen KPIs');

    XLSX.writeFile(wb, `Sasre_Reporte_Comercial_${filters.year}_${filters.mode}.xlsx`);
  }, [curRows, periodLabel, kpis, filters]);

  // Drag and drop listeners on container
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleLock = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Storage error:', e);
    }
    setIsAuthenticated(false);
  }, []);

  const handlePasswordChanged = useCallback((newPass: string) => {
    setSavedPassword(newPass);
    try {
      localStorage.setItem(PASSWORD_STORAGE_KEY, newPass);
    } catch (e) {
      console.warn('Storage error:', e);
    }
  }, []);

  if (!isAuthenticated) {
    return (
      <LoginScreen
        onLoginSuccess={() => setIsAuthenticated(true)}
        currentPassword={savedPassword}
      />
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="min-h-screen bg-[#f2f4f8] text-[#141b2d] flex flex-col font-sans"
    >
      {/* Dragging overlay */}
      {isDraggingFile && (
        <div className="fixed inset-0 z-50 bg-[#206bc4]/80 backdrop-blur-xs flex items-center justify-center text-white pointer-events-none">
          <div className="text-center p-8 bg-white/10 rounded-2xl border-2 border-white/40 shadow-2xl">
            <div className="text-3xl font-bold mb-2">Soltá el archivo Excel aquí</div>
            <div className="text-sm opacity-90">Se procesará automáticamente con las columnas de Sasre</div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <Header
        rows={rows}
        sourceName={sourceName}
        sheetsInfo={sheetsInfo}
        isDemo={isDemo}
        onFileUpload={handleFileUpload}
        onLoadDemo={handleLoadDemo}
        onExportExcel={handleExportExcel}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLock={handleLock}
        onOpenChangePassword={() => setIsChangePasswordOpen(true)}
      />

      {/* Sticky Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        years={availableYears}
        vendors={availableVendors}
        lines={availableLines}
        families={availableFamilies}
        colors={availableColors}
        provinces={availableProvinces}
        excludedCount={excludedArticles.size}
        onOpenExclusions={() => setIsExclusionOpen(true)}
        onOpenSavedViews={() => setIsSavedViewsOpen(true)}
        onResetFilters={handleResetFilters}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 sm:p-6 md:p-8">
        {activeTab === 'resumen' && (
          <ExecutiveSummary
            kpis={kpis}
            alerts={alerts}
            curRows={curRows}
            prevRows={prevRows}
            baseRows={baseRows}
            year={filters.year}
            month={filters.month}
            periodLabel={periodLabel}
            prevPeriodLabel={prevPeriodLabel}
            primaryMetric={filters.primaryMetric}
            onOpenDrilldown={setDrilldownTarget}
          />
        )}

        {activeTab === 'vendedores' && (
          <VendorsSection
            curRows={curRows}
            prevRows={prevRows}
            baseRows={baseRows}
            periodLabel={periodLabel}
            prevPeriodLabel={prevPeriodLabel}
            onOpenDrilldown={setDrilldownTarget}
          />
        )}

        {activeTab === 'productos' && (
          <ProductsSection
            curRows={curRows}
            prevRows={prevRows}
            baseRows={baseRows}
            periodLabel={periodLabel}
            onOpenDrilldown={setDrilldownTarget}
          />
        )}

        {activeTab === 'clientes' && (
          <ClientsSection
            curRows={curRows}
            prevRows={prevRows}
            baseRows={baseRows}
            periodLabel={periodLabel}
            prevPeriodLabel={prevPeriodLabel}
            onOpenDrilldown={setDrilldownTarget}
          />
        )}

        {activeTab === 'geografia' && (
          <GeographySection
            curRows={curRows}
            periodLabel={periodLabel}
            onOpenDrilldown={setDrilldownTarget}
          />
        )}

        {activeTab === 'diagnostico' && (
          <AuditImprovementsSection kpis={kpis} alerts={alerts} />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-[#e4e8ef] text-center text-xs text-[#8b95a8]">
        <div className="max-w-[1680px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Sasre · Sistema Comercial de Control de Ventas & Curvas de Producción
          </span>
          <span className="font-mono">
            {rows.length.toLocaleString('es-AR')} renglones procesados · {curRows.length.toLocaleString('es-AR')} en período actual
          </span>
        </div>
      </footer>

      {/* Modals */}
      <DrilldownModal
        target={drilldownTarget}
        curRows={curRows}
        prevRows={prevRows}
        baseRows={baseRows}
        periodLabel={periodLabel}
        onClose={() => setDrilldownTarget(null)}
        onOpenDrilldown={setDrilldownTarget}
      />

      <ExclusionModal
        isOpen={isExclusionOpen}
        onClose={() => setIsExclusionOpen(false)}
        articles={allArticlesWithStats}
        excludedArticles={excludedArticles}
        onToggleExclude={handleToggleExclude}
        onClearExclusions={handleClearExclusions}
      />

      <SavedViewsModal
        isOpen={isSavedViewsOpen}
        onClose={() => setIsSavedViewsOpen(false)}
        currentFilters={filters}
        onApplyView={(savedFilters) => setFilters(savedFilters)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        currentPassword={savedPassword}
        onPasswordChanged={handlePasswordChanged}
      />
    </div>
  );
}

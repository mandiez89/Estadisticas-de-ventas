import React, { useState } from 'react';
import { KPIResults, CommercialAlerts } from '../utils/analytics';
import { fmt$, fmt$M, fmtDoc, fmtPct } from '../utils/formatters';
import {
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  Zap,
  Sliders,
  DollarSign,
  FileSpreadsheet,
  Target,
  Sparkles
} from 'lucide-react';

interface AuditImprovementsProps {
  kpis: KPIResults;
  alerts: CommercialAlerts;
}

export const AuditImprovementsSection: React.FC<AuditImprovementsProps> = ({ kpis, alerts }) => {
  // Simulator states
  const [retentionImprovementPct, setRetentionImprovementPct] = useState<number>(15);
  const [discountControlPct, setDiscountControlPct] = useState<number>(2);
  const [priceOptimizationPct, setPriceOptimizationPct] = useState<number>(3);

  // Impact calculations
  const totalLostSub = alerts.lostClients.reduce((acc, c) => acc + c.prevSub, 0);
  const recoveredFromChurn = totalLostSub * (retentionImprovementPct / 100);
  const recoveredFromDiscounts = kpis.curNeto * (discountControlPct / 100);
  const gainFromPrice = kpis.curSub * (priceOptimizationPct / 100);

  const totalSimulatedGain = recoveredFromChurn + recoveredFromDiscounts + gainFromPrice;

  return (
    <div className="space-y-6">
      {/* Executive Banner */}
      <div className="bg-gradient-to-r from-[#141b2d] to-[#1e293b] rounded-2xl p-6 md:p-8 text-white shadow-md">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-4 h-4" />
          <span>Auditoría y Plan de Modernización Sasre v2.0</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
          Diagnóstico del Tablero Anterior & Mejoras Implementadas
        </h2>
        <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
          El tablero original contaba con una base de datos rica (fechas, clientes, artículos, colores, talles, vendedores y neto/subtotal), pero presentaba serias limitaciones analíticas y de usabilidad comercial que distorsionaban la toma de decisiones. A continuación, el detalle del diagnóstico y las soluciones activadas.
        </p>
      </div>

      {/* 2-Column Comparison: Diagnóstico vs Mejoras */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Falencias del Tablero Original */}
        <div className="bg-white rounded-xl p-6 border border-rose-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-rose-100">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="text-base font-bold text-slate-900">7 Falencias Críticas del Tablero Original</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">1</span>
                <span>Falsa Sensación de Crecimiento por Inflación</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Al medir variaciones interanuales en $ nominales (moneda argentina), un aumento del 100% en pesos oculta caídas reales del 20% o 30% en volumen físico producido y despachado.
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">2</span>
                <span>Ausencia de Segmentación de Cartera (RFM)</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Solo contaba con una alerta pasiva de clientes &gt;365 días sin comprar. No categorizaba entre clientes Campeones, Leales, Potenciales o En Riesgo inminente.
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">3</span>
                <span>Fuga de Margen por Descuentos Comerciales Opacos</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                El ERP tiene las columnas <code>Neto</code> y <code>Subtotal</code>, pero el tablero original no monitoreaba la tasa de descuento concedida por cada vendedor, permitiendo canibalización de margen.
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">4</span>
                <span>Sobrecarga Cognitiva (Scroll Infinito Unificado)</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Todo el sistema estaba apiñado en una sola página vertical de miles de píxeles, obligando a directores y gerentes a desplazarse caóticamente para encontrar un dato.
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">5</span>
                <span>Sin Comparativa Estructurada de Mix entre Vendedores</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                No permitía descubrir si un vendedor vende solo productos de bajo margen o si otro está descuidando líneas estratégicas (Interior vs Deportiva).
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">6</span>
                <span>Pantalla Vacía en Frío (Cero Onboarding)</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Si el usuario no disponía del archivo exacto en ese momento, el tablero quedaba bloqueado en una caja gris vacía sin posibilidad de explorar funcionalidades.
              </p>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100">
              <div className="font-bold text-rose-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center text-[10px]">7</span>
                <span>Desaprovechamiento de Oportunidades de Cross-Selling</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                No indicaba qué líneas activas de la empresa nunca fueron compradas por clientes recurrentes para ampliar el ticket promedio.
              </p>
            </div>
          </div>
        </div>

        {/* Mejoras Implementadas en Esta Versión */}
        <div className="bg-white rounded-xl p-6 border border-emerald-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-emerald-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">10 Soluciones de Alto Impacto Incorporadas</h3>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">1</span>
                <span>Selector Dual: Facturación ($) vs. Volumen Físico (Docenas)</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Permite alternar en toda la aplicación con un solo click para aislar el impacto inflacionario y auditar el crecimiento industrial real.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">2</span>
                <span>Segmentación RFM Interactiva con Filtros Dinámicos</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Cuantifica clientes en Campeones, Leales, Potenciales, En Riesgo y Dormidos, con acceso inmediato a la lista para campañas de retención.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">3</span>
                <span>Auditoría de Descuentos y Margen Concedido</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Monitorea el porcentaje de descuento promedio global y por cliente para evitar descuentos discrecionales no justificados.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">4</span>
                <span>Navegación Temática Modularizada (Tabs Profesionales)</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Resumen Ejecutivo, Vendedores, Productos & Producción, Clientes & RFM, Territorio Geográfico y Diagnóstico, reduciendo la fatiga visual.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">5</span>
                <span>Comparador Head-to-Head con Análisis de Brecha (pp)</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Compara en tiempo real dos ejecutivos de venta o un vendedor contra la empresa, midiendo dónde está sobre o sub indexado.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">6</span>
                <span>Dataset Demo Integrado de 3 Años para Exploración Instantánea</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                Permite operar todas las vistas al abrir la aplicación sin necesidad de subir archivos, facilitando demos y capacitaciones.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-100">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px]">7</span>
                <span>Detector de Oportunidades de Cross-Selling</span>
              </div>
              <p className="text-slate-600 mt-1 leading-normal">
                En la ficha de cada cliente se identifican las líneas disponibles que jamás compró, guiando la próxima llamada comercial.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Value Simulation Tool */}
      <div className="bg-white rounded-xl p-6 border border-[#e4e8ef] shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <Sliders className="w-4 h-4 text-[#206bc4]" />
          <h3 className="text-base font-bold text-slate-900">Simulador de Impacto Económico en Ventas</h3>
        </div>
        <p className="text-xs text-[#5b6478] mb-6">
          Ajustá los controles para estimar la recuperación de facturación al aplicar las acciones correctivas sugeridas:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Slider 1: Recuperación de Churn */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
              <span>Recuperación Clientes Perdidos / Caída</span>
              <span className="text-[#206bc4] font-mono font-bold text-sm">{retentionImprovementPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              value={retentionImprovementPct}
              onChange={(e) => setRetentionImprovementPct(Number(e.target.value))}
              className="w-full accent-[#206bc4] cursor-pointer"
            />
            <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
              <span>Impacto estimado:</span>
              <strong className="text-emerald-700 font-mono font-semibold">+{fmt$M(recoveredFromChurn)}</strong>
            </div>
          </div>

          {/* Slider 2: Control de Descuentos */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
              <span>Optimización / Control de Descuentos</span>
              <span className="text-amber-700 font-mono font-bold text-sm">{discountControlPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={8}
              step={0.5}
              value={discountControlPct}
              onChange={(e) => setDiscountControlPct(Number(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
              <span>Margen recuperado:</span>
              <strong className="text-emerald-700 font-mono font-semibold">+{fmt$M(recoveredFromDiscounts)}</strong>
            </div>
          </div>

          {/* Slider 3: Precio / Mix */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-2">
              <span>Mejora de Mix a Productos Premium</span>
              <span className="text-[#0f766e] font-mono font-bold text-sm">{priceOptimizationPct}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={priceOptimizationPct}
              onChange={(e) => setPriceOptimizationPct(Number(e.target.value))}
              className="w-full accent-[#0f766e] cursor-pointer"
            />
            <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
              <span>Facturación extra:</span>
              <strong className="text-emerald-700 font-mono font-semibold">+{fmt$M(gainFromPrice)}</strong>
            </div>
          </div>
        </div>

        {/* Simulation Output Banner */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald-100">
              Potencial Anual de Recuperación y Crecimiento
            </div>
            <div className="text-2xl font-bold font-mono tracking-tight mt-0.5">
              +{fmt$M(totalSimulatedGain)}
            </div>
          </div>
          <div className="text-xs text-emerald-100 max-w-md">
            Al reactivar el {retentionImprovementPct}% de cuentas en fuga y ajustar {discountControlPct} puntos de margen en descuentos, Sasre recupera facturación directa sin incrementar costos fijos de planta.
          </div>
        </div>
      </div>
    </div>
  );
};

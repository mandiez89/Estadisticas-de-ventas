import React from 'react';
import { X, Check, Ban, RotateCcw } from 'lucide-react';
import { fmtDoc } from '../utils/formatters';

interface ExclusionModalProps {
  isOpen: boolean;
  onClose: () => void;
  articles: { art: string; fam: string; totalDoc: number }[];
  excludedArticles: Set<string>;
  onToggleExclude: (art: string) => void;
  onClearExclusions: () => void;
}

export const ExclusionModal: React.FC<ExclusionModalProps> = ({
  isOpen,
  onClose,
  articles,
  excludedArticles,
  onToggleExclude,
  onClearExclusions
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2d]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-[#e4e8ef]">
        <div className="p-5 border-b border-[#e4e8ef] flex items-center justify-between bg-[#f8fafc]">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Ban className="w-4 h-4 text-red-600" />
              <span>Excluir Productos del Análisis</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Hacé click en los artículos que quieras omitir temporalmente de KPIs, promedios y rankings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex flex-wrap gap-2">
            {articles.map((a) => {
              const isExcluded = excludedArticles.has(a.art);
              return (
                <button
                  key={a.art}
                  onClick={() => onToggleExclude(a.art)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition cursor-pointer ${
                    isExcluded
                      ? 'bg-rose-50 border-rose-300 text-rose-700 line-through'
                      : 'bg-white border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold">{a.art}</span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {a.fam} · {fmtDoc(a.totalDoc)} dz
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-[#e4e8ef] flex items-center justify-between bg-[#f8fafc]">
          <button
            onClick={onClearExclusions}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar todos</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#206bc4] text-white hover:bg-[#1a559d] transition cursor-pointer"
          >
            Aplicar y Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

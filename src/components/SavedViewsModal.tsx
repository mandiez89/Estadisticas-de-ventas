import React, { useState, useEffect } from 'react';
import { X, Bookmark, Trash2, Plus, Check } from 'lucide-react';
import { FilterState } from '../types';

interface SavedViewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFilters: FilterState;
  onApplyView: (filters: FilterState) => void;
}

interface SavedViewItem {
  id: string;
  name: string;
  filters: FilterState;
  date: string;
}

const STORAGE_KEY = 'sasre_saved_views_v2';

export const SavedViewsModal: React.FC<SavedViewsModalProps> = ({
  isOpen,
  onClose,
  currentFilters,
  onApplyView
}) => {
  const [views, setViews] = useState<SavedViewItem[]>([]);
  const [viewName, setViewName] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setViews(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!viewName.trim()) return;
    const newItem: SavedViewItem = {
      id: Date.now().toString(),
      name: viewName.trim(),
      filters: { ...currentFilters },
      date: new Date().toLocaleDateString('es-AR')
    };
    const nextViews = [newItem, ...views];
    setViews(nextViews);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextViews));
    setViewName('');
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextViews = views.filter((v) => v.id !== id);
    setViews(nextViews);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextViews));
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#141b2d]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl border border-[#e4e8ef]">
        <div className="p-5 border-b border-[#e4e8ef] flex items-center justify-between bg-[#f8fafc]">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-600" />
              <span>Vistas y Filtros Guardados</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Guardá combinaciones de vendedor, línea, provincia o período para consultarlas luego.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Create new view */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la vista (ej. Línea Deportiva CABA)"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#206bc4]"
            />
            <button
              onClick={handleSave}
              disabled={!viewName.trim()}
              className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg bg-[#206bc4] text-white hover:bg-[#1a559d] transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Guardar</span>
            </button>
          </div>

          {/* Views list */}
          <div className="space-y-2 mt-4">
            {views.map((v) => (
              <div
                key={v.id}
                onClick={() => {
                  onApplyView(v.filters);
                  onClose();
                }}
                className="p-3 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-xl flex items-center justify-between cursor-pointer transition"
              >
                <div>
                  <div className="text-xs font-bold text-slate-800">{v.name}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Modo: {v.filters.mode} · Vendedor: {v.filters.vend || 'Todos'} · Línea: {v.filters.linea || 'Todas'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{v.date}</span>
                  <button
                    onClick={(e) => handleDelete(v.id, e)}
                    className="w-6 h-6 rounded flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                    title="Eliminar vista"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {views.length === 0 && (
              <div className="text-center py-6 text-xs text-slate-400">
                No tenés vistas guardadas todavía. Ajustá los filtros y guardá una arriba.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

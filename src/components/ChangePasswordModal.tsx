import React, { useState } from 'react';
import { X, KeyRound, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPassword: string;
  onPasswordChanged: (newPass: string) => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
  currentPassword,
  onPasswordChanged
}) => {
  const [currentInput, setCurrentInput] = useState('');
  const [newInput, setNewInput] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (currentInput !== currentPassword) {
      setErrorMsg('La contraseña actual no es correcta.');
      return;
    }

    if (newInput.trim().length < 4) {
      setErrorMsg('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newInput !== confirmInput) {
      setErrorMsg('Las nuevas contraseñas no coinciden.');
      return;
    }

    onPasswordChanged(newInput.trim());
    setSuccessMsg('¡Contraseña actualizada correctamente!');
    setTimeout(() => {
      onClose();
      setCurrentInput('');
      setNewInput('');
      setConfirmInput('');
      setSuccessMsg('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#206bc4] flex items-center justify-center border border-blue-100">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">Seguridad y Acceso</h2>
              <p className="text-[11px] text-slate-500">Cambiar clave de ingreso al tablero</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {errorMsg && (
            <div className="flex items-center gap-2 text-rose-700 bg-rose-50 p-3 rounded-xl text-xs border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-3 rounded-xl text-xs border border-emerald-200">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contraseña Actual
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={currentInput}
              onChange={(e) => setCurrentInput(e.target.value)}
              placeholder="Ingresá la contraseña actual"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#206bc4] focus:ring-2 focus:ring-blue-100 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nueva Contraseña
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={newInput}
              onChange={(e) => setNewInput(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#206bc4] focus:ring-2 focus:ring-blue-100 outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirmar Nueva Contraseña
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder="Repetí la nueva contraseña"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:border-[#206bc4] focus:ring-2 focus:ring-blue-100 outline-none"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1.5 cursor-pointer"
            >
              {showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showPass ? 'Ocultar caracteres' : 'Mostrar caracteres'}</span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 cursor-pointer transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#206bc4] hover:bg-[#1a559d] text-white shadow-xs cursor-pointer transition"
            >
              Guardar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

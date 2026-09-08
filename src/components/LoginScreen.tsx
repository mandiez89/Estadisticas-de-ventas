import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, AlertCircle, ArrowRight, KeyRound } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  currentPassword: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, currentPassword }) => {
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputPassword.trim()) return;

    if (inputPassword === currentPassword) {
      setError(false);
      if (rememberDevice) {
        localStorage.setItem('sasre_auth_session', 'unlocked');
      } else {
        sessionStorage.setItem('sasre_auth_session', 'unlocked');
      }
      onLoginSuccess();
    } else {
      setError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(32,107,196,0.25),rgba(255,255,255,0))] flex flex-col items-center justify-center p-4 selection:bg-blue-500 selection:text-white">
      {/* Background Decorative Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Card Container */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 p-8">
          {/* Header Brand */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0f172a] via-[#1e293b] to-[#206bc4] flex items-center justify-center text-white shadow-lg shadow-blue-900/20 mb-4 ring-4 ring-blue-50">
              <div className="relative">
                <span className="font-bold text-2xl tracking-wider">S</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400 absolute -bottom-1 -right-2" />
              </div>
            </div>

            <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">
              Sasre · Tablero Comercial
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-[300px]">
              Acceso restringido. Ingresá la contraseña corporativa para ver los datos de ventas y rentabilidad.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Contraseña de Acceso</span>
                <span className="text-[11px] font-normal text-slate-400">Sensible a mayúsculas</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    if (error) setError(false);
                  }}
                  autoFocus
                  placeholder="Ingresá la clave..."
                  className={`w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border transition outline-none ${
                    error
                      ? 'border-rose-400 bg-rose-50/40 text-rose-900 focus:ring-2 focus:ring-rose-200'
                      : 'border-slate-300 bg-white text-slate-900 focus:border-[#206bc4] focus:ring-2 focus:ring-blue-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  title={showPassword ? 'Ocultar clave' : 'Mostrar clave'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-1.5 text-rose-600 text-xs mt-2 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Contraseña incorrecta. Verificá e intentá nuevamente.</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded text-[#206bc4] focus:ring-blue-400 w-4 h-4 border-slate-300"
                />
                <span>Recordar sesión en este equipo</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full mt-2 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#206bc4] hover:bg-[#1a559d] text-white text-sm font-semibold shadow-md shadow-blue-700/20 transition cursor-pointer active:scale-[0.99]"
            >
              <span>Ingresar al Tablero</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Hint / Helper Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-start gap-2.5 bg-slate-50/80 rounded-xl p-3 text-xs text-slate-600 border border-slate-200/50">
            <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-700">Clave inicial predeterminada:</p>
              <p className="mt-0.5 font-mono text-[11px] text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded border border-blue-200">
                sasre2025
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Podrás cambiar esta clave en cualquier momento desde el botón de seguridad en el menú superior.
              </p>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400/80 mt-4">
          Sasre · Sistema Integral de Gestión Textil y Comercial
        </p>
      </div>
    </div>
  );
};

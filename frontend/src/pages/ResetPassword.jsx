import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password !== confirmar) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 8) { setError('Mínimo 8 caracteres'); return; }
    setError('');
    setCargando(true);
    try {
      await api.post('/auth/reset-password', { token, nuevaPassword: password });
      navigate('/login?resetOk=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Token inválido o expirado');
    } finally {
      setCargando(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-5">
        <p className="text-[#ba1a1a]">Enlace inválido</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-[#f9f9f9]">
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl p-6 elevation-l1">
          <h1 className="text-[22px] font-bold text-[#1a1c1c] mb-5">Nueva contraseña</h1>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Confirmar contraseña</label>
              <input
                type="password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                placeholder="Repetí la contraseña"
                required
              />
            </div>
            <button
              type="submit"
              disabled={cargando}
              className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg disabled:opacity-60"
            >
              {cargando ? 'Guardando...' : 'Guardar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

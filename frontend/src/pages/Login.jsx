import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.token, data.usuario);
      const redirect = sessionStorage.getItem('redirect_after_login');
      if (redirect) { sessionStorage.removeItem('redirect_after_login'); navigate(redirect); }
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setCargando(false);
    }
  }

  const inputClass = "w-full mt-1 h-12 px-4 bg-[#f4f6f8] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] text-[#1a1c1c]";
  const labelClass = "text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider";

  return (
    <div className="min-h-dvh bg-[#f4f6f8] flex flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm animate-fadeUp">

        {/* Logo */}
        <div className="flex flex-col items-center mb-7">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 elevation-l2"
            style={{ background: 'linear-gradient(135deg, #006492, #009ee3)' }}
          >
            <span
              className="material-symbols-outlined text-white text-[32px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              account_balance_wallet
            </span>
          </div>
          <h1 className="text-[26px] font-bold text-[#006492] tracking-tight">AulaCash</h1>
          <p className="text-[13px] text-[#8a9aa6] mt-1">Simulación educativa · no dinero real</p>
        </div>

        {/* Tarjeta */}
        <div className="bg-white rounded-3xl p-6 elevation-l1">
          <h2 className="text-[20px] font-bold text-[#1a1c1c] mb-5">Iniciar sesión</h2>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] rounded-2xl px-4 py-3 text-[14px] mb-4 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className={labelClass}>Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={inputClass}
                placeholder="••••••••"
                required
              />
            </div>

            <div className="text-right">
              <Link to="/forgot-password" className="text-[13px] text-[#006492] font-semibold">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-13 text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 elevation-l1 py-3.5"
              style={{ background: 'linear-gradient(135deg, #006492, #009ee3)' }}
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[14px] text-[#8a9aa6] mt-6">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="text-[#006492] font-bold">Registrarse</Link>
        </p>
      </div>
    </div>
  );
}

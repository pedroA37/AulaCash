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

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-[#f9f9f9]">
      <div className="w-full max-w-sm">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-[#009ee3] flex items-center justify-center mx-auto mb-4 elevation-l2">
            <span className="material-symbols-outlined text-white text-[32px]">account_balance_wallet</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#1a1c1c] tracking-tight">AulaCash</h1>
          <p className="text-[14px] text-[#5f5e5e] mt-1">Simulación educativa — no dinero real</p>
        </div>

        <div className="bg-white rounded-2xl p-6 elevation-l1">
          <h2 className="text-[20px] font-semibold text-[#1a1c1c] mb-6">Iniciar sesión</h2>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] text-[#1a1c1c]"
                placeholder="tu@email.com"
                required
              />
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Contraseña</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] text-[#1a1c1c]"
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
              className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all duration-200 disabled:opacity-60"
            >
              {cargando ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[14px] text-[#5f5e5e] mt-6">
          ¿No tenés cuenta?{' '}
          <Link to="/registro" className="text-[#006492] font-semibold">Registrarse</Link>
        </p>
      </div>
    </div>
  );
}

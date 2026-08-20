import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', dni: '', nuevaPassword: '', confirmar: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.nuevaPassword !== form.confirmar) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (form.nuevaPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setCargando(true);
    try {
      await api.post('/auth/reset-password', {
        email: form.email,
        dni: form.dni,
        nuevaPassword: form.nuevaPassword,
      });
      navigate('/login?resetOk=1');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar la solicitud');
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-[#f9f9f9]">
      <div className="w-full max-w-sm">
        <Link to="/login" className="flex items-center gap-1 text-[#006492] mb-6">
          <span className="material-symbols-outlined">arrow_back</span>
          <span className="text-[14px] font-semibold">Volver</span>
        </Link>

        <div className="bg-white rounded-2xl p-6 elevation-l1">
          <h1 className="text-[22px] font-bold text-[#1a1c1c] mb-2">Recuperar contraseña</h1>
          <p className="text-[14px] text-[#5f5e5e] mb-5">
            Ingresá tu email y DNI registrados para establecer una nueva contraseña.
          </p>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Email</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                placeholder="tu@email.com"
                required
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">DNI</label>
              <input
                type="text"
                name="dni"
                value={form.dni}
                onChange={handleChange}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                placeholder="Tu número de DNI"
                required
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Nueva contraseña</label>
              <input
                type="password"
                name="nuevaPassword"
                value={form.nuevaPassword}
                onChange={handleChange}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                placeholder="Mínimo 8 caracteres"
                required
              />
            </div>
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmar"
                value={form.confirmar}
                onChange={handleChange}
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
              {cargando ? 'Verificando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

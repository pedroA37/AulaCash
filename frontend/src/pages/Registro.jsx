import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Registro() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [rol, setRol] = useState('user');
  const [form, setForm] = useState({ dni: '', email: '', password: '', nombre: '', apellido: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  function set(campo) {
    return (e) => setForm({ ...form, [campo]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setCargando(true);
    try {
      const { data } = await api.post('/auth/registro', { ...form, rol });
      login(data.token, data.usuario);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.errores?.[0]?.msg || 'Error al registrarse');
    } finally {
      setCargando(false);
    }
  }

  const inputClass = "w-full mt-1 h-12 px-4 bg-[#f4f6f8] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] text-[#1a1c1c] transition-shadow";
  const labelClass = "text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider";

  return (
    <div className="min-h-dvh flex flex-col" style={{ background: 'linear-gradient(170deg, #003f61 0%, #006492 42%, #f4f6f8 100%)' }}>
      {/* Hero */}
      <div className="flex flex-col items-center pt-12 pb-8 px-5 animate-fadeUp">
        <div
          className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4"
          style={{ boxShadow: '0 12px 40px rgba(0, 100, 146, 0.4)' }}
        >
          <span
            className="material-symbols-outlined text-[#006492] text-[32px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            account_balance_wallet
          </span>
        </div>
        <h1 className="text-[28px] font-bold text-white tracking-tight">AulaCash</h1>
        <p className="text-[13px] text-white/60 mt-1">Creá tu cuenta</p>
      </div>

      {/* Tarjeta de formulario */}
      <div className="bg-[#f4f6f8] rounded-t-3xl px-5 pt-7 pb-10">
        {/* Selector de rol */}
        <div className="flex bg-white rounded-2xl p-1 mb-5 elevation-l1">
          {[
            { value: 'user',  label: 'Alumno',  icon: 'school' },
            { value: 'admin', label: 'Docente', icon: 'admin_panel_settings' },
          ].map(({ value, label, icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setRol(value)}
              className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl text-[14px] font-bold transition-all duration-200 ${
                rol === value
                  ? 'text-white shadow-sm'
                  : 'text-[#8a9aa6]'
              }`}
              style={rol === value ? { background: 'linear-gradient(135deg, #006492, #009ee3)' } : {}}
            >
              <span className="material-symbols-outlined text-[18px]"
                style={{ fontVariationSettings: rol === value ? "'FILL' 1" : "'FILL' 0" }}>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-[#ffdad6] text-[#93000a] rounded-2xl px-4 py-3 text-[14px] mb-4 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Nombre</label>
              <input type="text" value={form.nombre} onChange={set('nombre')} className={inputClass} placeholder="Juan" required />
            </div>
            <div>
              <label className={labelClass}>Apellido</label>
              <input type="text" value={form.apellido} onChange={set('apellido')} className={inputClass} placeholder="Pérez" required />
            </div>
          </div>

          <div>
            <label className={labelClass}>DNI</label>
            <input type="text" value={form.dni} onChange={set('dni')} className={inputClass} placeholder="12345678" required />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={set('email')} className={inputClass} placeholder="tu@email.com" required />
          </div>

          <div>
            <label className={labelClass}>Contraseña</label>
            <input type="password" value={form.password} onChange={set('password')} className={inputClass} placeholder="Mínimo 8 caracteres" required />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full h-14 text-white font-bold text-[16px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 elevation-l1"
            style={{ background: cargando ? '#8ab9d6' : 'linear-gradient(135deg, #006492 0%, #009ee3 100%)' }}
          >
            {cargando ? 'Creando cuenta...' : `Registrarse como ${rol === 'admin' ? 'docente' : 'alumno'}`}
          </button>
        </form>

        <p className="text-center text-[14px] text-[#8a9aa6] mt-6">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-[#006492] font-bold">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}

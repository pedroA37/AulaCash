import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setEnviado(true);
    } catch {
      setError('Error al procesar la solicitud');
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

          {!enviado ? (
            <>
              <p className="text-[14px] text-[#5f5e5e] mb-5">
                Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
              </p>

              {error && (
                <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] mb-4">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg disabled:opacity-60"
                >
                  {cargando ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-4 space-y-3">
              <span className="material-symbols-outlined text-[#009ee3] text-[48px]">mark_email_read</span>
              <p className="text-[15px] text-[#1a1c1c] font-semibold">Revisá tu correo</p>
              <p className="text-[14px] text-[#5f5e5e]">
                Si el email existe en el sistema, recibirás un enlace en los próximos minutos.
              </p>
              <Link to="/login" className="block mt-4 text-[#006492] font-semibold text-[14px]">
                Volver al inicio de sesión
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

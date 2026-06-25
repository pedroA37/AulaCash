import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import api from '../services/api';

const labelClass = 'text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider';
const inputClass = 'w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] text-[#1a1c1c]';

export default function Admin() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { mercadoActivo, refrescarMercados } = useMercado();

  const [mostrarFormAdmin, setMostrarFormAdmin] = useState(false);
  const [nuevoAdmin, setNuevoAdmin] = useState({ dni: '', email: '', password: '', nombre: '', apellido: '' });
  const [creandoAdmin, setCreandoAdmin] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  async function handleCrearAdmin(e) {
    e.preventDefault();
    setError('');
    setCreandoAdmin(true);
    try {
      await api.post('/admin/crear-admin', nuevoAdmin);
      setMensaje(`Admin creado: ${nuevoAdmin.nombre} ${nuevoAdmin.apellido}`);
      setNuevoAdmin({ dni: '', email: '', password: '', nombre: '', apellido: '' });
      setMostrarFormAdmin(false);
      setTimeout(() => setMensaje(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear admin');
    } finally {
      setCreandoAdmin(false);
    }
  }

  return (
    <Layout titulo="Administración">

      {mensaje && <div className="bg-[#00ac46]/10 text-[#006e2a] rounded-xl px-4 py-3 text-[14px] mb-4 font-semibold">{mensaje}</div>}
      {error && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] mb-4">{error}</div>}

      {/* Panel mercados */}
      <div className="mb-4 space-y-2">
        {mercadoActivo && (
          <div className="bg-[#006492] text-white rounded-2xl p-4 elevation-l1 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-[22px]">storefront</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-[15px]">{mercadoActivo.nombre}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${mercadoActivo.estado === 'abierto' ? 'bg-[#00ac46] text-white' : mercadoActivo.estado === 'cerrado' ? 'bg-[#ba1a1a] text-white' : 'bg-white/20 text-white'}`}>
                    {mercadoActivo.estado === 'borrador' ? 'Borrador' : mercadoActivo.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>
                <p className="text-[12px] text-white/70">{mercadoActivo.moneda_nombre} · {mercadoActivo.codigo}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {(mercadoActivo.estado === 'borrador' || mercadoActivo.estado === 'cerrado') && (
                <button
                  onClick={async () => {
                    try {
                      await api.post(`/admin/mercados/${mercadoActivo.id}/abrir`);
                      refrescarMercados();
                    } catch (err) { alert(err.response?.data?.error || 'Error'); }
                  }}
                  className="flex-1 h-10 bg-[#00ac46] text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-[16px]">play_circle</span>
                  {mercadoActivo.estado === 'cerrado' ? 'Reabrir' : 'Abrir mercado'}
                </button>
              )}
              <Link
                to={`/admin/mercados/${mercadoActivo.id}`}
                className="flex-1 h-10 bg-white/20 text-white font-bold text-[13px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[16px]">manage_accounts</span>
                Gestionar
              </Link>
            </div>
          </div>
        )}

        <Link to="/admin/mercados"
          className="flex items-center gap-3 bg-white rounded-2xl p-4 elevation-l1 active:scale-[0.98] transition-all">
          <div className="w-10 h-10 rounded-full bg-[#006492]/10 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[#006492] text-[22px]">storefront</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-[15px] text-[#1a1c1c]">Mis mercados</p>
            <p className="text-[12px] text-[#5f5e5e]">Crear y gestionar mercados educativos</p>
          </div>
          <span className="material-symbols-outlined text-[#bec8d2]">chevron_right</span>
        </Link>
      </div>

      {/* Crear admin */}
      <div className="space-y-3">
        <button
          onClick={() => { setMostrarFormAdmin((v) => !v); setError(''); }}
          className="w-full h-12 flex items-center justify-center gap-2 bg-[#006492] text-white font-bold text-[15px] rounded-full shadow-lg active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">{mostrarFormAdmin ? 'close' : 'person_add'}</span>
          {mostrarFormAdmin ? 'Cancelar' : 'Crear administrador'}
        </button>

        {mostrarFormAdmin && (
          <div className="bg-white rounded-2xl p-5 elevation-l1">
            <h3 className="text-[15px] font-bold text-[#1a1c1c] mb-4">Nuevo administrador</h3>
            {error && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] mb-3">{error}</div>}
            <form onSubmit={handleCrearAdmin} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input type="text" value={nuevoAdmin.nombre}
                    onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, nombre: e.target.value })}
                    className={inputClass} placeholder="Ana" required />
                </div>
                <div>
                  <label className={labelClass}>Apellido</label>
                  <input type="text" value={nuevoAdmin.apellido}
                    onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, apellido: e.target.value })}
                    className={inputClass} placeholder="García" required />
                </div>
              </div>
              <div>
                <label className={labelClass}>DNI</label>
                <input type="text" value={nuevoAdmin.dni}
                  onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, dni: e.target.value })}
                  className={inputClass} placeholder="87654321" required />
              </div>
              <div>
                <label className={labelClass}>Email</label>
                <input type="email" value={nuevoAdmin.email}
                  onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, email: e.target.value })}
                  className={inputClass} placeholder="admin2@aulacash.edu" required />
              </div>
              <div>
                <label className={labelClass}>Contraseña</label>
                <input type="password" value={nuevoAdmin.password}
                  onChange={(e) => setNuevoAdmin({ ...nuevoAdmin, password: e.target.value })}
                  className={inputClass} placeholder="Mínimo 8 caracteres" required />
              </div>
              <button type="submit" disabled={creandoAdmin}
                className="w-full h-12 bg-[#006492] text-white font-bold text-[15px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60">
                {creandoAdmin ? 'Creando...' : 'Confirmar'}
              </button>
            </form>
          </div>
        )}
      </div>

    </Layout>
  );
}

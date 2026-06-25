import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

const ESTADO_BADGE = {
  borrador: { label: 'Borrador', bg: 'bg-[#eeeeee]', text: 'text-[#5f5e5e]' },
  abierto:  { label: 'Abierto',  bg: 'bg-[#00ac46]/10', text: 'text-[#006e2a]' },
  cerrado:  { label: 'Cerrado',  bg: 'bg-[#ffdad6]', text: 'text-[#93000a]' },
};

const inputClass = 'w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] text-[#1a1c1c]';
const labelClass = 'text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider';

export default function AdminMercados() {
  const navigate = useNavigate();
  const [mercados, setMercados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', logo_url: '', moneda_nombre: '', moneda_acronimo: '' });
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    try {
      const { data } = await api.get('/admin/mercados');
      setMercados(data);
    } catch {
      setError('Error al cargar mercados');
    } finally {
      setCargando(false);
    }
  }

  async function handleCrear(e) {
    e.preventDefault();
    if (!form.nombre.trim() || !form.moneda_nombre.trim() || !form.moneda_acronimo.trim()) {
      setError('Nombre, moneda y acrónimo son requeridos'); return;
    }
    setCreando(true); setError('');
    try {
      await api.post('/admin/mercados', {
        nombre: form.nombre.trim(),
        logo_url: form.logo_url.trim() || undefined,
        moneda_nombre: form.moneda_nombre.trim(),
        moneda_acronimo: form.moneda_acronimo.trim(),
      });
      setMensaje('Mercado creado correctamente');
      setForm({ nombre: '', logo_url: '', moneda_nombre: '', moneda_acronimo: '' });
      setMostrarForm(false);
      cargar();
      setTimeout(() => setMensaje(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear mercado');
    } finally {
      setCreando(false);
    }
  }

  return (
    <Layout titulo="Mis mercados">
      <div className="space-y-4">
        {mensaje && <div className="bg-[#00ac46]/10 text-[#006e2a] rounded-xl px-4 py-3 text-[14px] font-semibold">{mensaje}</div>}
        {error && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>}

        {cargando ? (
          <div className="flex justify-center py-12"><Spinner size={36} /></div>
        ) : (
          <>
            {mercados.length === 0 && !mostrarForm ? (
              <div className="bg-white rounded-2xl p-8 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[48px]">storefront</span>
                <p className="text-[15px] font-semibold text-[#1a1c1c] mt-3">Todavía no creaste ningún mercado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mercados.map((m) => {
                  const badge = ESTADO_BADGE[m.estado] || ESTADO_BADGE.borrador;
                  return (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/mercados/${m.id}`)}
                      className="w-full bg-white rounded-2xl p-4 elevation-l1 text-left active:scale-[0.98] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        {m.logo_url ? (
                          <img src={m.logo_url} alt={m.nombre} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-[#009ee3]/10 flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-[#006492] text-[26px]">storefront</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-[#1a1c1c] text-[16px]">{m.nombre}</p>
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}`}>{badge.label}</span>
                          </div>
                          <p className="text-[12px] text-[#5f5e5e] mt-0.5">
                            {m.moneda_nombre} ({m.moneda_acronimo}) · Código: <strong>{m.codigo}</strong>
                          </p>
                          <p className="text-[11px] text-[#5f5e5e]">{m.total_participantes} participante{m.total_participantes !== 1 ? 's' : ''}</p>
                        </div>
                        <span className="material-symbols-outlined text-[#bec8d2]">chevron_right</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Botón + formulario crear */}
            <button
              onClick={() => { setMostrarForm((v) => !v); setError(''); }}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#006492] text-white font-bold text-[15px] rounded-full shadow-lg active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">{mostrarForm ? 'close' : 'add'}</span>
              {mostrarForm ? 'Cancelar' : 'Crear mercado'}
            </button>

            {mostrarForm && (
              <div className="bg-white rounded-2xl p-5 elevation-l1 space-y-4">
                <h3 className="text-[16px] font-bold text-[#1a1c1c]">Nuevo mercado</h3>
                <form onSubmit={handleCrear} className="space-y-3">
                  <div>
                    <label className={labelClass}>Nombre del mercado *</label>
                    <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                      className={inputClass} placeholder="Feria de Primavera" required />
                  </div>
                  <div>
                    <label className={labelClass}>URL del logo (opcional)</label>
                    <input type="url" value={form.logo_url} onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                      className={inputClass} placeholder="https://..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Nombre de moneda *</label>
                      <input type="text" value={form.moneda_nombre} onChange={(e) => setForm({ ...form, moneda_nombre: e.target.value })}
                        className={inputClass} placeholder="Fichas" required />
                    </div>
                    <div>
                      <label className={labelClass}>Acrónimo *</label>
                      <input type="text" value={form.moneda_acronimo} onChange={(e) => setForm({ ...form, moneda_acronimo: e.target.value.toUpperCase() })}
                        className={inputClass} placeholder="FCH" maxLength={10} required />
                    </div>
                  </div>
                  <button type="submit" disabled={creando}
                    className="w-full h-12 bg-[#006492] text-white font-bold text-[15px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60">
                    {creando ? 'Creando...' : 'Crear mercado'}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

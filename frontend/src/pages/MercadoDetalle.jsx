import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMercado } from '../context/MercadoContext';
import { QRCodeSVG } from 'qrcode.react';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

export default function MercadoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const { refrescarMercados } = useMercado();

  const [tab, setTab] = useState(location.state?.tab || 'inicio');
  const [mercado, setMercado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Catálogo
  const [productos, setProductos] = useState([]);
  const [comprando, setComprando] = useState(null);
  const [compraOk, setCompraOk] = useState(null);

  // Historial
  const [historial, setHistorial] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  const [error, setError] = useState('');
  const [abandonando, setAbandonando] = useState(false);
  const [abandonError, setAbandonError] = useState('');
  const [confirmarAbandono, setConfirmarAbandono] = useState(false);
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  function copiarCodigo() {
    navigator.clipboard.writeText(mercado?.codigo || '').then(() => {
      setCodigoCopiado(true);
      setTimeout(() => setCodigoCopiado(false), 2000);
    });
  }

  function cargarMercado() { setCargando(true); setRefreshKey((k) => k + 1); }

  useEffect(() => {
    let mounted = true;
    api.get(`/mercados/${id}`)
      .then(({ data }) => { if (mounted) { setMercado(data); setCargando(false); } })
      .catch(() => { if (mounted) { setError('No podés ver este mercado o no existe'); setCargando(false); } });
    return () => { mounted = false; };
  }, [id, refreshKey]);

  useEffect(() => {
    if (tab === 'catalogo') {
      api.get(`/mercados/${id}/productos`).then(({ data }) => setProductos(data)).catch(() => {});
    }
    if (tab === 'historial') {
      api.get(`/mercados/${id}/transacciones`)
        .then(({ data }) => { setHistorial(data.data); setLoadingHist(false); })
        .catch(() => { setLoadingHist(false); });
    }
  }, [tab, id, usuario.id]);

  async function abandonar() {
    setAbandonando(true);
    setAbandonError('');
    try {
      await api.delete(`/mercados/${id}/abandonar`);
      await refrescarMercados();
      navigate('/mercados');
    } catch (err) {
      setAbandonError(err.response?.data?.error || 'Error al abandonar el mercado');
      setAbandonando(false);
      setConfirmarAbandono(false);
    }
  }

  async function comprar(prod) {
    setComprando(prod.id);
    setCompraOk(null);
    try {
      await api.post(`/mercados/${id}/comprar`, { producto_id: prod.id });
      setCompraOk(prod.id);
      cargarMercado();
      api.get(`/mercados/${id}/productos`).then(({ data }) => setProductos(data)).catch(() => {});
    } catch (err) {
      alert(err.response?.data?.error || 'Error al comprar');
    } finally {
      setComprando(null);
    }
  }

  if (cargando) return (
    <Layout titulo="Mercado">
      <div className="flex justify-center py-16"><Spinner size={40} /></div>
    </Layout>
  );

  if (error || !mercado) return (
    <Layout titulo="Mercado">
      <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error || 'Mercado no encontrado'}</div>
    </Layout>
  );

  const esCerrado = mercado.estado === 'cerrado';
  const cierra30 = mercado.estado === 'abierto' && mercado.notificacion_30_enviada;
  const joinUrl = `${window.location.origin}/mercados/unirse/${mercado.codigo}`;

  const TABS = [
    { id: 'inicio', icon: 'home', label: 'Inicio' },
    { id: 'catalogo', icon: 'shopping_bag', label: 'Tienda' },
    { id: 'historial', icon: 'receipt_long', label: 'Historial' },
  ];

  return (
    <Layout titulo={mercado.nombre}>
      <div className="space-y-4">
        {/* Banner cierre próximo */}
        {cierra30 && (
          <div className="bg-[#ffb950]/20 text-[#8a5000] rounded-xl px-4 py-3 text-[14px] font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">timer</span>
            ¡El mercado cierra en menos de 30 minutos! Cambiá tu dinero por bienes.
          </div>
        )}

        {esCerrado && (
          <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] font-semibold text-center">
            Este mercado está cerrado
          </div>
        )}

        {/* Tabs internos */}
        <div className="flex justify-center gap-1 pb-0.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#009ee3] text-white' : 'bg-white text-[#5f5e5e] elevation-l1'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── INICIO ── */}
        {tab === 'inicio' && (
          <div className="space-y-4">
            {/* Saldo */}
            <div className="bg-white rounded-2xl p-5 elevation-l1 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#009ee3]/5 rounded-full blur-xl pointer-events-none" />
              <p className="text-[12px] font-semibold text-[#5f5e5e] uppercase tracking-wider">Tu saldo en este mercado</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[42px] font-bold text-[#1a1c1c] tracking-tighter">{fmt(mercado.mi_saldo)}</span>
                <span className="text-[18px] font-bold text-[#5f5e5e]">{mercado.moneda_acronimo}</span>
              </div>
              <p className="text-[13px] text-[#5f5e5e] mt-2">{mercado.moneda_nombre}</p>
            </div>

            {/* Info */}
            <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">info</span>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">Código de acceso</p>
                </div>
                <button onClick={copiarCodigo} className="flex items-center gap-1.5 active:opacity-60 transition-opacity">
                  <span className="font-mono font-bold text-[18px] text-[#006492] tracking-widest">{mercado.codigo}</span>
                  <span className={`material-symbols-outlined text-[16px] transition-colors ${codigoCopiado ? 'text-[#006e2a]' : 'text-[#bec8d2]'}`}>
                    {codigoCopiado ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
              {mercado.hora_cierre && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">schedule</span>
                    <p className="text-[13px] font-semibold text-[#1a1c1c]">Cierra</p>
                  </div>
                  <span className="text-[13px] text-[#1a1c1c]">
                    {new Date(mercado.hora_cierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* QR de unirse */}
            <div className="bg-white rounded-2xl p-5 elevation-l1 flex flex-col items-center gap-3">
              <p className="text-[13px] font-semibold text-[#5f5e5e] uppercase tracking-wider">QR para unirse</p>
              <div className="p-3 bg-white rounded-xl border border-[#eeeeee]">
                <QRCodeSVG value={joinUrl} size={160} />
              </div>
              <p className="text-[12px] text-[#5f5e5e] text-center">Compartí este QR o el código <strong>{mercado.codigo}</strong></p>
            </div>

            {/* Cargar saldo (solo pseudo-admins) */}
            {mercado.es_pseudo_admin && (
              <button
                onClick={() => navigate(`/pseudo-admin/mercados/${id}`)}
                className="w-full h-12 bg-[#009ee3] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Cargar saldo a participantes
              </button>
            )}

            {/* Abandonar mercado (solo participantes, no admin) */}
            {mercado.admin_id !== usuario.id && (
              <div className="pt-2">
                {abandonError && (
                  <p className="text-[13px] text-[#ba1a1a] text-center mb-2">{abandonError}</p>
                )}
                {confirmarAbandono ? (
                  <div className="bg-[#ffdad6] rounded-2xl p-4 space-y-3">
                    <p className="text-[14px] font-semibold text-[#93000a] text-center">
                      ¿Abandonar "{mercado.nombre}"? Necesitás tener saldo en cero.
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setConfirmarAbandono(false)}
                        className="flex-1 h-11 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-[14px] rounded-full"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={abandonar}
                        disabled={abandonando}
                        className="flex-1 h-11 bg-[#ba1a1a] text-white font-bold text-[14px] rounded-full disabled:opacity-60"
                      >
                        {abandonando ? 'Abandonando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmarAbandono(true)}
                    className="w-full h-12 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-[14px] rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Abandonar mercado
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── CATÁLOGO ── */}
        {tab === 'catalogo' && (
          <div className="space-y-3">
            {productos.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">shopping_bag</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">El organizador no cargó productos aún</p>
              </div>
            ) : productos.map((prod) => (
              <div key={prod.id} className="bg-white rounded-2xl p-4 elevation-l1 flex items-start gap-3">
                {prod.imagen_url ? (
                  <img src={prod.imagen_url} alt={prod.nombre} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#f3f3f3] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#bec8d2] text-[28px]">shopping_cart</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1a1c1c] text-[15px]">{prod.nombre}</p>
                  {prod.descripcion && <p className="text-[12px] text-[#5f5e5e] mt-0.5 line-clamp-2">{prod.descripcion}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[18px] font-bold text-[#006492]">{fmt(prod.precio)}</span>
                      <span className="text-[12px] text-[#5f5e5e] ml-1">{mercado.moneda_acronimo}</span>
                      {prod.stock !== null && (
                        <span className="ml-2 text-[11px] text-[#5f5e5e]">Stock: {prod.stock}</span>
                      )}
                    </div>
                    {compraOk === prod.id ? (
                      <span className="text-[#006e2a] text-[13px] font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>¡Comprado!
                      </span>
                    ) : (
                      <button
                        onClick={() => comprar(prod)}
                        disabled={!!comprando || esCerrado || parseFloat(mercado.mi_saldo) < parseFloat(prod.precio)}
                        className="h-9 px-4 bg-[#009ee3] text-white font-bold text-[13px] rounded-xl disabled:opacity-40 active:scale-95 transition-all"
                      >
                        {comprando === prod.id ? '...' : 'Comprar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab === 'historial' && (
          <div>
            {loadingHist ? (
              <div className="flex justify-center py-8"><Spinner size={32} /></div>
            ) : historial.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">receipt_long</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">Sin movimientos en este mercado</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl elevation-l1 overflow-hidden">
                {historial.map((tx, i) => {
                  const esEntrada = tx.usuario_destino_id === usuario.id;
                  const icono = tx.tipo === 'carga' ? 'add_circle' : tx.tipo === 'compra' ? 'shopping_cart' : tx.tipo === 'devolucion' ? 'undo' : esEntrada ? 'south_west' : 'north_east';
                  return (
                    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i < historial.length - 1 ? 'border-b border-[#eeeeee]' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${esEntrada ? 'bg-[#00ac46]/10' : 'bg-[#009ee3]/10'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${esEntrada ? 'text-[#006e2a]' : 'text-[#006492]'}`}>{icono}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">
                          {tx.tipo === 'carga' ? 'Carga de saldo' : tx.tipo === 'devolucion' ? 'Devolución al cierre' : tx.tipo === 'compra' ? tx.descripcion : esEntrada ? `${tx.origen_nombre} ${tx.origen_apellido}` : `${tx.destino_nombre} ${tx.destino_apellido}`}
                        </p>
                        <p className="text-[12px] text-[#5f5e5e]">{new Date(tx.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-[15px] font-bold ${esEntrada ? 'text-[#006e2a]' : 'text-[#1a1c1c]'}`}>
                        {esEntrada ? '+' : '-'}{fmt(tx.monto)} {mercado.moneda_acronimo}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

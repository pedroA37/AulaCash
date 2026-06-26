import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

const ACCIONES = [
  {
    label: 'Transferir',
    icon: 'send',
    grad: 'linear-gradient(140deg, #00466a 0%, #006ea8 100%)',
    route: '/transferir',
  },
  {
    label: 'Cobrar',
    icon: 'qr_code_2',
    grad: 'linear-gradient(140deg, #004d1a 0%, #007a30 100%)',
    route: '/qr',
  },
  {
    label: 'Tienda',
    icon: 'shopping_bag',
    grad: 'linear-gradient(140deg, #3a006e 0%, #6a20b0 100%)',
    state: { tab: 'catalogo' },
  },
];

export default function Dashboard() {
  const { usuario } = useAuth();
  const { mercadoActivo, mercados, seleccionarMercado } = useMercado();
  const navigate = useNavigate();

  const [saldoVisible, setSaldoVisible] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [datosMercado, setDatosMercado] = useState(null);
  const [cargandoMercado, setCargandoMercado] = useState(false);
  const [datosMercadoAdmin, setDatosMercadoAdmin] = useState(null);

  const esAdmin = mercadoActivo?.admin_id === usuario?.id;
  const mercadosSeleccionables = mercados.filter((m) =>
    m.admin_id === usuario?.id ? m.estado !== 'cerrado' : m.estado === 'abierto'
  );
  const hayMercadoAbierto = mercadoActivo?.estado === 'abierto';
  const valorCombo = mercadoActivo ? String(mercadoActivo.id) : '';

  useEffect(() => {
    if (!mercadoActivo || !hayMercadoAbierto) { setMovimientos([]); return; }
    api.get(`/mercados/${mercadoActivo.id}/transacciones`, { params: { page: 1, limit: 5 } })
      .then(({ data }) => setMovimientos(data.data))
      .catch(() => {});
  }, [mercadoActivo?.id, hayMercadoAbierto]);

  useEffect(() => {
    if (!mercadoActivo || !usuario) { setDatosMercado(null); setDatosMercadoAdmin(null); return; }
    if (esAdmin) {
      api.get(`/admin/mercados/${mercadoActivo.id}`)
        .then(({ data }) => setDatosMercadoAdmin(data))
        .catch(() => {});
      return;
    }
    if (!hayMercadoAbierto) { setDatosMercado(null); return; }
    setCargandoMercado(true);
    api.get(`/mercados/${mercadoActivo.id}`)
      .then(({ data }) => setDatosMercado(data))
      .catch(() => {})
      .finally(() => setCargandoMercado(false));
  }, [mercadoActivo?.id, esAdmin, hayMercadoAbierto]);

  if (!usuario) return null;

  function handleCambioMercado(e) {
    const m = mercadosSeleccionables.find((x) => String(x.id) === e.target.value);
    seleccionarMercado(m || null);
  }

  const avatarInicial = `${usuario.nombre[0]}${usuario.apellido[0]}`;

  /* ══════════════════════════════════════════
     VISTA ADMIN
  ══════════════════════════════════════════ */
  if (esAdmin) {
    const d = datosMercadoAdmin;
    return (
      <Layout>
        {/* Header */}
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[13px] text-[#8a9aa6] font-medium">Bienvenido/a</p>
            <h1 className="text-[22px] font-bold text-[#1a1c1c] leading-tight">
              {usuario.nombre} {usuario.apellido}
            </h1>
          </div>
          <button
            onClick={() => navigate('/perfil')}
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[15px] active:scale-90 transition-transform"
            style={{ background: 'linear-gradient(135deg, #004f75, #009ee3)' }}
          >
            {avatarInicial}
          </button>
        </header>

        {/* Selector de mercado para admin */}
        {mercadosSeleccionables.length > 1 && (
          <div className="bg-white rounded-2xl p-4 elevation-l1 mb-3">
            <p className="text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider mb-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">storefront</span>
              Mercado activo
            </p>
            <div className="relative">
              <select
                value={valorCombo}
                onChange={handleCambioMercado}
                className="w-full h-11 px-4 pr-10 bg-[#f4f6f8] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[15px] font-semibold text-[#1a1c1c] appearance-none"
              >
                {mercadosSeleccionables.map((m) => (
                  <option key={m.id} value={String(m.id)}>{m.nombre}</option>
                ))}
              </select>
              <span className="material-symbols-outlined text-[#8a9aa6] text-[20px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
              </span>
            </div>
          </div>
        )}

        {!mercadoActivo ? (
          <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
            <div className="w-24 h-24 rounded-3xl bg-white elevation-l1 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#bec8d2] text-[52px]">storefront</span>
            </div>
            <div>
              <h2 className="text-[19px] font-bold text-[#1a1c1c] mb-1">Sin mercado activo</h2>
              <p className="text-[14px] text-[#8a9aa6]">Creá o seleccioná un mercado</p>
            </div>
            <button
              onClick={() => navigate('/mercados')}
              className="h-12 px-10 text-white font-bold text-[15px] rounded-full active:scale-95 transition-transform elevation-l1"
              style={{ background: 'linear-gradient(135deg, #006492, #009ee3)' }}
            >
              Gestionar mercados
            </button>
          </div>
        ) : !d ? (
          <div className="flex justify-center py-16"><Spinner size={36} /></div>
        ) : (
          <div className="space-y-3">
            <div className="bg-white rounded-3xl p-5 elevation-l1 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #e8f4fb, #c9e6ff)' }}>
                  <span className="material-symbols-outlined text-[#006492] text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}>storefront</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#1a1c1c] text-[17px]">{d.nombre}</p>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      d.estado === 'abierto'
                        ? 'bg-[#00ac46]/12 text-[#006e2a]'
                        : d.estado === 'cerrado'
                          ? 'bg-[#ffdad6] text-[#93000a]'
                          : 'bg-[#eeeeee] text-[#6e7881]'
                    }`}>
                      {d.estado === 'abierto' ? 'Abierto' : d.estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#8a9aa6] mt-0.5">{d.moneda_nombre} · <strong className="text-[#5f5e5e]">{d.codigo}</strong></p>
                </div>
              </div>

              {(d.estado === 'abierto' || d.estado === 'cerrado') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f4f6f8] rounded-2xl p-3 text-center">
                    <p className="text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider">Participantes</p>
                    <p className="text-[26px] font-bold text-[#1a1c1c] mt-0.5">{d.participantes?.length || 0}</p>
                  </div>
                  <div className="bg-[#f4f6f8] rounded-2xl p-3 text-center">
                    <p className="text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider">Circulación</p>
                    <p className="text-[18px] font-bold text-[#1a1c1c] mt-0.5">
                      {fmt(d.participantes?.reduce((s, p) => s + parseFloat(p.saldo || 0), 0) || 0)}
                    </p>
                    <p className="text-[11px] text-[#8a9aa6]">{d.moneda_acronimo}</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => navigate(`/mercados/${d.id}`)}
                className="w-full h-11 bg-[#006492]/8 text-[#006492] font-bold text-[14px] rounded-2xl flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
              >
                <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
                Gestionar mercado
              </button>
            </div>
          </div>
        )}
      </Layout>
    );
  }

  /* ══════════════════════════════════════════
     VISTA USUARIO
  ══════════════════════════════════════════ */
  const saldo = datosMercado?.mi_saldo ?? mercadoActivo?.saldo ?? 0;

  return (
    <Layout>
      {/* Header */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] text-[#8a9aa6] font-medium">Bienvenido/a</p>
          <h1 className="text-[22px] font-bold text-[#1a1c1c] leading-tight">
            {usuario.nombre} {usuario.apellido}
          </h1>
        </div>
        <button
          onClick={() => navigate('/perfil')}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-[15px] active:scale-90 transition-transform"
          style={{ background: 'linear-gradient(135deg, #009ee3, #006492)' }}
        >
          {avatarInicial}
        </button>
      </header>

      {/* ── Selector de mercado ── */}
      <div className="bg-white rounded-2xl p-4 elevation-l1 mb-3">
        <p className="text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">storefront</span>
          Mercado activo
        </p>
        {mercadosSeleccionables.length === 0 ? (
          <div className="flex items-center gap-2 py-0.5">
            <span className="material-symbols-outlined text-[#bec8d2] text-[20px]">storefront</span>
            <p className="text-[14px] text-[#8a9aa6]">No tenés mercados disponibles</p>
          </div>
        ) : (
          <div className="relative">
            <select
              value={valorCombo}
              onChange={handleCambioMercado}
              className="w-full h-11 px-4 pr-10 bg-[#f4f6f8] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[15px] font-semibold text-[#1a1c1c] appearance-none"
            >
              <option value="">Seleccioná un mercado</option>
              {mercadosSeleccionables.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.nombre}</option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[#8a9aa6] text-[20px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>
        )}
      </div>

      {/* ── Tarjeta de saldo ── */}
      {hayMercadoAbierto && (
        <div
          className="rounded-3xl p-5 mb-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(140deg, #00314a 0%, #005a84 55%, #007aad 100%)' }}
        >
          {/* Decoración */}
          <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute right-8 top-14 w-14 h-14 rounded-full bg-white/6 pointer-events-none" />
          <div className="absolute -left-6 -bottom-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

          {cargandoMercado ? (
            <div className="flex justify-center py-6">
              <Spinner size={30} color="rgba(255,255,255,0.6)" />
            </div>
          ) : (
            <div className="relative">
              <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">
                {mercadoActivo.nombre}
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-[46px] font-bold text-white tracking-tighter leading-none">
                  {saldoVisible ? fmt(saldo) : '·····'}
                </span>
                <span className="text-[18px] font-semibold text-white/50 self-end mb-1">
                  {mercadoActivo.moneda_acronimo}
                </span>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/15">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4cffaa] block" />
                  <p className="text-[12px] text-white/55">{mercadoActivo.moneda_nombre}</p>
                </div>
                <button
                  onClick={() => setSaldoVisible((v) => !v)}
                  className="text-white/50 active:text-white transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {saldoVisible ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Botones de acción ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {ACCIONES.map(({ label, icon, grad, route, state }) => (
          <button
            key={label}
            onClick={() => navigate(route ?? `/mercados/${mercadoActivo?.id}`, { state })}
            disabled={!hayMercadoAbierto}
            className="flex flex-col items-center justify-center gap-2.5 py-5 text-white rounded-2xl active:scale-95 transition-transform duration-[120ms] ease-out elevation-l1 disabled:opacity-30 disabled:pointer-events-none"
            style={{ background: grad }}
          >
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
              <span
                className="material-symbols-outlined text-[24px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {icon}
              </span>
            </div>
            <span className="text-[13px] font-semibold">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Últimos movimientos ── */}
      {hayMercadoAbierto && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-bold text-[#1a1c1c]">Últimos movimientos</h2>
            <button onClick={() => navigate('/historial')} className="text-[13px] text-[#006492] font-semibold">
              Ver todos
            </button>
          </div>

          {movimientos.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
              <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">receipt_long</span>
              <p className="text-[14px] text-[#8a9aa6] mt-2">Sin movimientos aún</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl elevation-l1 overflow-hidden">
              {movimientos.map((m, i) => {
                const esEntrada = m.usuario_destino_id === usuario.id;
                const esCarga = m.tipo === 'carga';
                const positivo = esEntrada || esCarga;
                const icono = esCarga
                  ? 'add_circle'
                  : m.tipo === 'compra'
                    ? 'shopping_cart'
                    : esEntrada ? 'south_west' : 'north_east';
                const label = esCarga
                  ? 'Carga de saldo'
                  : m.tipo === 'compra' && !esEntrada
                    ? (m.descripcion || 'Compra')
                    : esEntrada
                      ? `${m.origen_nombre || ''} ${m.origen_apellido || ''}`.trim() || 'Carga'
                      : `${m.destino_nombre} ${m.destino_apellido}`;
                return (
                  <div
                    key={m.id}
                    className={`flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-[#f4f6f8] ${
                      i < movimientos.length - 1 ? 'border-b border-[#f0f2f4]' : ''
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      positivo ? 'bg-[#00ac46]/12' : 'bg-[#009ee3]/10'
                    }`}>
                      <span
                        className={`material-symbols-outlined text-[20px] ${
                          positivo ? 'text-[#006e2a]' : 'text-[#006492]'
                        }`}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {icono}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">{label}</p>
                      <p className="text-[12px] text-[#8a9aa6]">
                        {new Date(m.created_at).toLocaleDateString('es-AR')}
                      </p>
                    </div>
                    <span className={`text-[15px] font-bold flex-shrink-0 ${
                      positivo ? 'text-[#006e2a]' : 'text-[#1a1c1c]'
                    }`}>
                      {positivo ? '+' : '-'}{fmt(m.monto)} {mercadoActivo.moneda_acronimo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Estado vacío ── */}
      {!mercadoActivo && mercadosSeleccionables.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white elevation-l1 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#bec8d2] text-[44px]">storefront</span>
          </div>
          <div>
            <p className="text-[17px] font-bold text-[#1a1c1c]">No estás en ningún mercado abierto</p>
            <p className="text-[13px] text-[#8a9aa6] mt-1">Uníte a un mercado para empezar</p>
          </div>
          <button
            onClick={() => navigate('/mercados')}
            className="h-12 px-8 text-white font-bold text-[15px] rounded-full active:scale-95 transition-transform elevation-l1"
            style={{ background: 'linear-gradient(135deg, #006492, #009ee3)' }}
          >
            Ver mis mercados
          </button>
        </div>
      )}
    </Layout>
  );
}

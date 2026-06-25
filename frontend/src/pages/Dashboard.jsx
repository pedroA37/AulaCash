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

export default function Dashboard() {
  const { usuario } = useAuth();
  const { mercadoActivo, mercados, seleccionarMercado } = useMercado();
  const navigate = useNavigate();

  const [saldoVisible, setSaldoVisible] = useState(true);
  const [movimientos, setMovimientos] = useState([]);
  const [datosMercado, setDatosMercado] = useState(null);
  const [cargandoMercado, setCargandoMercado] = useState(false);
  const [datosMercadoAdmin, setDatosMercadoAdmin] = useState(null);

  // Derivados (seguros aunque usuario sea null)
  const esAdmin = usuario?.rol === 'admin';
  const mercadosAbiertos = esAdmin ? [] : mercados.filter((m) => m.estado === 'abierto');
  const hayMercadoAbierto = mercadoActivo?.estado === 'abierto';
  const valorCombo = hayMercadoAbierto ? String(mercadoActivo.id) : '';

  // Todos los hooks antes de cualquier return condicional
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
    const m = mercadosAbiertos.find((x) => String(x.id) === e.target.value);
    seleccionarMercado(m || null);
  }

  /* ══════════════════════════════════════════
     VISTA ADMIN
  ══════════════════════════════════════════ */
  if (esAdmin) {
    const d = datosMercadoAdmin;
    return (
      <Layout>
        <header className="flex items-center justify-between mb-5">
          <div>
            <p className="text-[13px] text-[#5f5e5e]">Bienvenido/a</p>
            <h1 className="text-[22px] font-bold text-[#1a1c1c]">{usuario.nombre} {usuario.apellido}</h1>
          </div>
          <button onClick={() => navigate('/perfil')}
            className="w-10 h-10 rounded-full bg-[#006492] flex items-center justify-center text-white font-bold text-[16px]">
            {usuario.nombre[0]}{usuario.apellido[0]}
          </button>
        </header>

        {!mercadoActivo ? (
          <div className="flex flex-col items-center justify-center py-16 gap-5">
            <div className="w-24 h-24 rounded-full bg-[#f3f3f3] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#bec8d2] text-[52px]">storefront</span>
            </div>
            <div className="text-center px-4">
              <h2 className="text-[19px] font-bold text-[#1a1c1c] mb-2">No hay un mercado activo</h2>
              <p className="text-[14px] text-[#5f5e5e]">Creá o seleccioná un mercado para comenzar</p>
            </div>
            <button onClick={() => navigate('/mercados')}
              className="h-12 px-10 bg-[#009ee3] text-white font-bold text-[15px] rounded-full active:scale-95 transition-all elevation-l1">
              Gestionar mercados
            </button>
          </div>
        ) : !d ? (
          <div className="flex justify-center py-16"><Spinner size={36} /></div>
        ) : (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 elevation-l1 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-[#009ee3]/10 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-[#006492] text-[24px]">storefront</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-[#1a1c1c] text-[17px]">{d.nombre}</p>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${d.estado === 'abierto' ? 'bg-[#00ac46]/10 text-[#006e2a]' : d.estado === 'cerrado' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#eeeeee] text-[#5f5e5e]'}`}>
                      {d.estado === 'abierto' ? 'Abierto' : d.estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
                    </span>
                  </div>
                  <p className="text-[12px] text-[#5f5e5e] mt-0.5">{d.moneda_nombre} · Código: <strong>{d.codigo}</strong></p>
                </div>
              </div>
              {(d.estado === 'abierto' || d.estado === 'cerrado') && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f3f3f3] rounded-xl p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#6e7881] uppercase tracking-wider">Participantes</p>
                    <p className="text-[24px] font-bold text-[#1a1c1c] mt-1">{d.participantes?.length || 0}</p>
                  </div>
                  <div className="bg-[#f3f3f3] rounded-xl p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#6e7881] uppercase tracking-wider">Circulación</p>
                    <p className="text-[18px] font-bold text-[#1a1c1c] mt-1">
                      {fmt(d.participantes?.reduce((s, p) => s + parseFloat(p.saldo || 0), 0) || 0)}
                    </p>
                    <p className="text-[11px] text-[#5f5e5e]">{d.moneda_acronimo}</p>
                  </div>
                </div>
              )}
              <button onClick={() => navigate(`/mercados/${d.id}`)}
                className="w-full h-11 bg-[#009ee3]/10 text-[#006492] font-bold text-[14px] rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all">
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
  return (
    <Layout>
      <header className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] text-[#5f5e5e]">Bienvenido/a</p>
          <h1 className="text-[22px] font-bold text-[#1a1c1c]">{usuario.nombre} {usuario.apellido}</h1>
        </div>
        <button onClick={() => navigate('/perfil')}
          className="w-10 h-10 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[16px]">
          {usuario.nombre[0]}{usuario.apellido[0]}
        </button>
      </header>

      {/* ── Selector de mercado ── */}
      <div className="bg-white rounded-2xl p-4 elevation-l1 mb-4">
        <p className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider mb-2 flex items-center gap-1">
          <span className="material-symbols-outlined text-[15px]">storefront</span>
          Mercado activo
        </p>
        {mercadosAbiertos.length === 0 ? (
          <div className="flex items-center gap-2 py-1">
            <span className="material-symbols-outlined text-[#bec8d2] text-[20px]">storefront</span>
            <p className="text-[14px] text-[#5f5e5e]">No tenés mercados abiertos</p>
          </div>
        ) : (
          <div className="relative">
            <select
              value={valorCombo}
              onChange={handleCambioMercado}
              className="w-full h-12 px-4 pr-10 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[15px] font-semibold text-[#1a1c1c] appearance-none"
            >
              <option value="">Seleccioná un mercado</option>
              {mercadosAbiertos.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.nombre}</option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[#6e7881] text-[20px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>
        )}
      </div>

      {/* ── Saldo del mercado seleccionado ── */}
      {hayMercadoAbierto && (
        <div className="bg-white rounded-2xl p-5 elevation-l1 mb-4 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#009ee3]/5 rounded-full blur-xl pointer-events-none" />
          {cargandoMercado ? (
            <div className="flex justify-center py-3"><Spinner size={28} /></div>
          ) : (
            <>
              <p className="text-[12px] font-semibold text-[#5f5e5e] uppercase tracking-wider">{mercadoActivo.nombre}</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[40px] font-bold text-[#1a1c1c] tracking-tighter">
                  {saldoVisible ? fmt(datosMercado?.mi_saldo ?? mercadoActivo.saldo) : '••••••'}
                </span>
                <span className="text-[16px] font-bold text-[#5f5e5e]">{mercadoActivo.moneda_acronimo}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#eeeeee]">
                <p className="text-[12px] text-[#5f5e5e]">{mercadoActivo.moneda_nombre}</p>
                <button onClick={() => setSaldoVisible((v) => !v)} className="text-[#5f5e5e]">
                  <span className="material-symbols-outlined text-[18px]">
                    {saldoVisible ? 'visibility' : 'visibility_off'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Botones de acción ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: 'Transferir',  icon: 'send',         action: () => navigate('/transferir') },
          { label: 'Cobrar',      icon: 'qr_code_2',    action: () => navigate('/qr') },
          { label: 'Tienda',      icon: 'shopping_bag', action: () => navigate(`/mercados/${mercadoActivo?.id}`, { state: { tab: 'catalogo' } }) },
        ].map(({ label, icon, action }) => (
          <button
            key={label}
            onClick={action}
            disabled={!hayMercadoAbierto}
            className="flex flex-col items-center justify-center gap-2 py-4 bg-[#009ee3] text-white rounded-2xl font-bold active:scale-95 transition-all elevation-l1 disabled:opacity-30 disabled:pointer-events-none"
          >
            <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px]">{icon}</span>
            </div>
            <span className="text-[13px]">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Últimos movimientos ── */}
      {hayMercadoAbierto && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[17px] font-semibold text-[#1a1c1c]">Últimos movimientos</h2>
            <button onClick={() => navigate('/historial')} className="text-[13px] text-[#006492] font-semibold">Ver todos</button>
          </div>

          {movimientos.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
              <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">receipt_long</span>
              <p className="text-[14px] text-[#5f5e5e] mt-2">Sin movimientos aún</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl elevation-l1 overflow-hidden">
              {movimientos.map((m, i) => {
                const esEntrada = m.usuario_destino_id === usuario.id;
                const esCarga = m.tipo === 'carga';
                const icono = esCarga ? 'add_circle' : m.tipo === 'compra' ? 'shopping_cart' : esEntrada ? 'south_west' : 'north_east';
                const label = esCarga
                  ? 'Carga de saldo'
                  : m.tipo === 'compra' && !esEntrada
                    ? (m.descripcion || 'Compra')
                    : esEntrada
                      ? `${m.origen_nombre || ''} ${m.origen_apellido || ''}`.trim() || 'Carga'
                      : `${m.destino_nombre} ${m.destino_apellido}`;
                return (
                  <div key={m.id} className={`flex items-center gap-3 px-4 py-3 ${i < movimientos.length - 1 ? 'border-b border-[#eeeeee]' : ''}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${esEntrada || esCarga ? 'bg-[#00ac46]/10' : 'bg-[#009ee3]/10'}`}>
                      <span className={`material-symbols-outlined text-[20px] ${esEntrada || esCarga ? 'text-[#006e2a]' : 'text-[#006492]'}`}>{icono}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">{label}</p>
                      <p className="text-[12px] text-[#5f5e5e]">{new Date(m.created_at).toLocaleDateString('es-AR')}</p>
                    </div>
                    <span className={`text-[15px] font-bold flex-shrink-0 ${esEntrada || esCarga ? 'text-[#006e2a]' : 'text-[#1a1c1c]'}`}>
                      {esEntrada || esCarga ? '+' : '-'}{fmt(m.monto)} {mercadoActivo.moneda_acronimo}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Estado vacío ── */}
      {!hayMercadoAbierto && mercadosAbiertos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#f3f3f3] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#bec8d2] text-[44px]">storefront</span>
          </div>
          <div>
            <p className="text-[17px] font-bold text-[#1a1c1c]">No estás en ningún mercado abierto</p>
            <p className="text-[13px] text-[#5f5e5e] mt-1">Uníte a un mercado para empezar a operar</p>
          </div>
          <button onClick={() => navigate('/mercados')}
            className="h-12 px-8 bg-[#009ee3] text-white font-bold text-[15px] rounded-full active:scale-95 transition-all">
            Ver mis mercados
          </button>
        </div>
      )}
    </Layout>
  );
}

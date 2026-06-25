import { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

function SelectorMercado({ mercados, mercadoActivo, seleccionarMercado }) {
  const abiertos = mercados.filter((m) => m.estado === 'abierto');
  return (
    <div className="bg-white rounded-2xl p-4 elevation-l1 mb-5">
      <p className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider mb-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">storefront</span>
        Mercado
      </p>
      {abiertos.length === 0 ? (
        <p className="text-[14px] text-[#5f5e5e]">No tenés mercados abiertos en este momento</p>
      ) : (
        <select
          value={mercadoActivo?.id || ''}
          onChange={(e) => {
            const m = abiertos.find((x) => String(x.id) === e.target.value);
            seleccionarMercado(m || null);
          }}
          className="w-full h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[15px] text-[#1a1c1c]"
        >
          <option value="">Seleccionar mercado...</option>
          {abiertos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre} — {m.moneda_acronimo} · Saldo: {Number(m.saldo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function Transferir() {
  const { usuario } = useAuth();
  const { mercados, mercadoActivo, seleccionarMercado, refrescarMercados } = useMercado();
  const navigate = useNavigate();

  const [paso, setPaso] = useState(1); // 1: elegir, 2: confirmar, 3: éxito
  const [participantes, setParticipantes] = useState([]);
  const [cargandoPart, setCargandoPart] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [destinatario, setDestinatario] = useState(null);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    if (!mercadoActivo) return;
    setCargandoPart(true);
    api.get(`/mercados/${mercadoActivo.id}/participantes`)
      .then(({ data }) => setParticipantes(data.filter((p) => p.usuario_id !== usuario.id)))
      .catch(() => {})
      .finally(() => setCargandoPart(false));
  }, [mercadoActivo?.id]);

  const mercadoOk = mercadoActivo?.estado === 'abierto';
  const acronimo = mercadoActivo?.moneda_acronimo || '';

  const participantesFiltrados = busqueda.trim()
    ? participantes.filter((p) =>
        `${p.nombre} ${p.apellido} ${p.alias}`.toLowerCase().includes(busqueda.toLowerCase())
      )
    : participantes;

  async function confirmarTransferencia(e) {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setError('Monto inválido'); return; }
    if (montoNum > parseFloat(mercadoActivo.saldo)) { setError('Saldo insuficiente en el mercado'); return; }
    setError('');
    setCargando(true);
    try {
      await api.post(`/mercados/${mercadoActivo.id}/transferir`, {
        destino_usuario_id: destinatario.usuario_id,
        monto: montoNum,
        descripcion,
      });
      await refrescarMercados();
      setPaso(3);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al transferir');
    } finally {
      setCargando(false);
    }
  }

  return (
    <Layout titulo="Transferir">
      <SelectorMercado mercados={mercados} mercadoActivo={mercadoActivo} seleccionarMercado={seleccionarMercado} />

      {!mercadoOk ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3">
          <span className="material-symbols-outlined text-[#bec8d2] text-[48px]">storefront</span>
          <p className="text-[15px] text-[#5f5e5e]">Seleccioná un mercado abierto para transferir</p>
        </div>
      ) : null}

      {/* ── PASO 1: elegir destinatario ── */}
      {mercadoOk && paso === 1 && (
        <div className="space-y-5">
          <p className="text-[14px] text-[#5f5e5e]">
            Participantes de <span className="font-semibold text-[#1a1c1c]">{mercadoActivo.nombre}</span>
          </p>

          <div className="relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#6e7881]">search</span>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-white rounded-xl elevation-l1 outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
              placeholder="Buscar por nombre o alias..."
              autoFocus
            />
          </div>

          {cargandoPart ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : participantesFiltrados.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
              <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">group</span>
              <p className="text-[14px] text-[#5f5e5e] mt-2">
                {busqueda ? 'No se encontraron participantes' : 'No hay otros participantes en este mercado'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {participantesFiltrados.map((p) => (
                <button
                  key={p.usuario_id}
                  onClick={() => { setDestinatario(p); setPaso(2); setError(''); }}
                  className="w-full bg-white rounded-2xl p-4 elevation-l1 flex items-center gap-3 text-left active:scale-[0.98] transition-all"
                >
                  <div className="w-11 h-11 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[16px] flex-shrink-0">
                    {p.nombre[0]}{p.apellido[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a1c1c]">{p.nombre} {p.apellido}</p>
                    <p className="text-[12px] text-[#5f5e5e]">{p.alias}</p>
                  </div>
                  <span className="material-symbols-outlined text-[#bec8d2]">chevron_right</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PASO 2: ingresar monto ── */}
      {mercadoOk && paso === 2 && destinatario && (
        <form onSubmit={confirmarTransferencia} className="space-y-5">
          <div className="bg-white rounded-2xl p-4 elevation-l1 flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[18px]">
              {destinatario.nombre[0]}{destinatario.apellido[0]}
            </div>
            <div>
              <p className="font-semibold text-[#1a1c1c]">{destinatario.nombre} {destinatario.apellido}</p>
              <p className="text-[12px] text-[#5f5e5e]">{destinatario.alias}</p>
            </div>
            <button
              type="button"
              onClick={() => { setPaso(1); setDestinatario(null); setError(''); setMonto(''); }}
              className="ml-auto text-[#6e7881]"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          {error && (
            <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>
          )}

          <div className="bg-white rounded-2xl p-5 elevation-l1 space-y-4">
            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Monto</label>
              <div className="flex items-baseline gap-2 mt-1 border-b-2 border-[#bec8d2] focus-within:border-[#009ee3] pb-2 transition-colors">
                <span className="text-[20px] font-bold text-[#009ee3]">{acronimo}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[32px] font-bold text-[#1a1c1c] placeholder:text-[#dadada]"
                  placeholder="0,00"
                  required
                />
              </div>
              <p className="text-[12px] text-[#5f5e5e] mt-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">account_balance_wallet</span>
                Tu saldo: <span className="font-bold text-[#1a1c1c]">{fmt(mercadoActivo.saldo)} {acronimo}</span>
              </p>
            </div>

            <div>
              <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Concepto (opcional)</label>
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                placeholder="ej: Comida, alquiler..."
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={!monto || cargando}
            className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {cargando ? 'Transfiriendo...' : 'Confirmar transferencia'}
          </button>
        </form>
      )}

      {/* ── PASO 3: éxito ── */}
      {mercadoOk && paso === 3 && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-[#00ac46]/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[#006e2a] text-[40px]">check_circle</span>
          </div>
          <h2 className="text-[22px] font-bold text-[#1a1c1c]">¡Transferencia exitosa!</h2>
          <p className="text-[14px] text-[#5f5e5e]">
            Enviaste{' '}
            <span className="font-bold text-[#1a1c1c]">
              {Number(monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {acronimo}
            </span>
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full max-w-xs h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg"
          >
            Volver al inicio
          </button>
        </div>
      )}
    </Layout>
  );
}

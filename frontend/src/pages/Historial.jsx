import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import Comprobante from '../components/Comprobante';
import api from '../services/api';

function formatSaldo(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

const TIPO_LABELS = {
  transferencia: 'Transferencia',
  carga: 'Carga de saldo',
  compra: 'Compra',
  devolucion: 'Devolución',
};

function SelectorMercado({ mercados, mercadoActivo, seleccionarMercado, usuarioId }) {
  const seleccionables = mercados.filter((m) =>
    m.admin_id === usuarioId ? m.estado !== 'cerrado' : m.estado === 'abierto'
  );
  return (
    <div className="bg-white rounded-2xl p-4 elevation-l1 mb-4">
      <p className="text-[11px] font-bold text-[#8a9aa6] uppercase tracking-wider mb-2 flex items-center gap-1">
        <span className="material-symbols-outlined text-[14px]">storefront</span>
        Mercado activo
      </p>
      {seleccionables.length === 0 ? (
        <div className="flex items-center gap-2 py-0.5">
          <span className="material-symbols-outlined text-[#bec8d2] text-[20px]">storefront</span>
          <p className="text-[14px] text-[#8a9aa6]">No tenés mercados disponibles</p>
        </div>
      ) : (
        <div className="relative">
          <select
            value={mercadoActivo ? String(mercadoActivo.id) : ''}
            onChange={(e) => {
              const m = seleccionables.find((x) => String(x.id) === e.target.value);
              seleccionarMercado(m || null);
            }}
            className="w-full h-11 px-4 pr-10 bg-[#f4f6f8] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[15px] font-semibold text-[#1a1c1c] appearance-none"
          >
            <option value="">Seleccioná un mercado</option>
            {seleccionables.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.nombre}{m.admin_id === usuarioId ? ' (tuyo)' : ''}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined text-[#8a9aa6] text-[20px] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            expand_more
          </span>
        </div>
      )}
    </div>
  );
}

export default function Historial() {
  const { usuario } = useAuth();
  const { mercados, mercadoActivo, seleccionarMercado } = useMercado();
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [seleccionada, setSeleccionada] = useState(null);
  const LIMIT = 20;

  useEffect(() => {
    if (!mercadoActivo) return;
    setCargando(true);
    api.get(`/mercados/${mercadoActivo.id}/transacciones`, { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        setMovimientos(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [page, mercadoActivo?.id]);

  return (
    <Layout titulo="Historial">
      <SelectorMercado mercados={mercados} mercadoActivo={mercadoActivo} seleccionarMercado={seleccionarMercado} usuarioId={usuario?.id} />

      {!mercadoActivo ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center gap-3">
          <span className="material-symbols-outlined text-[#bec8d2] text-[48px]">receipt_long</span>
          <p className="text-[15px] text-[#5f5e5e]">Seleccioná un mercado para ver el historial</p>
        </div>
      ) : cargando ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : movimientos.length === 0 && page === 1 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-3">
          <span className="material-symbols-outlined text-[#bec8d2] text-[48px]">receipt_long</span>
          <p className="text-[15px] text-[#5f5e5e]">No tenés movimientos aún</p>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-[#6e7881] mb-3">{total} movimiento{total !== 1 ? 's' : ''} en total</p>

          <div className="space-y-2">
            {movimientos.map((m) => {
              const esEntrada = m.usuario_destino_id === usuario.id;
              const esCarga = m.tipo === 'carga';
              const esCompra = m.tipo === 'compra';
              const positivo = esEntrada || esCarga;
              const icono = esCarga ? 'add_circle' : esCompra ? 'shopping_cart' : esEntrada ? 'south_west' : 'north_east';
              const label = esCarga
                ? 'Carga de saldo'
                : esCompra && !esEntrada
                  ? (m.descripcion || 'Compra')
                  : esEntrada
                    ? `De: ${m.origen_nombre} ${m.origen_apellido}`
                    : `A: ${m.destino_nombre} ${m.destino_apellido}`;
              const fecha = new Date(m.created_at);
              const acronimo = mercadoActivo?.moneda_acronimo || '';

              return (
                <button key={m.id} onClick={() => setSeleccionada(m)} className="w-full bg-white rounded-2xl p-4 elevation-l1 flex items-center gap-3 active:scale-[0.98] transition-all text-left">
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${positivo ? 'bg-[#00ac46]/10' : 'bg-[#009ee3]/10'}`}>
                    <span className={`material-symbols-outlined text-[20px] ${positivo ? 'text-[#006e2a]' : 'text-[#006492]'}`}>
                      {icono}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">{label}</p>
                    <p className="text-[12px] text-[#5f5e5e]">
                      {TIPO_LABELS[m.tipo] || m.tipo} · {fecha.toLocaleDateString('es-AR')} {fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    {m.descripcion && !esCompra && (
                      <p className="text-[12px] text-[#6e7881] truncate">{m.descripcion}</p>
                    )}
                  </div>
                  <span className={`text-[15px] font-bold flex-shrink-0 ${positivo ? 'text-[#006e2a]' : 'text-[#ba1a1a]'}`}>
                    {positivo ? '+' : '-'}{formatSaldo(m.monto)} {acronimo}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 h-10 px-4 rounded-xl bg-white elevation-l1 text-[14px] font-semibold text-[#006492] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Anterior
              </button>

              <span className="text-[13px] text-[#5f5e5e] font-semibold">
                {page} / {totalPages}
              </span>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="flex items-center gap-1 h-10 px-4 rounded-xl bg-white elevation-l1 text-[14px] font-semibold text-[#006492] disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all"
              >
                Siguiente
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </div>
          )}
        </>
      )}

      {seleccionada && (
        <Comprobante transaccion={seleccionada} onClose={() => setSeleccionada(null)} />
      )}
    </Layout>
  );
}

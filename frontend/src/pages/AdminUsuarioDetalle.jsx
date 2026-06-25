import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatSaldo(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

const TIPO_LABELS = { transferencia: 'Transferencia', carga: 'Carga de saldo', compra: 'Compra', devolucion: 'Devolución' };

export default function AdminUsuarioDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario: adminActual } = useAuth();
  const [usuario, setUsuario] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [eliminando, setEliminando] = useState(false);
  const [confirmarEliminar, setConfirmarEliminar] = useState(false);
  const [cambiandoRol, setCambiandoRol] = useState(false);
  const [error, setError] = useState('');
  const LIMIT = 20;

  useEffect(() => {
    api.get(`/admin/usuarios/${id}`)
      .then(({ data }) => setUsuario(data))
      .catch(() => navigate(-1));
  }, [id]);

  useEffect(() => {
    setCargando(true);
    api.get(`/admin/usuarios/${id}/transacciones`, { params: { page, limit: LIMIT } })
      .then(({ data }) => {
        setMovimientos(data.data);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [id, page]);

  async function handleCambiarRol() {
    setCambiandoRol(true);
    setError('');
    const nuevoRol = usuario.rol === 'admin' ? 'user' : 'admin';
    try {
      const { data } = await api.patch(`/admin/usuarios/${id}/rol`, { rol: nuevoRol });
      setUsuario((u) => ({ ...u, rol: data.rol }));
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar el rol');
    } finally {
      setCambiandoRol(false);
    }
  }

  async function handleEliminar() {
    setEliminando(true);
    setError('');
    try {
      await api.delete(`/admin/usuarios/${id}`);
      navigate(-1);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al eliminar el usuario');
      setConfirmarEliminar(false);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div className="min-h-dvh flex flex-col bg-[#f9f9f9]">
      {/* Header */}
      <header className="sticky top-0 z-40 flex items-center h-16 px-5 bg-[#f9f9f9] shadow-[0_1px_0_rgba(0,0,0,0.06)] gap-3">
        <button onClick={() => navigate(-1)} className="p-1 text-[#006492]">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="text-[18px] font-bold text-[#006492]">Detalle de usuario</h1>
      </header>

      <main className="flex-1 pb-8 px-5 py-5 max-w-xl mx-auto w-full space-y-4">
        {/* Card del usuario */}
        {usuario && (
          <div className="bg-white rounded-2xl p-5 elevation-l1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[20px] flex-shrink-0">
                {usuario.nombre[0]}{usuario.apellido[0]}
              </div>
              <div>
                <p className="font-bold text-[#1a1c1c] text-[17px]">{usuario.nombre} {usuario.apellido}</p>
                <p className="text-[13px] text-[#5f5e5e]">{usuario.email}</p>
                {usuario.rol === 'admin' && (
                  <span className="text-[11px] text-[#006492] font-semibold">administrador</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'DNI', value: usuario.dni },
                { label: 'Alias', value: usuario.alias },
                { label: 'CBU', value: usuario.cbu.slice(0, 10) + '...' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#f3f3f3] rounded-xl p-3">
                  <p className="text-[11px] text-[#6e7881] uppercase tracking-wider">{label}</p>
                  <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">{value}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                sessionStorage.setItem('admin_cargar_id', String(usuario.id));
                navigate(-1);
              }}
              className="w-full mt-4 h-11 bg-[#009ee3]/10 text-[#006492] font-semibold text-[14px] rounded-xl"
            >
              Cargar saldo a este usuario
            </button>

            {adminActual?.id !== usuario.id && (
              <>
                <button
                  onClick={handleCambiarRol}
                  disabled={cambiandoRol}
                  className={`w-full mt-2 h-11 font-semibold text-[14px] rounded-xl border-2 active:scale-[0.98] transition-all disabled:opacity-60 ${
                    usuario.rol === 'admin'
                      ? 'border-[#5f5e5e] text-[#5f5e5e]'
                      : 'border-[#006492] text-[#006492]'
                  }`}
                >
                  {cambiandoRol
                    ? 'Guardando...'
                    : usuario.rol === 'admin'
                      ? 'Quitar rol de admin'
                      : 'Promover a admin'}
                </button>

                <button
                  onClick={() => setConfirmarEliminar(true)}
                  className="w-full mt-2 h-11 border-2 border-[#ba1a1a] text-[#ba1a1a] font-semibold text-[14px] rounded-xl active:scale-[0.98] transition-all"
                >
                  Eliminar usuario
                </button>
              </>
            )}

            {error && (
              <div className="mt-2 bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>
            )}
          </div>
        )}

        {/* Modal confirmación eliminar */}
        {confirmarEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-5 bg-black/40">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl space-y-4">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-14 h-14 rounded-full bg-[#ffdad6] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[#ba1a1a] text-[28px]">delete_forever</span>
                </div>
                <h3 className="text-[18px] font-bold text-[#1a1c1c]">¿Eliminar usuario?</h3>
                <p className="text-[14px] text-[#5f5e5e]">
                  Se eliminará <span className="font-semibold text-[#1a1c1c]">{usuario?.nombre} {usuario?.apellido}</span> junto con todo su historial de transacciones. Esta acción no se puede deshacer.
                </p>
              </div>
              <button
                onClick={handleEliminar}
                disabled={eliminando}
                className="w-full h-12 bg-[#ba1a1a] text-white font-bold text-[15px] rounded-full disabled:opacity-60 active:scale-[0.98] transition-all"
              >
                {eliminando ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
              <button
                onClick={() => setConfirmarEliminar(false)}
                disabled={eliminando}
                className="w-full h-10 text-[#5f5e5e] text-[14px] font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Historial */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[16px] font-semibold text-[#1a1c1c]">Movimientos ({total})</h2>
          </div>

          {cargando ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : movimientos.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
              <span className="material-symbols-outlined text-[#bec8d2] text-[36px]">receipt_long</span>
              <p className="text-[14px] text-[#5f5e5e] mt-2">Sin movimientos</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {movimientos.map((m) => {
                  const esEntrada = m.usuario_destino_id === parseInt(id);
                  const fecha = new Date(m.created_at);
                  return (
                    <div key={m.id} className="bg-white rounded-2xl p-4 elevation-l1 flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${esEntrada || m.tipo === 'carga' ? 'bg-[#00ac46]/10' : 'bg-[#009ee3]/10'}`}>
                        <span className={`material-symbols-outlined text-[18px] ${esEntrada || m.tipo === 'carga' ? 'text-[#006e2a]' : 'text-[#006492]'}`}>
                          {m.tipo === 'carga' ? 'add_circle' : m.tipo === 'compra' ? 'shopping_cart' : esEntrada ? 'south_west' : 'north_east'}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1a1c1c] truncate">
                          {m.tipo === 'carga'
                            ? 'Carga por admin'
                            : m.tipo === 'compra' && !esEntrada
                              ? (m.descripcion || 'Compra')
                              : esEntrada
                                ? `De: ${m.origen_nombre} ${m.origen_apellido}`
                                : `A: ${m.destino_nombre} ${m.destino_apellido}`}
                        </p>
                        <p className="text-[11px] text-[#5f5e5e]">
                          {TIPO_LABELS[m.tipo] || m.tipo} · {m.mercado_nombre} · {fecha.toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <span className={`text-[14px] font-bold flex-shrink-0 ${esEntrada || m.tipo === 'carga' ? 'text-[#006e2a]' : 'text-[#ba1a1a]'}`}>
                        {esEntrada || m.tipo === 'carga' ? '+' : '-'}{formatSaldo(m.monto)} {m.moneda_acronimo}
                      </span>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 h-10 px-4 rounded-xl bg-white elevation-l1 text-[13px] font-semibold text-[#006492] disabled:opacity-40 active:scale-95 transition-all"
                  >
                    <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                    Anterior
                  </button>
                  <span className="text-[13px] text-[#5f5e5e] font-semibold">{page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 h-10 px-4 rounded-xl bg-white elevation-l1 text-[13px] font-semibold text-[#006492] disabled:opacity-40 active:scale-95 transition-all"
                  >
                    Siguiente
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

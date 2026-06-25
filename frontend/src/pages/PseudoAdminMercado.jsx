import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

export default function PseudoAdminMercado() {
  const { id } = useParams();
  const [mercado, setMercado] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [modalUser, setModalUser] = useState(null);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [cargandoSaldo, setCargandoSaldo] = useState(false);
  const [cargaError, setCargaError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/pseudo-admin/mercados'),
      api.get(`/pseudo-admin/mercados/${id}/participantes`),
    ]).then(([mercadosRes, partRes]) => {
      const m = mercadosRes.data.find((x) => String(x.id) === String(id));
      setMercado(m || null);
      setParticipantes(partRes.data);
    }).catch(() => {
      setError('No tenés acceso a este mercado o no existe');
    }).finally(() => setCargando(false));
  }, [id]);

  async function handleCargar(e) {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setCargaError('Monto inválido'); return; }
    setCargandoSaldo(true); setCargaError('');
    try {
      await api.post(`/pseudo-admin/mercados/${id}/cargar`, {
        usuario_id: modalUser.usuario_id,
        monto: montoNum,
        descripcion: descripcion || undefined,
      });
      setMensaje(`Se cargaron ${fmt(montoNum)} ${mercado?.moneda_acronimo || ''} a ${modalUser.nombre} ${modalUser.apellido}`);
      setModalUser(null);
      setMonto('');
      setDescripcion('');
      setTimeout(() => setMensaje(''), 4000);
      const { data } = await api.get(`/pseudo-admin/mercados/${id}/participantes`);
      setParticipantes(data);
    } catch (err) {
      setCargaError(err.response?.data?.error || 'Error al cargar saldo');
    } finally {
      setCargandoSaldo(false);
    }
  }

  if (cargando) return <Layout titulo="Cargar saldo"><div className="flex justify-center py-16"><Spinner size={40} /></div></Layout>;

  if (error || !mercado) return (
    <Layout titulo="Cargar saldo">
      <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error || 'Mercado no encontrado'}</div>
    </Layout>
  );

  return (
    <Layout titulo={`${mercado.nombre} — Carga`}>
      <div className="space-y-4">
        {mensaje && <div className="bg-[#00ac46]/10 text-[#006e2a] rounded-xl px-4 py-3 text-[14px] font-semibold">{mensaje}</div>}

        <div className="bg-white rounded-2xl p-4 elevation-l1">
          <p className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Mercado</p>
          <p className="text-[18px] font-bold text-[#1a1c1c] mt-1">{mercado.nombre}</p>
          <p className="text-[13px] text-[#5f5e5e]">Moneda: {mercado.moneda_nombre} ({mercado.moneda_acronimo})</p>
          {mercado.estado !== 'abierto' && (
            <div className="mt-2 bg-[#ffdad6] text-[#93000a] rounded-xl px-3 py-2 text-[13px]">El mercado no está abierto</div>
          )}
        </div>

        <p className="text-[14px] font-semibold text-[#1a1c1c]">Seleccioná el participante:</p>

        {participantes.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
            <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">group</span>
            <p className="text-[14px] text-[#5f5e5e] mt-2">Sin participantes aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {participantes.map((p) => (
              <button
                key={p.usuario_id}
                onClick={() => { setModalUser(p); setMonto(''); setDescripcion(''); setCargaError(''); }}
                disabled={mercado.estado !== 'abierto'}
                className="w-full bg-white rounded-2xl p-4 elevation-l1 flex items-center gap-3 text-left active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                  {p.nombre[0]}{p.apellido[0]}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1a1c1c]">{p.nombre} {p.apellido}</p>
                  <p className="text-[12px] text-[#5f5e5e]">{p.alias}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1a1c1c]">{fmt(p.saldo)}</p>
                  <p className="text-[11px] text-[#5f5e5e]">{mercado.moneda_acronimo}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Modal cargar saldo */}
        {modalUser && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
            <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 space-y-4 pb-[max(20px,env(safe-area-inset-bottom))]">
              <div className="flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-[#1a1c1c]">Cargar saldo</h3>
                <button onClick={() => setModalUser(null)} className="p-1 text-[#6e7881]">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="flex items-center gap-3 bg-[#f3f3f3] rounded-xl p-3">
                <div className="w-10 h-10 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[14px]">
                  {modalUser.nombre[0]}{modalUser.apellido[0]}
                </div>
                <div>
                  <p className="font-semibold text-[#1a1c1c]">{modalUser.nombre} {modalUser.apellido}</p>
                  <p className="text-[12px] text-[#5f5e5e]">Saldo: {fmt(modalUser.saldo)} {mercado.moneda_acronimo}</p>
                </div>
              </div>

              {cargaError && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{cargaError}</div>}

              <form onSubmit={handleCargar} className="space-y-3">
                <div className="border-b-2 border-[#bec8d2] focus-within:border-[#009ee3] pb-2 flex items-baseline gap-2 transition-colors">
                  <span className="text-[28px] font-bold text-[#009ee3]">{mercado.moneda_acronimo}</span>
                  <input
                    type="text" inputMode="decimal" value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[28px] font-bold text-[#1a1c1c] placeholder:text-[#dadada]"
                    placeholder="0,00" autoFocus required
                  />
                </div>
                <div>
                  <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Motivo (opcional)</label>
                  <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
                    className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                    placeholder="ej: por bienes entregados..." />
                </div>
                <button type="submit" disabled={cargandoSaldo}
                  className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60">
                  {cargandoSaldo ? 'Cargando...' : 'Confirmar carga'}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

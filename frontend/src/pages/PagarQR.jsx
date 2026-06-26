import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import api from '../services/api';

export default function PagarQR() {
  const { token } = useParams();
  const { usuario, cargando: authCargando } = useAuth();
  const navigate = useNavigate();
  const [qrInfo, setQrInfo] = useState(null);
  const [estado, setEstado] = useState('cargando'); // 'cargando' | 'confirmar' | 'pagando' | 'exito' | 'error'
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    if (authCargando) return;
    if (!usuario) {
      // Guardar el destino para redirigir después del login
      sessionStorage.setItem('redirect_after_login', `/pagar/${token}`);
      navigate('/login');
      return;
    }

    api.get(`/cuenta/qr/${token}`)
      .then(({ data }) => {
        setQrInfo(data);
        setEstado('confirmar');
      })
      .catch((err) => {
        setMensajeError(err.response?.data?.error || 'QR inválido o expirado');
        setEstado('error');
      });
  }, [token, usuario, authCargando]);

  async function confirmarPago() {
    setEstado('pagando');
    try {
      await api.post('/cuenta/qr/cobrar', { token });
      setEstado('exito');
    } catch (err) {
      setMensajeError(err.response?.data?.error || 'Error al procesar el pago');
      setEstado('error');
    }
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-5 bg-[#f9f9f9]">
      <div className="w-full max-w-sm">

        {/* Cargando */}
        {(estado === 'cargando' || estado === 'pagando') && (
          <div className="flex flex-col items-center gap-4">
            <Spinner size={40} />
            <p className="text-[15px] text-[#5f5e5e]">
              {estado === 'pagando' ? 'Procesando pago...' : 'Verificando QR...'}
            </p>
          </div>
        )}

        {/* Confirmar */}
        {estado === 'confirmar' && qrInfo && (
          <div className="space-y-5">
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-2xl bg-[#009ee3] flex items-center justify-center mx-auto mb-3">
                <span className="material-symbols-outlined text-white text-[28px]">qr_code_2</span>
              </div>
              <h1 className="text-[22px] font-bold text-[#1a1c1c]">Confirmar pago</h1>
            </div>

            <div className="bg-white rounded-2xl p-5 elevation-l1 space-y-3">
              <div>
                <p className="text-[12px] text-[#5f5e5e] uppercase tracking-wider">Cobrador</p>
                <p className="font-bold text-[#1a1c1c] text-[17px]">{qrInfo.nombre} {qrInfo.apellido}</p>
                <p className="text-[13px] text-[#5f5e5e]">{qrInfo.alias}</p>
              </div>
              <div className="border-t border-[#eeeeee] pt-3">
                <p className="text-[12px] text-[#5f5e5e] uppercase tracking-wider">Monto</p>
                <p className="text-[36px] font-bold text-[#1a1c1c] tracking-tighter">
                  {Number(qrInfo.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {qrInfo.moneda_acronimo}
                </p>
                {qrInfo.mercado_nombre && (
                  <p className="text-[12px] text-[#5f5e5e] mt-1">Mercado: {qrInfo.mercado_nombre}</p>
                )}
              </div>
            </div>

            <button
              onClick={confirmarPago}
              className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all"
            >
              Pagar ahora
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-12 text-[#5f5e5e] text-[14px] font-semibold"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Éxito */}
        {estado === 'exito' && (
          <div className="flex flex-col items-center text-center space-y-4 animate-fadeUp">
            <div className="w-20 h-20 rounded-full bg-[#00ac46]/10 flex items-center justify-center animate-popIn">
              <span className="material-symbols-outlined text-[#006e2a] text-[40px]">check_circle</span>
            </div>
            <h2 className="text-[24px] font-bold text-[#1a1c1c]">¡Pago exitoso!</h2>
            <p className="text-[14px] text-[#5f5e5e]">
              Pagaste {Number(qrInfo?.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {qrInfo?.moneda_acronimo} a {qrInfo?.nombre} {qrInfo?.apellido}
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg mt-2"
            >
              Ir al inicio
            </button>
          </div>
        )}

        {/* Error */}
        {estado === 'error' && (
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#ffdad6] flex items-center justify-center">
              <span className="material-symbols-outlined text-[#ba1a1a] text-[40px]">error</span>
            </div>
            <h2 className="text-[22px] font-bold text-[#1a1c1c]">No se pudo procesar</h2>
            <p className="text-[14px] text-[#5f5e5e]">{mensajeError}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg mt-2"
            >
              Volver al inicio
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

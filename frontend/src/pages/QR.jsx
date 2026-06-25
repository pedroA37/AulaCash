import { useState, useEffect, useRef } from 'react';
import { Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

const SOPORTA_BARCODE = 'BarcodeDetector' in window;

export default function QR() {
  const { mercadoActivo } = useMercado();
  const [tab, setTab] = useState('generar');
  const [monto, setMonto] = useState('');
  const [qrData, setQrData] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  if (!mercadoActivo || mercadoActivo.estado !== 'abierto') return <Navigate to="/dashboard" replace />;

  const acronimo = mercadoActivo.moneda_acronimo;

  async function generarQR(e) {
    e.preventDefault();
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) { setError('Monto inválido'); return; }
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/cuenta/qr/generar', { monto: montoNum, mercado_id: mercadoActivo.id });
      setQrData(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al generar QR');
    } finally {
      setCargando(false);
    }
  }

  function formatExpiracion(fecha) {
    return new Date(fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <Layout titulo="Cobrar con QR">
      {/* Tabs */}
      <div className="flex bg-[#eeeeee] rounded-xl p-1 mb-6">
        {['generar', 'escanear'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-10 rounded-lg text-[14px] font-semibold transition-all ${
              tab === t ? 'bg-white text-[#006492] elevation-l1' : 'text-[#5f5e5e]'
            }`}
          >
            {t === 'generar' ? 'Generar QR' : 'Escanear QR'}
          </button>
        ))}
      </div>

      {tab === 'generar' && (
        <div className="space-y-5">
          {!qrData ? (
            <form onSubmit={generarQR} className="space-y-5">
              <div className="bg-white rounded-2xl p-5 elevation-l1">
                <label className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">Monto a cobrar</label>
                <div className="flex items-baseline gap-2 mt-2 border-b-2 border-[#bec8d2] focus-within:border-[#009ee3] pb-2 transition-colors">
                  <span className="text-[20px] font-bold text-[#009ee3]">{acronimo}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-[32px] font-bold text-[#1a1c1c] placeholder:text-[#dadada]"
                    placeholder="0,00"
                  />
                </div>
                {error && <p className="text-[#ba1a1a] text-[13px] mt-2">{error}</p>}
              </div>

              <button
                type="submit"
                disabled={!monto || cargando}
                className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {cargando ? <Spinner size={22} color="#fff" /> : null}
                {cargando ? 'Generando...' : 'Generar código QR'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-white rounded-2xl p-6 elevation-l1 flex flex-col items-center gap-4 w-full">
                <p className="text-[14px] text-[#5f5e5e]">Mostrá este QR para cobrar</p>
                {/* w-fit centra el wrapper al monto exacto del SVG */}
                <div className="p-3 rounded-xl border border-[#eeeeee] w-fit">
                  <QRCodeSVG
                    value={`${window.location.origin}/pagar/${qrData.token}`}
                    size={220}
                    fgColor="#006492"
                    style={{ display: 'block' }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[32px] font-bold text-[#1a1c1c]">
                    {Number(qrData.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} {qrData.moneda_acronimo || acronimo}
                  </p>
                  <p className="text-[12px] text-[#5f5e5e] mt-1">
                    Expira a las {formatExpiracion(qrData.expires_at)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setQrData(null); setMonto(''); }}
                className="w-full h-12 border-2 border-[#009ee3] text-[#006492] font-bold text-[15px] rounded-full active:scale-[0.98] transition-all"
              >
                Generar otro QR
              </button>
            </div>
          )}
        </div>
      )}

      {tab === 'escanear' && <EscanearQR />}
    </Layout>
  );
}

function EscanearQR() {
  const [modo, setModo] = useState('camara');
  const [qrInfo, setQrInfo] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Para BarcodeDetector nativo
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const activoRef = useRef(false);

  // Para html5-qrcode fallback
  const html5QrRef = useRef(null);

  useEffect(() => {
    iniciarCamara();
    return detenerCamara;
  }, []);

  function detenerCamara() {
    activoRef.current = false;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
    }
  }

  async function iniciarCamara() {
    setError('');
    if (SOPORTA_BARCODE) {
      await iniciarNativo();
    } else {
      await iniciarFallback();
    }
  }

  // ── Modo nativo con BarcodeDetector (Chrome/Edge/Safari 17+) ──
  async function iniciarNativo() {
    activoRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (!activoRef.current) { stream.getTracks().forEach((t) => t.stop()); return; }
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
        iniciarDeteccion();
      }
    } catch {
      setError('No se pudo acceder a la cámara. Verificá los permisos.');
    }
  }

  function iniciarDeteccion() {
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const loop = async () => {
      if (!activoRef.current || !videoRef.current) return;
      try {
        const codes = await detector.detect(videoRef.current);
        if (codes.length > 0 && activoRef.current) {
          detenerCamara();
          await verificarToken(codes[0].rawValue.split('/').pop());
          return;
        }
      } catch {}
      if (activoRef.current) rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  }

  // ── Fallback con html5-qrcode (Firefox y navegadores sin BarcodeDetector) ──
  async function iniciarFallback() {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      // Buscar cámara trasera por ID para evitar el selector de cámaras
      let cameraConfig = { facingMode: 'environment' };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras.length) {
          const back = cameras.find((c) => /back|rear|trasera|environment/i.test(c.label));
          cameraConfig = (back || cameras[cameras.length - 1]).id;
        }
      } catch {}

      const scanner = new Html5Qrcode('qr-reader', { verbose: false });
      html5QrRef.current = scanner;

      await scanner.start(
        cameraConfig,
        { fps: 10 },
        async (decoded) => {
          await scanner.stop().catch(() => {});
          html5QrRef.current = null;
          await verificarToken(decoded.split('/').pop());
        },
        () => {}
      );
    } catch {
      setError('No se pudo acceder a la cámara. Verificá los permisos.');
    }
  }

  async function verificarToken(token) {
    setCargando(true);
    setError('');
    try {
      const { data } = await api.get(`/cuenta/qr/${token}`);
      setQrInfo({ ...data, token });
      setModo('confirmar');
    } catch (err) {
      setError(err.response?.data?.error || 'QR inválido o expirado');
      iniciarCamara();
    } finally {
      setCargando(false);
    }
  }

  async function confirmarPago() {
    setError('');
    setCargando(true);
    try {
      await api.post('/cuenta/qr/cobrar', { token: qrInfo.token });
      setModo('exito');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setCargando(false);
    }
  }

  function reiniciar() {
    setQrInfo(null);
    setError('');
    setModo('camara');
    iniciarCamara();
  }

  if (modo === 'exito') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-[#00ac46]/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#006e2a] text-[40px]">check_circle</span>
        </div>
        <h2 className="text-[22px] font-bold">¡Pago realizado!</h2>
        <p className="text-[14px] text-[#5f5e5e]">
          Pagaste ${Number(qrInfo?.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })} a {qrInfo?.nombre} {qrInfo?.apellido}
        </p>
        <button onClick={reiniciar} className="h-12 px-8 bg-[#009ee3] text-white font-bold rounded-full">
          Escanear otro
        </button>
      </div>
    );
  }

  if (modo === 'confirmar' && qrInfo) {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-5 elevation-l1 space-y-2">
          <p className="text-[13px] text-[#5f5e5e]">Vas a pagarle a</p>
          <p className="font-bold text-[#1a1c1c] text-[18px]">{qrInfo.nombre} {qrInfo.apellido}</p>
          <p className="text-[13px] text-[#5f5e5e]">Alias: {qrInfo.alias}</p>
          <div className="border-t border-[#eeeeee] pt-3 mt-3">
            <p className="text-[12px] text-[#5f5e5e] uppercase tracking-wider">Monto</p>
            <p className="text-[32px] font-bold text-[#1a1c1c]">
              ${Number(qrInfo.monto).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
        {error && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>}
        <button
          onClick={confirmarPago}
          disabled={cargando}
          className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {cargando && <Spinner size={22} color="#fff" />}
          {cargando ? 'Procesando...' : 'Confirmar pago'}
        </button>
        <button onClick={reiniciar} className="w-full h-12 text-[#5f5e5e] text-[14px]">
          Cancelar
        </button>
      </div>
    );
  }

  // modo === 'camara'
  return (
    <div className="space-y-4">
      <p className="text-[14px] text-[#5f5e5e] text-center">Apuntá la cámara al código QR</p>

      {/* aspectRatio + translateZ(0) fuerzan el recorte correcto en iOS Safari */}
      <div
        className="w-full bg-black rounded-2xl"
        style={{
          aspectRatio: '1 / 1',
          position: 'relative',
          overflow: 'hidden',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        {SOPORTA_BARCODE ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            id="qr-reader"
            style={{ position: 'absolute', inset: 0, overflow: 'hidden', width: '100%', height: '100%' }}
          />
        )}
      </div>

      {cargando && (
        <div className="flex justify-center py-2"><Spinner size={24} /></div>
      )}
      {error && (
        <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>
      )}
    </div>
  );
}

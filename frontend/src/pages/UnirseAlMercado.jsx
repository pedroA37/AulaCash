import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

export default function UnirseAlMercado() {
  const { codigo: codigoParam } = useParams();
  const navigate = useNavigate();
  const { refrescarMercados } = useMercado();

  const [tab, setTab] = useState('codigo');
  const [codigo, setCodigo] = useState(codigoParam || '');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [uniendose, setUniendose] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  useEffect(() => {
    if (codigoParam) buscarMercado(codigoParam);
  }, [codigoParam]);

  useEffect(() => {
    if (tab !== 'qr') { detenerScanner(); return; }
    iniciarScanner();
    return () => detenerScanner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function buscarMercado(cod) {
    if (!cod.trim()) return;
    setError('');
    setCargando(true);
    setPreview(null);
    try {
      const { data } = await api.get(`/mercados/info/${cod.trim().toUpperCase()}`);
      setPreview(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Código de mercado no encontrado');
    } finally {
      setCargando(false);
    }
  }

  async function handleUnirse() {
    setUniendose(true);
    setError('');
    try {
      const { data } = await api.post('/mercados/unirse', { codigo: codigo.trim().toUpperCase() });
      await refrescarMercados();
      navigate(`/mercados/${data.mercado_id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al unirse al mercado');
    } finally {
      setUniendose(false);
    }
  }

  async function iniciarScanner() {
    if (!scannerRef.current) return;
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('qr-reader-mercado');
      scannerInstanceRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (text) => {
          detenerScanner();
          const match = text.match(/\/mercados\/unirse\/([A-Z0-9]{6})/i);
          const cod = match ? match[1].toUpperCase() : text.trim().toUpperCase();
          setCodigo(cod);
          setTab('codigo');
          buscarMercado(cod);
        },
        () => {}
      );
    } catch {
      setError('No se pudo acceder a la cámara');
    }
  }

  function detenerScanner() {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop().catch(() => {});
      scannerInstanceRef.current = null;
    }
  }

  return (
    <Layout titulo="Unirse a un mercado">
      <div className="space-y-5">
        {/* Tabs */}
        <div className="flex bg-[#eeeeee] rounded-xl p-1 gap-1">
          {[{ id: 'codigo', icon: 'tag', label: 'Código' }, { id: 'qr', icon: 'qr_code_scanner', label: 'Escanear QR' }].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setError(''); setPreview(null); }}
              className={`flex-1 h-10 rounded-lg text-[14px] font-semibold transition-all flex items-center justify-center gap-1.5 ${t.id === tab ? 'bg-white text-[#006492] elevation-l1' : 'text-[#5f5e5e]'}`}
            >
              <span className="material-symbols-outlined text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {error && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>}

        {/* Tab: código */}
        {tab === 'codigo' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && buscarMercado(codigo)}
                className="flex-1 h-14 px-4 bg-white rounded-xl elevation-l1 outline-none focus:ring-2 focus:ring-[#009ee3] text-[18px] font-mono font-bold text-center uppercase tracking-widest"
                placeholder="AB3XY9"
                maxLength={8}
                autoFocus
              />
              <button
                onClick={() => buscarMercado(codigo)}
                disabled={!codigo.trim() || cargando}
                className="h-14 px-5 bg-[#009ee3] text-white font-bold rounded-xl disabled:opacity-50 active:scale-95 transition-all"
              >
                {cargando ? <Spinner size={20} color="white" /> : <span className="material-symbols-outlined text-[22px]">search</span>}
              </button>
            </div>

            {preview && (
              <div className="bg-white rounded-2xl p-5 elevation-l1 space-y-4">
                <div className="flex items-center gap-3">
                  {preview.logo_url ? (
                    <img src={preview.logo_url} alt={preview.nombre} className="w-14 h-14 rounded-xl object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#009ee3]/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#006492] text-[28px]">storefront</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-[18px] font-bold text-[#1a1c1c]">{preview.nombre}</h2>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${preview.estado === 'abierto' ? 'bg-[#00ac46]/10 text-[#006e2a]' : preview.estado === 'cerrado' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-[#eeeeee] text-[#5f5e5e]'}`}>
                        {preview.estado === 'abierto' ? 'Abierto' : preview.estado === 'cerrado' ? 'Cerrado' : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#5f5e5e]">Org: {preview.admin_nombre} {preview.admin_apellido}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#f3f3f3] rounded-xl p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#6e7881] uppercase tracking-wider">Moneda</p>
                    <p className="text-[15px] font-bold text-[#1a1c1c] mt-1">{preview.moneda_nombre}</p>
                    <p className="text-[12px] text-[#5f5e5e]">({preview.moneda_acronimo})</p>
                  </div>
                  <div className="bg-[#f3f3f3] rounded-xl p-3 text-center">
                    <p className="text-[11px] font-semibold text-[#6e7881] uppercase tracking-wider">Participantes</p>
                    <p className="text-[24px] font-bold text-[#1a1c1c] mt-1">{preview.total_participantes}</p>
                  </div>
                </div>
                <button
                  onClick={handleUnirse}
                  disabled={uniendose}
                  className="w-full h-14 bg-[#006492] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {uniendose ? 'Uniéndose...' : `Unirse a "${preview.nombre}"`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: QR */}
        {tab === 'qr' && (
          <div className="space-y-3">
            <p className="text-[14px] text-[#5f5e5e] text-center">Apuntá la cámara al QR del mercado</p>
            <div id="qr-reader-mercado" ref={scannerRef} className="rounded-2xl overflow-hidden bg-black" />
          </div>
        )}
      </div>
    </Layout>
  );
}

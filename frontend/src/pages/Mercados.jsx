import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMercado } from '../context/MercadoContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';

const BADGE = {
  borrador: { label: 'Borrador', cls: 'bg-[#eeeeee] text-[#5f5e5e]' },
  abierto:  { label: 'Abierto',  cls: 'bg-[#00ac46]/10 text-[#006e2a]' },
  cerrado:  { label: 'Cerrado',  cls: 'bg-[#ffdad6] text-[#93000a]' },
};

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

export default function Mercados() {
  const navigate = useNavigate();
  const { mercados, cargandoMercados, refrescarMercados } = useMercado();

  useEffect(() => { refrescarMercados(); }, []);

  return (
    <Layout titulo="Mercados">
      <div className="space-y-3">

        <button
          onClick={() => navigate('/mercados/unirse')}
          className="w-full h-14 flex items-center justify-center gap-2 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">add_circle</span>
          Unirse a un mercado
        </button>

        {cargandoMercados ? (
          <div className="flex justify-center py-12"><Spinner size={36} /></div>
        ) : mercados.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center elevation-l1">
            <span className="material-symbols-outlined text-[#bec8d2] text-[48px]">storefront</span>
            <p className="text-[15px] font-semibold text-[#1a1c1c] mt-3">Todavía no participás en ningún mercado</p>
            <p className="text-[13px] text-[#5f5e5e] mt-1">Usá el código de acceso que te dio el organizador</p>
          </div>
        ) : (
          <div className="space-y-2">
            {mercados.map((m) => {
              const badge = BADGE[m.estado] || BADGE.borrador;
              const cierra30 = m.estado === 'abierto' && m.notificacion_30_enviada;
              return (
                <button
                  key={m.id}
                  onClick={() => navigate(`/mercados/${m.id}`)}
                  className="w-full bg-white rounded-2xl p-4 elevation-l1 text-left active:scale-[0.98] transition-all"
                >
                  {cierra30 && (
                    <div className="mb-3 bg-[#ffb950]/20 text-[#8a5000] rounded-xl px-3 py-2 text-[12px] font-semibold flex items-center gap-2">
                      <span className="material-symbols-outlined text-[15px]">timer</span>
                      Cierra en menos de 30 min
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    {m.logo_url ? (
                      <img src={m.logo_url} alt={m.nombre} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#009ee3]/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#006492] text-[22px]">storefront</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-[#1a1c1c]">{m.nombre}</p>
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-[12px] text-[#5f5e5e]">{m.moneda_nombre} ({m.moneda_acronimo})</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#1a1c1c]">{fmt(m.saldo)}</p>
                      <p className="text-[11px] text-[#5f5e5e]">{m.moneda_acronimo}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}

import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

const MercadoContext = createContext(null);

export function MercadoProvider({ children }) {
  const { usuario } = useAuth();
  const [mercados, setMercados] = useState([]);
  const [mercadoActivo, setMercadoActivo] = useState(null);
  const [cargandoMercados, setCargandoMercados] = useState(false);

  useEffect(() => {
    if (!usuario) {
      setMercados([]);
      setMercadoActivo(null);
      return;
    }

    setCargandoMercados(true);

    api.get('/mercados/mis-mercados')
      .then(({ data }) => {
        setMercados(data);

        const savedId = localStorage.getItem('mercado_activo_id');
        if (savedId) {
          const encontrado = data.find((m) => String(m.id) === savedId);
          if (encontrado && encontrado.estado !== 'cerrado') {
            setMercadoActivo(encontrado);
            return;
          }
        }
        const candidatos = data.filter((m) => m.estado === 'abierto');
        if (candidatos.length === 1) setMercadoActivo(candidatos[0]);
      })
      .catch(() => {})
      .finally(() => setCargandoMercados(false));
  }, [usuario]);

  function seleccionarMercado(mercado) {
    setMercadoActivo(mercado || null);
    if (mercado) localStorage.setItem('mercado_activo_id', String(mercado.id));
    else localStorage.removeItem('mercado_activo_id');
  }

  function actualizarMercadoActivo(datosActualizados) {
    setMercadoActivo(datosActualizados);
    setMercados((prev) => prev.map((m) => (m.id === datosActualizados.id ? datosActualizados : m)));
  }

  async function refrescarMercados() {
    if (!usuario) return;
    try {
      const { data } = await api.get('/mercados/mis-mercados');
      setMercados(data);
      if (mercadoActivo) {
        const actualizado = data.find((m) => m.id === mercadoActivo.id);
        if (actualizado) {
          setMercadoActivo(actualizado);
        } else {
          // El mercado ya no está en la lista (eliminado o removido)
          setMercadoActivo(null);
          localStorage.removeItem('mercado_activo_id');
        }
      }
    } catch {}
  }

  return (
    <MercadoContext.Provider value={{
      mercados,
      mercadoActivo,
      cargandoMercados,
      seleccionarMercado,
      actualizarMercadoActivo,
      refrescarMercados,
    }}>
      {children}
    </MercadoContext.Provider>
  );
}

export function useMercado() {
  return useContext(MercadoContext);
}

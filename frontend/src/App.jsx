import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MercadoProvider, useMercado } from './context/MercadoContext';

import Login from './pages/Login';
import Registro from './pages/Registro';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Transferir from './pages/Transferir';
import QR from './pages/QR';
import PagarQR from './pages/PagarQR';
import Historial from './pages/Historial';
import Perfil from './pages/Perfil';
import AdminUsuarioDetalle from './pages/AdminUsuarioDetalle';
import Mercados from './pages/Mercados';
import MercadoDetalle from './pages/MercadoDetalle';
import UnirseAlMercado from './pages/UnirseAlMercado';
import AdminMercadoDetalle from './pages/AdminMercadoDetalle';
import PseudoAdminMercado from './pages/PseudoAdminMercado';
import ProductoMercadoDetalle from './pages/ProductoMercadoDetalle';
import Spinner from './components/Spinner';

function RutaMercadoDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { mercados, cargandoMercados } = useMercado();

  if (cargandoMercados) return (
    <div className="min-h-dvh flex items-center justify-center"><Spinner size={40} /></div>
  );

  const mercado = mercados.find((m) => String(m.id) === id);
  return mercado?.admin_id === usuario?.id ? <AdminMercadoDetalle /> : <MercadoDetalle />;
}

function RutaPrivada({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return (
    <div className="min-h-dvh flex items-center justify-center">
      <Spinner size={40} />
    </div>
  );
  return usuario ? children : <Navigate to="/login" replace />;
}

function RutaAdmin({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <div className="min-h-dvh flex items-center justify-center"><Spinner size={40} /></div>;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'admin') return <Navigate to="/mercados" replace />;
  return children;
}

function RutaPublica({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (usuario) {
    // Redirigir al destino guardado (ej: después de escanear un QR sin estar logueado)
    const redirect = sessionStorage.getItem('redirect_after_login');
    if (redirect) { sessionStorage.removeItem('redirect_after_login'); return <Navigate to={redirect} replace />; }
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MercadoProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<RutaPublica><Login /></RutaPublica>} />
          <Route path="/registro" element={<RutaPublica><Registro /></RutaPublica>} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<RutaPrivada><Dashboard /></RutaPrivada>} />
          <Route path="/transferir" element={<RutaPrivada><Transferir /></RutaPrivada>} />
          <Route path="/qr" element={<RutaPrivada><QR /></RutaPrivada>} />
          <Route path="/pagar/:token" element={<PagarQR />} />
          <Route path="/historial" element={<RutaPrivada><Historial /></RutaPrivada>} />
          <Route path="/perfil" element={<RutaPrivada><Perfil /></RutaPrivada>} />

          <Route path="/mercados" element={<RutaPrivada><Mercados /></RutaPrivada>} />
          <Route path="/mercados/unirse" element={<RutaPrivada><UnirseAlMercado /></RutaPrivada>} />
          <Route path="/mercados/unirse/:codigo" element={<RutaPrivada><UnirseAlMercado /></RutaPrivada>} />
          <Route path="/mercados/:id" element={<RutaPrivada><RutaMercadoDetalle /></RutaPrivada>} />
          <Route path="/mercados/:id/productos/:pid" element={<RutaPrivada><ProductoMercadoDetalle /></RutaPrivada>} />

          <Route path="/admin" element={<Navigate to="/mercados" replace />} />
          <Route path="/admin/mercados" element={<Navigate to="/mercados" replace />} />
          <Route path="/admin/mercados/:id" element={<Navigate to="/mercados" replace />} />
          <Route path="/admin/usuario/:id" element={<RutaAdmin><AdminUsuarioDetalle /></RutaAdmin>} />

          <Route path="/pseudo-admin/mercados/:id" element={<RutaPrivada><PseudoAdminMercado /></RutaPrivada>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        </MercadoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

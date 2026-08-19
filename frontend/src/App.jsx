import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MercadoProvider, useMercado } from './context/MercadoContext';
import Spinner from './components/Spinner';

const Login                = lazy(() => import('./pages/Login'));
const Registro             = lazy(() => import('./pages/Registro'));
const ForgotPassword       = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword        = lazy(() => import('./pages/ResetPassword'));
const Dashboard            = lazy(() => import('./pages/Dashboard'));
const Transferir           = lazy(() => import('./pages/Transferir'));
const QR                   = lazy(() => import('./pages/QR'));
const PagarQR              = lazy(() => import('./pages/PagarQR'));
const Historial            = lazy(() => import('./pages/Historial'));
const Perfil               = lazy(() => import('./pages/Perfil'));
const AdminUsuarioDetalle  = lazy(() => import('./pages/AdminUsuarioDetalle'));
const Mercados             = lazy(() => import('./pages/Mercados'));
const MercadoDetalle       = lazy(() => import('./pages/MercadoDetalle'));
const UnirseAlMercado      = lazy(() => import('./pages/UnirseAlMercado'));
const AdminMercadoDetalle  = lazy(() => import('./pages/AdminMercadoDetalle'));
const PseudoAdminMercado   = lazy(() => import('./pages/PseudoAdminMercado'));
const ProductoMercadoDetalle = lazy(() => import('./pages/ProductoMercadoDetalle'));

const PageFallback = () => (
  <div className="min-h-dvh flex items-center justify-center"><Spinner size={40} /></div>
);

function RutaMercadoDetalle() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const { mercados, cargandoMercados } = useMercado();

  if (cargandoMercados) return <PageFallback />;

  const mercado = mercados.find((m) => String(m.id) === id);
  return mercado?.admin_id === usuario?.id ? <AdminMercadoDetalle /> : <MercadoDetalle />;
}

function RutaPrivada({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <PageFallback />;
  return usuario ? children : <Navigate to="/login" replace />;
}

function RutaAdmin({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return <PageFallback />;
  if (!usuario) return <Navigate to="/login" replace />;
  if (usuario.rol !== 'admin') return <Navigate to="/mercados" replace />;
  return children;
}

function RutaPublica({ children }) {
  const { usuario, cargando } = useAuth();
  if (cargando) return null;
  if (usuario) {
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
          <Suspense fallback={<PageFallback />}>
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
          </Suspense>
        </MercadoProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

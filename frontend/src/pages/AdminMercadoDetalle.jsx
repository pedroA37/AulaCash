import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { useMercado } from '../context/MercadoContext';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Spinner from '../components/Spinner';
import api from '../services/api';

function fmt(n) {
  return Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 });
}

function getCart(mercadoId) {
  try { return JSON.parse(localStorage.getItem(`cart_mercado_${mercadoId}`)) || []; } catch { return []; }
}
function saveCart(mercadoId, cart) {
  localStorage.setItem(`cart_mercado_${mercadoId}`, JSON.stringify(cart));
}

const inputClass = 'w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]';
const labelClass = 'text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider';

const TABS = [
  { id: 'resumen', icon: 'dashboard', label: 'Resumen' },
  { id: 'comprar', icon: 'storefront', label: 'Comprar' },
  { id: 'usuarios', icon: 'group', label: 'Usuarios' },
  { id: 'productos', icon: 'shopping_bag', label: 'Gestionar' },
  { id: 'sumas', icon: 'account_balance', label: 'Sumas' },
  { id: 'config', icon: 'settings', label: 'Config' },
];

function resizarImagen(file, maxPx = 400) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const ratio = Math.min(maxPx / img.width, maxPx / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.55));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function AdminMercadoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { refrescarMercados, actualizarMercadoActivo } = useMercado();
  const fileInputRef = useRef(null);
  const [tab, setTab] = useState('resumen');
  const [mercado, setMercado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  // Código copiado
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  // Usuarios
  const [participantes, setParticipantes] = useState([]);
  const [buscarUsuario, setBuscarUsuario] = useState('');
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null); // objeto único o array
  const [buscandoUser, setBuscandoUser] = useState(false);

  // Productos
  const [productos, setProductos] = useState([]);
  const [formProd, setFormProd] = useState({ nombre: '', descripcion: '', precio: '', imagen_url: '', stock: '' });
  const [imagenPreview, setImagenPreview] = useState('');
  const [mostrarFormProd, setMostrarFormProd] = useState(false);
  const [guardandoProd, setGuardandoProd] = useState(false);

  // Sumas y saldos
  const [sumas, setSumas] = useState(null);

  // Config
  const [formConfig, setFormConfig] = useState({ nombre: '', moneda_nombre: '', moneda_acronimo: '', hora_cierre: '' });
  const [guardandoConfig, setGuardandoConfig] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  // Cargar saldo a participante
  const [modalCarga, setModalCarga] = useState(null); // participante seleccionado
  const [montoCarga, setMontoCarga] = useState('');
  const [descCarga, setDescCarga] = useState('');
  const [cargandoSaldo, setCargandoSaldo] = useState(false);

  // Comprar (carrito del admin en el mercado)
  const [tiendaProductos, setTiendaProductos] = useState([]);
  const [busquedaTienda, setBusquedaTienda] = useState('');
  const [carrito, setCarrito] = useState(() => getCart(id));
  const [showCart, setShowCart] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [carritoOk, setCarritoOk] = useState(false);
  const [carritoError, setCarritoError] = useState('');

  // Confirmación destructiva
  const [confirmar, setConfirmar] = useState(null); // { accion, texto }

  // Acciones mercado
  const [accionCargando, setAccionCargando] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  function cargar() { setCargando(true); setRefreshKey((k) => k + 1); }

  useEffect(() => {
    let mounted = true;
    api.get(`/admin/mercados/${id}`)
      .then(({ data }) => {
        if (!mounted) return;
        setMercado(data);
        setParticipantes(data.participantes || []);
        setFormConfig({
          nombre: data.nombre || '',
          moneda_nombre: data.moneda_nombre || '',
          moneda_acronimo: data.moneda_acronimo || '',
          hora_cierre: data.hora_cierre ? (() => { const d = new Date(data.hora_cierre); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); })() : '',
        });
        setCargando(false);
      })
      .catch(() => { if (mounted) { setError('No podés gestionar este mercado'); setCargando(false); } });
    return () => { mounted = false; };
  }, [id, refreshKey]);

  useEffect(() => {
    if (tab === 'productos') {
      api.get(`/admin/mercados/${id}/productos`).then(({ data }) => setProductos(data)).catch(() => {});
    }
    if (tab === 'sumas') {
      api.get(`/admin/mercados/${id}/sumas-saldos`).then(({ data }) => setSumas(data)).catch(() => {});
    }
    if (tab === 'comprar') {
      api.get(`/mercados/${id}/productos`).then(({ data }) => setTiendaProductos(data)).catch(() => {});
    }
  }, [tab, id]);

  function showMsg(msg) { setMensaje(msg); setTimeout(() => setMensaje(''), 4000); }
  function showErr(msg) { setError(msg); setTimeout(() => setError(''), 4000); }

  // ── Carrito (compras del admin) ──
  function syncCart(c) { setCarrito(c); saveCart(id, c); }
  function agregarAlCarrito(prod) {
    const cart = [...carrito];
    const idx = cart.findIndex((i) => i.producto_id === prod.id);
    if (idx >= 0) { cart[idx].cantidad += 1; }
    else { cart.push({ producto_id: prod.id, cantidad: 1, nombre: prod.nombre, precio: parseFloat(prod.precio), imagen_url: prod.imagen_url }); }
    syncCart(cart);
  }
  function cambiarCantidadCart(idx, delta) {
    const cart = [...carrito];
    cart[idx].cantidad = Math.max(1, cart[idx].cantidad + delta);
    syncCart(cart);
  }
  function quitarDelCart(idx) { syncCart(carrito.filter((_, i) => i !== idx)); }

  async function pagarCarrito() {
    setComprando(true);
    setCarritoError('');
    try {
      const items = carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }));
      await api.post(`/mercados/${id}/carrito`, { items });
      setCarritoOk(true);
      syncCart([]);
      setShowCart(false);
      cargar();
      api.get(`/mercados/${id}/productos`).then(({ data }) => setTiendaProductos(data)).catch(() => {});
      setTimeout(() => setCarritoOk(false), 3000);
    } catch (err) {
      setCarritoError(err.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setComprando(false);
    }
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(mercado.codigo).then(() => {
      setCodigoCopiado(true);
      setTimeout(() => setCodigoCopiado(false), 2000);
    });
  }

  async function abrirMercado() {
    setAccionCargando(true);
    try {
      const { data } = await api.post(`/admin/mercados/${id}/abrir`);
      const actualizado = { ...mercado, estado: 'abierto', hora_inicio: data.hora_inicio };
      setMercado(actualizado);
      actualizarMercadoActivo(actualizado);
      showMsg(mercado.estado === 'cerrado' ? 'Mercado reabierto' : 'Mercado abierto');
      refrescarMercados();
    } catch (err) { showErr(err.response?.data?.error || 'Error'); }
    finally { setAccionCargando(false); }
  }

  async function cerrarMercado() {
    setConfirmar({
      texto: 'El saldo de todos los participantes será debitado y el dinero en circulación quedará anulado. Esta acción no se puede deshacer.',
      accion: async () => {
        setAccionCargando(true);
        try {
          const { data } = await api.post(`/admin/mercados/${id}/cerrar`);
          const cerrado = { ...mercado, estado: 'cerrado' };
          setMercado(cerrado);
          actualizarMercadoActivo(cerrado);
          showMsg(`Mercado cerrado. Total cobrado: ${fmt(data.total_cobrado)} ${mercado.moneda_acronimo}`);
          refrescarMercados();
        } catch (err) { showErr(err.response?.data?.error || 'Error'); }
        finally { setAccionCargando(false); }
      },
    });
  }

  async function handleBuscarUsuario(e) {
    e.preventDefault();
    const q = buscarUsuario.trim();
    if (!q) return;
    setBuscandoUser(true);
    setResultadoBusqueda(null);
    try {
      let params;
      if (/^\d+$/.test(q)) {
        params = { dni: q };
      } else if (q.includes('.')) {
        params = { alias: q };
      } else {
        params = { nombre: q };
      }
      const { data } = await api.get('/cuenta/buscar', { params });
      setResultadoBusqueda(Array.isArray(data) ? data : [data]);
    } catch { showErr('Usuario no encontrado'); }
    finally { setBuscandoUser(false); }
  }

  async function handleImagenProd(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizarImagen(file);
    if (dataUrl.length > 200000) {
      showErr('La imagen es demasiado grande. Usá una foto más pequeña o sacá una foto nueva.');
      return;
    }
    setImagenPreview(dataUrl);
    setFormProd((f) => ({ ...f, imagen_url: dataUrl }));
  }

  async function handleCargarSaldo(e) {
    e.preventDefault();
    const montoNum = parseFloat(montoCarga);
    if (isNaN(montoNum) || montoNum <= 0) { showErr('Monto inválido'); return; }
    setCargandoSaldo(true);
    try {
      await api.post('/admin/cargar-saldo', {
        usuario_id: modalCarga.usuario_id,
        mercado_id: parseInt(id),
        monto: montoNum,
        descripcion: descCarga || undefined,
      });
      showMsg(`Cargado ${fmt(montoNum)} ${mercado.moneda_acronimo} a ${modalCarga.nombre}`);
      setModalCarga(null);
      setMontoCarga('');
      setDescCarga('');
      cargar();
    } catch (err) { showErr(err.response?.data?.error || 'Error al cargar saldo'); }
    finally { setCargandoSaldo(false); }
  }

  async function designarPseudoAdmin(usuarioId) {
    try {
      await api.post(`/admin/mercados/${id}/pseudo-admins`, { usuario_id: usuarioId });
      showMsg('Pseudo-admin designado');
      cargar();
    } catch (err) { showErr(err.response?.data?.error || 'Error'); }
  }

  async function removerPseudoAdmin(uid) {
    try {
      await api.delete(`/admin/mercados/${id}/pseudo-admins/${uid}`);
      showMsg('Pseudo-admin removido');
      cargar();
    } catch (err) { showErr(err.response?.data?.error || 'Error'); }
  }

  async function crearProducto(e) {
    e.preventDefault();
    setGuardandoProd(true);
    try {
      await api.post(`/admin/mercados/${id}/productos`, {
        nombre: formProd.nombre.trim(),
        descripcion: formProd.descripcion || undefined,
        precio: parseFloat(formProd.precio),
        imagen_url: formProd.imagen_url || undefined,
        stock: formProd.stock !== '' ? parseInt(formProd.stock) : undefined,
      });
      showMsg('Producto creado');
      setFormProd({ nombre: '', descripcion: '', precio: '', imagen_url: '', stock: '' });
      setImagenPreview('');
      setMostrarFormProd(false);
      api.get(`/admin/mercados/${id}/productos`).then(({ data }) => setProductos(data)).catch(() => {});
    } catch (err) { showErr(err.response?.data?.error || 'Error'); }
    finally { setGuardandoProd(false); }
  }

  async function eliminarProducto(pid) {
    try {
      await api.delete(`/admin/mercados/${id}/productos/${pid}`);
      setProductos((prev) => prev.filter((p) => p.id !== pid));
      showMsg('Producto desactivado');
    } catch (err) { showErr(err.response?.data?.error || 'Error'); }
  }

  async function guardarConfig(e) {
    e.preventDefault();
    setGuardandoConfig(true);
    try {
      await api.patch(`/admin/mercados/${id}`, {
        nombre: formConfig.nombre.trim() || undefined,
        moneda_nombre: formConfig.moneda_nombre.trim() || undefined,
        moneda_acronimo: formConfig.moneda_acronimo.trim() || undefined,
        hora_cierre: formConfig.hora_cierre ? new Date(formConfig.hora_cierre).toISOString() : null,
      });
      showMsg('Configuración guardada');
      cargar();
    } catch (err) { showErr(err.response?.data?.error || 'Error'); }
    finally { setGuardandoConfig(false); }
  }

  async function eliminarMercado() {
    setConfirmar({
      texto: `Eliminará "${mercado.nombre}" y todo su historial permanentemente.`,
      accion: async () => {
        setEliminando(true);
        setConfirmar(null);
        try {
          await api.delete(`/admin/mercados/${id}`);
          navigate('/mercados');
        } catch (err) { showErr(err.response?.data?.error || 'Error al eliminar'); setEliminando(false); }
      },
    });
  }


  if (cargando) return <Layout titulo="Mercado"><div className="flex justify-center py-16"><Spinner size={40} /></div></Layout>;
  if (!mercado) return <Layout titulo="Mercado"><div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div></Layout>;

  const joinUrl = `${window.location.origin}/mercados/unirse/${mercado.codigo}`;
  const esBorrador = mercado.estado === 'borrador';
  const esAbierto = mercado.estado === 'abierto';
  const esCerrado = mercado.estado === 'cerrado';

  const totalCarrito = Math.round(carrito.reduce((s, i) => s + i.precio * i.cantidad, 0) * 100) / 100;
  const cartCount = carrito.reduce((s, i) => s + i.cantidad, 0);
  const miSaldoMercado = parseFloat(participantes.find((p) => p.usuario_id === usuario?.id)?.saldo ?? 0);
  const prodsFiltrados = tiendaProductos.filter((p) =>
    !busquedaTienda || p.nombre.toLowerCase().includes(busquedaTienda.toLowerCase()) ||
    `${p.vendedor_nombre} ${p.vendedor_apellido}`.toLowerCase().includes(busquedaTienda.toLowerCase())
  );

  return (
    <Layout titulo={mercado.nombre}>
      <div className="space-y-4">
        {mensaje && <div className="bg-[#00ac46]/10 text-[#006e2a] rounded-xl px-4 py-3 text-[14px] font-semibold">{mensaje}</div>}
        {error && <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error}</div>}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${tab === t.id ? 'bg-[#009ee3] text-white' : 'bg-white text-[#5f5e5e] elevation-l1'}`}>
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── RESUMEN ── */}
        {tab === 'resumen' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#5f5e5e]">Estado</span>
                <span className={`px-3 py-1 rounded-full text-[12px] font-bold ${esBorrador ? 'bg-[#eeeeee] text-[#5f5e5e]' : esAbierto ? 'bg-[#00ac46]/10 text-[#006e2a]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                  {mercado.estado === 'borrador' ? 'Borrador' : mercado.estado === 'abierto' ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#5f5e5e]">Código</span>
                <button onClick={copiarCodigo} className="flex items-center gap-1.5 active:opacity-60 transition-opacity">
                  <span className="font-mono font-bold text-[18px] text-[#006492] tracking-widest">{mercado.codigo}</span>
                  <span className={`material-symbols-outlined text-[16px] transition-colors ${codigoCopiado ? 'text-[#006e2a]' : 'text-[#bec8d2]'}`}>
                    {codigoCopiado ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#5f5e5e]">Moneda</span>
                <span className="font-semibold text-[#1a1c1c]">{mercado.moneda_nombre} ({mercado.moneda_acronimo})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-[#5f5e5e]">Participantes</span>
                <span className="font-semibold text-[#1a1c1c]">{mercado.participantes?.length || 0}</span>
              </div>
              {mercado.hora_cierre && (
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-[#5f5e5e]">Cierre programado</span>
                  <span className="text-[13px] font-semibold text-[#1a1c1c]">
                    {new Date(mercado.hora_cierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
            </div>

            {/* QR de invitación */}
            <div className="bg-white rounded-2xl p-4 elevation-l1 flex flex-col items-center gap-3">
              <p className="text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider">QR de acceso al mercado</p>
              <div className="p-3 bg-white rounded-xl border border-[#eeeeee]">
                <QRCodeSVG value={joinUrl} size={160} />
              </div>
              <p className="text-[12px] text-[#5f5e5e] text-center break-all">{joinUrl}</p>
            </div>

            {/* Acciones principales */}
            {(esBorrador || esCerrado) && (
              <button onClick={abrirMercado} disabled={accionCargando}
                className="w-full h-14 bg-[#00ac46] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">play_circle</span>
                {accionCargando ? 'Abriendo...' : esCerrado ? 'Reabrir mercado' : 'Abrir mercado'}
              </button>
            )}
            {esAbierto && (
              <button onClick={cerrarMercado} disabled={accionCargando}
                className="w-full h-14 bg-[#ba1a1a] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">stop_circle</span>
                {accionCargando ? 'Cerrando...' : 'Cerrar mercado'}
              </button>
            )}
          </div>
        )}

        {/* ── COMPRAR ── */}
        {tab === 'comprar' && (
          <div className="space-y-3">
            {carritoOk && (
              <div className="bg-[#00ac46]/10 text-[#006e2a] rounded-xl px-4 py-3 text-[14px] font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                ¡Compra realizada con éxito!
              </div>
            )}

            {/* Saldo disponible */}
            <div className="bg-white rounded-2xl px-4 py-3 elevation-l1 flex items-center justify-between">
              <span className="text-[13px] text-[#5f5e5e]">Tu saldo en el mercado</span>
              <span className="font-bold text-[#006492] text-[16px]">{fmt(miSaldoMercado)} {mercado.moneda_acronimo}</span>
            </div>

            {/* Buscador */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar producto o vendedor..."
                value={busquedaTienda}
                onChange={(e) => setBusquedaTienda(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-white rounded-xl border border-[#eeeeee] text-[14px] outline-none focus:ring-2 focus:ring-[#009ee3]"
              />
            </div>

            {/* Carrito flotante */}
            {cartCount > 0 && (
              <button
                onClick={() => setShowCart(true)}
                className="w-full h-12 bg-[#006492] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 elevation-l2 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
                Ver carrito · {cartCount} {cartCount === 1 ? 'item' : 'items'} · {fmt(totalCarrito)} {mercado.moneda_acronimo}
              </button>
            )}

            {prodsFiltrados.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">shopping_bag</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">
                  {busquedaTienda ? 'Sin resultados' : 'No hay productos disponibles aún'}
                </p>
              </div>
            ) : prodsFiltrados.map((prod) => {
              const enCart = carrito.find((i) => i.producto_id === prod.id);
              const esPropio = prod.vendedor_id === usuario?.id;
              return (
                <div key={prod.id} className="bg-white rounded-2xl elevation-l1 overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    {prod.imagen_url ? (
                      <img src={prod.imagen_url} alt={prod.nombre} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-[#f3f3f3] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#bec8d2] text-[28px]">image</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1a1c1c] text-[15px] leading-tight">{prod.nombre}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[#5f5e5e] text-[13px]">person</span>
                        <p className="text-[12px] text-[#5f5e5e]">
                          {prod.vendedor_nombre} {prod.vendedor_apellido}
                          {esPropio && <span className="text-[#009ee3] font-semibold"> (vos)</span>}
                        </p>
                      </div>
                      {prod.descripcion && <p className="text-[12px] text-[#5f5e5e] mt-1 line-clamp-1">{prod.descripcion}</p>}
                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="text-[18px] font-bold text-[#006492]">{fmt(prod.precio)}</span>
                          <span className="text-[11px] text-[#5f5e5e] ml-1">{mercado.moneda_acronimo}</span>
                        </div>
                        {prod.stock !== null && (
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${prod.stock > 0 ? 'bg-[#d3f5e1] text-[#006e2a]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                            {prod.stock > 0 ? `${prod.stock} disponibles` : 'Sin stock'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!esPropio && !esCerrado && (prod.stock === null || prod.stock > 0) && (
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => agregarAlCarrito(prod)}
                        disabled={miSaldoMercado < parseFloat(prod.precio) && !enCart}
                        className="w-full h-9 bg-[#009ee3] text-white font-semibold text-[13px] rounded-xl disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">{enCart ? 'add' : 'add_shopping_cart'}</span>
                        {enCart ? `En carrito (${enCart.cantidad})` : 'Agregar'}
                      </button>
                    </div>
                  )}
                  {esPropio && (
                    <div className="px-4 pb-3">
                      <p className="text-[12px] text-[#5f5e5e] text-center py-1">Es tu producto</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── USUARIOS ── */}
        {tab === 'usuarios' && (
          <div className="space-y-3">
            {/* Buscar para designar pseudo-admin */}
            {esAbierto && (
              <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
                <h3 className="text-[14px] font-bold text-[#1a1c1c]">Designar pseudo-admin</h3>
                <form onSubmit={handleBuscarUsuario} className="flex gap-2">
                  <input type="text" value={buscarUsuario} onChange={(e) => { setBuscarUsuario(e.target.value); setResultadoBusqueda(null); }}
                    className="flex-1 h-11 px-4 bg-[#f3f3f3] rounded-xl outline-none focus:ring-2 focus:ring-[#009ee3] text-[15px]"
                    placeholder="Nombre, DNI o alias..." />
                  <button type="submit" disabled={buscandoUser}
                    className="h-11 px-4 bg-[#009ee3] text-white font-bold rounded-xl disabled:opacity-50">
                    {buscandoUser ? '...' : <span className="material-symbols-outlined text-[20px]">search</span>}
                  </button>
                </form>
                <p className="text-[11px] text-[#6e7881]">Buscá por nombre, DNI o alias (alias.con.puntos)</p>
                {resultadoBusqueda && (
                  <div className="space-y-2">
                    {resultadoBusqueda.map((u) => (
                      <div key={u.id} className="bg-[#f3f3f3] rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                          {u.nombre[0]}{u.apellido[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-[#1a1c1c]">{u.nombre} {u.apellido}</p>
                          <p className="text-[12px] text-[#5f5e5e] truncate">{u.alias}</p>
                        </div>
                        <button onClick={() => { designarPseudoAdmin(u.id); setResultadoBusqueda(null); setBuscarUsuario(''); }}
                          className="h-9 px-3 bg-[#006492] text-white font-bold text-[13px] rounded-xl flex-shrink-0">
                          Designar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Lista participantes */}
            {participantes.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">group</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">Sin participantes aún</p>
              </div>
            ) : (
              <div className="space-y-2">
                {participantes.map((p) => (
                  <div key={p.usuario_id} className="bg-white rounded-2xl p-4 elevation-l1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                        {p.nombre[0]}{p.apellido[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-[#1a1c1c]">{p.nombre} {p.apellido}</p>
                          {p.es_pseudo_admin && (
                            <span className="px-2 py-0.5 bg-[#009ee3]/10 text-[#006492] text-[11px] font-semibold rounded-full">pseudo-admin</span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#5f5e5e]">{p.alias}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-bold text-[#1a1c1c]">{fmt(p.saldo)}</p>
                        <p className="text-[11px] text-[#5f5e5e]">{mercado.moneda_acronimo}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {esAbierto && (
                        <button
                          onClick={() => { setModalCarga(p); setMontoCarga(''); setDescCarga(''); }}
                          className="flex-1 h-9 bg-[#009ee3]/10 text-[#006492] text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[16px]">add_circle</span>
                          Cargar
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/admin/usuario/${p.usuario_id}`)}
                        className="flex-1 h-9 bg-[#eeeeee] text-[#1a1c1c] text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">person</span>
                        Perfil
                      </button>
                      {esAbierto && !p.es_pseudo_admin && (
                        <button onClick={() => designarPseudoAdmin(p.usuario_id)}
                          className="flex-1 h-9 bg-[#eeeeee] text-[#1a1c1c] text-[13px] font-semibold rounded-lg text-[12px]">
                          + Admin
                        </button>
                      )}
                      {p.es_pseudo_admin && (
                        <button onClick={() => removerPseudoAdmin(p.usuario_id)}
                          className="flex-1 h-9 bg-[#ffdad6] text-[#93000a] text-[12px] font-semibold rounded-lg">
                          − Admin
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PRODUCTOS ── */}
        {tab === 'productos' && (
          <div className="space-y-3">
            {productos.length === 0 && !mostrarFormProd ? (
              <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">shopping_bag</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">No hay productos en la tienda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productos.map((p) => (
                  <div key={p.id} className="bg-white rounded-2xl p-4 elevation-l1 flex items-start gap-3">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-xl bg-[#f3f3f3] flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-[#bec8d2] text-[24px]">shopping_cart</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#1a1c1c]">{p.nombre}</p>
                      {p.descripcion && <p className="text-[12px] text-[#5f5e5e]">{p.descripcion}</p>}
                      <p className="text-[15px] font-bold text-[#006492] mt-1">{fmt(p.precio)} {mercado.moneda_acronimo}</p>
                      {p.stock !== null && <p className="text-[11px] text-[#5f5e5e]">Stock: {p.stock}</p>}
                    </div>
                    <button onClick={() => eliminarProducto(p.id)} className="p-2 text-[#93000a]">
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => { setMostrarFormProd((v) => !v); }}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#006492] text-white font-bold text-[15px] rounded-full shadow-lg active:scale-[0.98] transition-all">
              <span className="material-symbols-outlined text-[20px]">{mostrarFormProd ? 'close' : 'add'}</span>
              {mostrarFormProd ? 'Cancelar' : 'Agregar producto'}
            </button>

            {mostrarFormProd && (
              <div className="bg-white rounded-2xl p-5 elevation-l1">
                <h3 className="text-[15px] font-bold text-[#1a1c1c] mb-4">Nuevo producto</h3>
                <form onSubmit={crearProducto} className="space-y-3">
                  <div>
                    <label className={labelClass}>Nombre *</label>
                    <input type="text" value={formProd.nombre} onChange={(e) => setFormProd({ ...formProd, nombre: e.target.value })}
                      className={inputClass} placeholder="Pan casero" required />
                  </div>
                  <div>
                    <label className={labelClass}>Descripción</label>
                    <input type="text" value={formProd.descripcion} onChange={(e) => setFormProd({ ...formProd, descripcion: e.target.value })}
                      className={inputClass} placeholder="Descripción del bien..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Precio ({mercado.moneda_acronimo}) *</label>
                      <input type="number" step="0.01" min="0.01" value={formProd.precio}
                        onChange={(e) => setFormProd({ ...formProd, precio: e.target.value })}
                        className={inputClass} placeholder="10.00" required />
                    </div>
                    <div>
                      <label className={labelClass}>Stock (vacío = ilimitado)</label>
                      <input type="number" min="0" value={formProd.stock}
                        onChange={(e) => setFormProd({ ...formProd, stock: e.target.value })}
                        className={inputClass} placeholder="5" />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Foto del producto</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImagenProd}
                      className="hidden"
                    />
                    {imagenPreview ? (
                      <div className="mt-1 relative">
                        <img src={imagenPreview} alt="preview" className="w-full h-36 object-cover rounded-xl" />
                        <button type="button" onClick={() => { setImagenPreview(''); setFormProd((f) => ({ ...f, imagen_url: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                          className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[16px]">close</span>
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()}
                        className="mt-1 w-full h-24 bg-[#f3f3f3] rounded-xl border-2 border-dashed border-[#bec8d2] flex flex-col items-center justify-center gap-1 active:opacity-60 transition-opacity">
                        <span className="material-symbols-outlined text-[#bec8d2] text-[28px]">add_photo_alternate</span>
                        <span className="text-[12px] text-[#6e7881]">Tocar para agregar foto</span>
                      </button>
                    )}
                  </div>
                  <button type="submit" disabled={guardandoProd}
                    className="w-full h-12 bg-[#006492] text-white font-bold text-[15px] rounded-full active:scale-[0.98] transition-all disabled:opacity-60">
                    {guardandoProd ? 'Guardando...' : 'Agregar producto'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* ── SUMAS Y SALDOS ── */}
        {tab === 'sumas' && (
          <div className="space-y-3">
            {!sumas ? (
              <div className="flex justify-center py-8"><Spinner size={32} /></div>
            ) : (
              <>
                <div className={`rounded-2xl p-4 ${sumas.balance_ok ? 'bg-[#00ac46]/10' : 'bg-[#ffdad6]'}`}>
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-[22px] ${sumas.balance_ok ? 'text-[#006e2a]' : 'text-[#93000a]'}`}>
                      {sumas.balance_ok ? 'check_circle' : 'warning'}
                    </span>
                    <p className={`font-bold text-[15px] ${sumas.balance_ok ? 'text-[#006e2a]' : 'text-[#93000a]'}`}>
                      {sumas.balance_ok ? 'Balance cuadra correctamente' : 'El balance no cuadra'}
                    </p>
                  </div>
                  <p className={`text-[12px] mt-1 ${sumas.balance_ok ? 'text-[#006e2a]' : 'text-[#93000a]'}`}>
                    Cargado = Compras al admin + Devuelto + En circulación
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
                  {[
                    { label: 'Total cargado', value: sumas.total_cargado, icon: 'add_circle', color: 'text-[#006e2a]' },
                    { label: 'Compras al admin', value: sumas.total_compras, icon: 'shopping_cart', color: 'text-[#006492]' },
                    { label: 'Devuelto al cierre', value: sumas.total_devuelto, icon: 'undo', color: 'text-[#006492]' },
                    { label: 'En circulación ahora', value: sumas.total_en_circulacion, icon: 'swap_horiz', color: 'text-[#5f5e5e]' },
                    { label: 'Volumen transferencias', value: sumas.volumen_transferencias, icon: 'sync_alt', color: 'text-[#5f5e5e]' },
                  ].map(({ label, value, icon, color }) => (
                    <div key={label} className="flex items-center justify-between py-1 border-b border-[#eeeeee] last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-[18px] ${color}`}>{icon}</span>
                        <span className="text-[14px] text-[#5f5e5e]">{label}</span>
                      </div>
                      <span className={`font-bold text-[15px] ${color}`}>{fmt(value)} {mercado.moneda_acronimo}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-2xl p-4 elevation-l1">
                  <p className="text-[13px] font-bold text-[#1a1c1c] mb-3">Saldo por participante</p>
                  <div className="space-y-2">
                    {sumas.saldos_actuales.map((s, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-[13px] text-[#5f5e5e]">{s.nombre} {s.apellido}</span>
                        <span className="text-[14px] font-semibold text-[#1a1c1c]">{fmt(s.saldo)} {mercado.moneda_acronimo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── CONFIG ── */}
        {tab === 'config' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 elevation-l1">
              <h3 className="text-[15px] font-bold text-[#1a1c1c] mb-4">Configuración del mercado</h3>
              <form onSubmit={guardarConfig} className="space-y-3">
                <div>
                  <label className={labelClass}>Nombre del mercado</label>
                  <input type="text" value={formConfig.nombre}
                    onChange={(e) => setFormConfig((f) => ({ ...f, nombre: e.target.value }))}
                    className={inputClass} placeholder="Mercado del Aula 3A" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Moneda</label>
                    <input type="text" value={formConfig.moneda_nombre}
                      onChange={(e) => setFormConfig((f) => ({ ...f, moneda_nombre: e.target.value }))}
                      className={inputClass} placeholder="Aulis" required />
                  </div>
                  <div>
                    <label className={labelClass}>Acrónimo (max 10)</label>
                    <input type="text" value={formConfig.moneda_acronimo}
                      onChange={(e) => setFormConfig((f) => ({ ...f, moneda_acronimo: e.target.value.toUpperCase() }))}
                      className={inputClass} placeholder="AUL" maxLength={10} required />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Fecha y hora de cierre</label>
                  <input type="datetime-local" value={formConfig.hora_cierre}
                    onChange={(e) => setFormConfig((f) => ({ ...f, hora_cierre: e.target.value }))}
                    className={inputClass} />
                  <p className="text-[12px] text-[#5f5e5e] mt-1">
                    Se enviará una notificación 30 min antes. Dejá vacío para sin hora.
                  </p>
                </div>
                <button type="submit" disabled={guardandoConfig}
                  className="w-full h-12 bg-[#006492] text-white font-bold text-[15px] rounded-full active:scale-[0.98] transition-all disabled:opacity-60">
                  {guardandoConfig ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </form>
            </div>

            {/* Eliminar mercado */}
            {mercado.estado !== 'abierto' && (
              <div className="bg-white rounded-2xl p-5 elevation-l1">
                <h3 className="text-[15px] font-bold text-[#1a1c1c] mb-1">Zona de peligro</h3>
                <p className="text-[13px] text-[#5f5e5e] mb-4">
                  {mercado.estado === 'borrador'
                    ? 'Eliminará el mercado y todos sus datos. Solo disponible en borrador.'
                    : 'Eliminará el mercado cerrado y todo su historial permanentemente.'}
                </p>
                <button
                  onClick={eliminarMercado}
                  disabled={eliminando}
                  className="w-full h-12 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-[15px] rounded-full active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">delete</span>
                  {eliminando ? 'Eliminando...' : 'Eliminar mercado'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmación destructiva */}
      {confirmar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <p className="text-[15px] font-semibold text-[#1a1c1c] text-center">{confirmar.texto}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmar(null)}
                className="flex-1 h-12 bg-[#eeeeee] text-[#5f5e5e] font-bold text-[15px] rounded-full"
              >
                Cancelar
              </button>
              <button
                onClick={async () => { await confirmar.accion(); setConfirmar(null); }}
                className="flex-1 h-12 bg-[#ba1a1a] text-white font-bold text-[15px] rounded-full"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer carrito (compras del admin) */}
      {showCart && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCart(false)} />
          <div className="relative bg-white rounded-t-3xl p-5 space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-[#1a1c1c] flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">shopping_cart</span>
                Carrito ({cartCount} {cartCount === 1 ? 'item' : 'items'})
              </h2>
              <button onClick={() => setShowCart(false)} className="w-8 h-8 rounded-full bg-[#f3f3f3] flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {carrito.length === 0 ? (
              <div className="py-8 text-center">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">shopping_cart</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">El carrito está vacío</p>
              </div>
            ) : (
              <>
                <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                  {carrito.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-2 border-b border-[#eeeeee]">
                      {item.imagen_url ? (
                        <img src={item.imagen_url} alt={item.nombre} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-[#f3f3f3] flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[#bec8d2] text-[20px]">image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1a1c1c] truncate">{item.nombre}</p>
                        <p className="text-[12px] text-[#5f5e5e]">{fmt(item.precio)} {mercado.moneda_acronimo} c/u</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={() => cambiarCantidadCart(idx, -1)} className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center active:scale-90">
                          <span className="material-symbols-outlined text-[16px]">remove</span>
                        </button>
                        <span className="text-[14px] font-bold text-[#1a1c1c] w-5 text-center">{item.cantidad}</span>
                        <button onClick={() => cambiarCantidadCart(idx, 1)} className="w-7 h-7 rounded-full bg-[#f3f3f3] flex items-center justify-center active:scale-90">
                          <span className="material-symbols-outlined text-[16px]">add</span>
                        </button>
                        <button onClick={() => quitarDelCart(idx)} className="w-7 h-7 rounded-full bg-[#ffdad6] flex items-center justify-center active:scale-90 ml-1">
                          <span className="material-symbols-outlined text-[#ba1a1a] text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div>
                    <p className="text-[12px] text-[#5f5e5e]">Total</p>
                    <p className="text-[22px] font-bold text-[#1a1c1c]">{fmt(totalCarrito)} <span className="text-[14px] text-[#5f5e5e]">{mercado.moneda_acronimo}</span></p>
                    <p className={`text-[12px] font-semibold ${miSaldoMercado >= totalCarrito ? 'text-[#006e2a]' : 'text-[#ba1a1a]'}`}>
                      Tu saldo: {fmt(miSaldoMercado)}
                    </p>
                  </div>
                  <button
                    onClick={pagarCarrito}
                    disabled={comprando || miSaldoMercado < totalCarrito}
                    className="h-12 px-6 bg-[#009ee3] text-white font-bold text-[14px] rounded-full disabled:opacity-40 active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">payments</span>
                    {comprando ? 'Pagando...' : 'Pagar'}
                  </button>
                </div>

                {carritoError && <p className="text-[13px] text-[#ba1a1a] text-center">{carritoError}</p>}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modal cargar saldo */}
      {modalCarga && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40">
          <div className="bg-white rounded-t-2xl w-full max-w-lg p-5 space-y-4 pb-[max(20px,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-[#1a1c1c]">Cargar saldo</h3>
              <button onClick={() => setModalCarga(null)} className="p-1 text-[#6e7881]">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex items-center gap-3 bg-[#f3f3f3] rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-[#009ee3] flex items-center justify-center text-white font-bold text-[14px] flex-shrink-0">
                {modalCarga.nombre[0]}{modalCarga.apellido[0]}
              </div>
              <div>
                <p className="font-semibold text-[#1a1c1c] text-[14px]">{modalCarga.nombre} {modalCarga.apellido}</p>
                <p className="text-[12px] text-[#5f5e5e]">{modalCarga.alias}</p>
              </div>
            </div>

            <form onSubmit={handleCargarSaldo} className="space-y-3">
              <div className="border-b-2 border-[#bec8d2] focus-within:border-[#009ee3] pb-2 flex items-baseline gap-2 transition-colors">
                <span className="text-[20px] font-bold text-[#009ee3]">{mercado.moneda_acronimo}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={montoCarga}
                  onChange={(e) => setMontoCarga(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none text-[28px] font-bold text-[#1a1c1c] placeholder:text-[#dadada]"
                  placeholder="0,00"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Motivo (opcional)</label>
                <input
                  type="text"
                  value={descCarga}
                  onChange={(e) => setDescCarga(e.target.value)}
                  className="w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]"
                  placeholder="ej: Premio, participación..."
                />
              </div>
              <button
                type="submit"
                disabled={cargandoSaldo || !montoCarga}
                className="w-full h-14 bg-[#009ee3] text-white font-bold text-[16px] rounded-full shadow-lg active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {cargandoSaldo ? 'Cargando...' : 'Confirmar carga'}
              </button>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}

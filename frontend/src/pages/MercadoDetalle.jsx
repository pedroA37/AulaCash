import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useMercado } from '../context/MercadoContext';
import { QRCodeSVG } from 'qrcode.react';
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

function resizarImagen(file, maxPx = 600) {
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
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

const inputClass = 'w-full mt-1 h-12 px-4 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px]';
const labelClass = 'text-[12px] font-semibold text-[#6e7881] uppercase tracking-wider';

const TABS = [
  { id: 'inicio', icon: 'home', label: 'Inicio' },
  { id: 'tienda', icon: 'storefront', label: 'Tienda' },
  { id: 'mis-productos', icon: 'sell', label: 'Mis ventas' },
  { id: 'pedidos', icon: 'receipt_long', label: 'Pedidos' },
  { id: 'historial', icon: 'history', label: 'Historial' },
];

export default function MercadoDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario } = useAuth();
  const { refrescarMercados } = useMercado();
  const fileInputRef = useRef(null);

  const [tab, setTab] = useState(location.state?.tab || 'inicio');
  const [mercado, setMercado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState('');

  // Tienda
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');

  // Carrito
  const [carrito, setCarrito] = useState(() => getCart(id));
  const [showCart, setShowCart] = useState(location.state?.openCart || false);
  const [comprando, setComprando] = useState(false);
  const [carritoOk, setCarritoOk] = useState(false);
  const [carritoError, setCarritoError] = useState('');

  // Mis productos
  const [misProductos, setMisProductos] = useState([]);
  const [showFormProd, setShowFormProd] = useState(false);
  const [editProd, setEditProd] = useState(null);
  const [formProd, setFormProd] = useState({ nombre: '', descripcion: '', precio: '', stock: '', imagen_url: '' });
  const [imagenPreview, setImagenPreview] = useState('');
  const [guardandoProd, setGuardandoProd] = useState(false);
  const [prodError, setProdError] = useState('');

  // Pedidos
  const [subtabPedidos, setSubtabPedidos] = useState('compras');
  const [pedidos, setPedidos] = useState([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);

  // Historial
  const [historial, setHistorial] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);

  // Abandonar
  const [abandonando, setAbandonando] = useState(false);
  const [abandonError, setAbandonError] = useState('');
  const [confirmarAbandono, setConfirmarAbandono] = useState(false);
  const [codigoCopiado, setCodigoCopiado] = useState(false);

  function cargarMercado() { setCargando(true); setRefreshKey((k) => k + 1); }

  function cargarPedidos(tipo) {
    setLoadingPedidos(true);
    api.get(`/mercados/${id}/pedidos?tipo=${tipo}`)
      .then(({ data }) => { setPedidos(data); setLoadingPedidos(false); })
      .catch(() => setLoadingPedidos(false));
  }

  useEffect(() => {
    let mounted = true;
    api.get(`/mercados/${id}`)
      .then(({ data }) => { if (mounted) { setMercado(data); setCargando(false); } })
      .catch(() => { if (mounted) { setError('No podés ver este mercado'); setCargando(false); } });
    return () => { mounted = false; };
  }, [id, refreshKey]);

  useEffect(() => {
    if (tab === 'tienda') {
      api.get(`/mercados/${id}/productos`).then(({ data }) => setProductos(data)).catch(() => {});
    }
    if (tab === 'mis-productos') {
      api.get(`/mercados/${id}/mis-productos`).then(({ data }) => setMisProductos(data)).catch(() => {});
    }
    if (tab === 'historial') {
      setLoadingHist(true); // eslint-disable-line react-hooks/set-state-in-effect
      api.get(`/mercados/${id}/transacciones`)
        .then(({ data }) => { setHistorial(data.data); setLoadingHist(false); })
        .catch(() => setLoadingHist(false));
    }
    if (tab === 'pedidos') {
      cargarPedidos(subtabPedidos);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (tab === 'pedidos') cargarPedidos(subtabPedidos);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtabPedidos]);

  // ── Carrito ──
  function syncCart(nuevoCarrito) {
    setCarrito(nuevoCarrito);
    saveCart(id, nuevoCarrito);
  }

  function agregarAlCarrito(prod) {
    const cart = [...carrito];
    const idx = cart.findIndex((i) => i.producto_id === prod.id);
    if (idx >= 0) {
      cart[idx].cantidad += 1;
    } else {
      cart.push({ producto_id: prod.id, cantidad: 1, nombre: prod.nombre, precio: parseFloat(prod.precio), imagen_url: prod.imagen_url });
    }
    syncCart(cart);
  }

  function cambiarCantidadCart(idx, delta) {
    const cart = [...carrito];
    cart[idx].cantidad = Math.max(1, cart[idx].cantidad + delta);
    syncCart(cart);
  }

  function quitarDelCart(idx) {
    const cart = carrito.filter((_, i) => i !== idx);
    syncCart(cart);
  }

  const totalCarrito = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const cartCount = carrito.reduce((s, i) => s + i.cantidad, 0);

  async function pagarCarrito() {
    setComprando(true);
    setCarritoError('');
    try {
      const items = carrito.map((i) => ({ producto_id: i.producto_id, cantidad: i.cantidad }));
      await api.post(`/mercados/${id}/carrito`, { items });
      setCarritoOk(true);
      syncCart([]);
      setShowCart(false);
      cargarMercado();
      api.get(`/mercados/${id}/productos`).then(({ data }) => setProductos(data)).catch(() => {});
      setTimeout(() => setCarritoOk(false), 3000);
    } catch (err) {
      setCarritoError(err.response?.data?.error || 'Error al procesar el pago');
    } finally {
      setComprando(false);
    }
  }

  // ── Mis Productos ──
  function abrirFormNuevo() {
    setEditProd(null);
    setFormProd({ nombre: '', descripcion: '', precio: '', stock: '', imagen_url: '' });
    setImagenPreview('');
    setProdError('');
    setShowFormProd(true);
  }

  function abrirFormEditar(prod) {
    setEditProd(prod);
    setFormProd({
      nombre: prod.nombre,
      descripcion: prod.descripcion || '',
      precio: String(prod.precio),
      stock: prod.stock != null ? String(prod.stock) : '',
      imagen_url: prod.imagen_url || '',
    });
    setImagenPreview(prod.imagen_url || '');
    setProdError('');
    setShowFormProd(true);
  }

  async function handleImagenProd(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const b64 = await resizarImagen(file);
    setImagenPreview(b64);
    setFormProd((f) => ({ ...f, imagen_url: b64 }));
  }

  async function guardarProducto() {
    setProdError('');
    if (!formProd.nombre.trim()) return setProdError('El nombre es requerido');
    if (!formProd.precio || parseFloat(formProd.precio) <= 0) return setProdError('El precio debe ser mayor a 0');

    setGuardandoProd(true);
    try {
      const payload = {
        nombre: formProd.nombre.trim(),
        descripcion: formProd.descripcion.trim() || null,
        precio: parseFloat(formProd.precio),
        imagen_url: formProd.imagen_url || null,
        stock: formProd.stock !== '' ? parseInt(formProd.stock) : null,
      };

      if (editProd) {
        await api.patch(`/mercados/${id}/mis-productos/${editProd.id}`, payload);
      } else {
        await api.post(`/mercados/${id}/mis-productos`, payload);
      }

      setShowFormProd(false);
      const { data } = await api.get(`/mercados/${id}/mis-productos`);
      setMisProductos(data);
    } catch (err) {
      setProdError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setGuardandoProd(false);
    }
  }

  async function eliminarProducto(prod) {
    if (!confirm(`¿Dar de baja "${prod.nombre}"?`)) return;
    try {
      await api.delete(`/mercados/${id}/mis-productos/${prod.id}`);
      setMisProductos((p) => p.filter((x) => x.id !== prod.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Error al eliminar');
    }
  }

  // ── Abandonar ──
  async function abandonar() {
    setAbandonando(true);
    setAbandonError('');
    try {
      await api.delete(`/mercados/${id}/abandonar`);
      await refrescarMercados();
      navigate('/mercados');
    } catch (err) {
      setAbandonError(err.response?.data?.error || 'Error al abandonar el mercado');
      setAbandonando(false);
      setConfirmarAbandono(false);
    }
  }

  function copiarCodigo() {
    navigator.clipboard.writeText(mercado?.codigo || '').then(() => {
      setCodigoCopiado(true);
      setTimeout(() => setCodigoCopiado(false), 2000);
    });
  }

  if (cargando) return (
    <Layout titulo="Mercado">
      <div className="flex justify-center py-16"><Spinner size={40} /></div>
    </Layout>
  );

  if (error || !mercado) return (
    <Layout titulo="Mercado">
      <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error || 'Mercado no encontrado'}</div>
    </Layout>
  );

  const esCerrado = mercado.estado === 'cerrado';
  const cierra30 = mercado.estado === 'abierto' && mercado.notificacion_30_enviada;
  const joinUrl = `${window.location.origin}/mercados/unirse/${mercado.codigo}`;
  const prodsFiltrados = productos.filter((p) =>
    !busqueda || p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    `${p.vendedor_nombre} ${p.vendedor_apellido}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <Layout titulo={mercado.nombre}>
      <div className="space-y-4 pb-4">
        {/* Alertas */}
        {cierra30 && (
          <div className="bg-[#ffb950]/20 text-[#8a5000] rounded-xl px-4 py-3 text-[14px] font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">timer</span>
            ¡El mercado cierra en menos de 30 minutos! Cambiá tu dinero por bienes.
          </div>
        )}
        {esCerrado && (
          <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px] font-semibold text-center">
            Este mercado está cerrado
          </div>
        )}
        {carritoOk && (
          <div className="bg-[#d3f5e1] text-[#006e2a] rounded-xl px-4 py-3 text-[14px] font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            ¡Compra realizada con éxito!
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1 px-3 h-9 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all flex-shrink-0 ${tab === t.id ? 'bg-[#009ee3] text-white' : 'bg-white text-[#5f5e5e] elevation-l1'}`}
            >
              <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── INICIO ── */}
        {tab === 'inicio' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 elevation-l1 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#009ee3]/5 rounded-full blur-xl pointer-events-none" />
              <p className="text-[12px] font-semibold text-[#5f5e5e] uppercase tracking-wider">Tu saldo en este mercado</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[42px] font-bold text-[#1a1c1c] tracking-tighter">{fmt(mercado.mi_saldo)}</span>
                <span className="text-[18px] font-bold text-[#5f5e5e]">{mercado.moneda_acronimo}</span>
              </div>
              <p className="text-[13px] text-[#5f5e5e] mt-2">{mercado.moneda_nombre}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">info</span>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">Código de acceso</p>
                </div>
                <button onClick={copiarCodigo} className="flex items-center gap-1.5 active:opacity-60 transition-opacity">
                  <span className="font-mono font-bold text-[18px] text-[#006492] tracking-widest">{mercado.codigo}</span>
                  <span className={`material-symbols-outlined text-[16px] transition-colors ${codigoCopiado ? 'text-[#006e2a]' : 'text-[#bec8d2]'}`}>
                    {codigoCopiado ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
              {mercado.hora_cierre && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">schedule</span>
                    <p className="text-[13px] font-semibold text-[#1a1c1c]">Cierra</p>
                  </div>
                  <span className="text-[13px] text-[#1a1c1c]">
                    {new Date(mercado.hora_cierre).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">person</span>
                  <p className="text-[13px] font-semibold text-[#1a1c1c]">Organizador</p>
                </div>
                <span className="text-[13px] text-[#1a1c1c]">{mercado.admin_nombre} {mercado.admin_apellido}</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 elevation-l1 flex flex-col items-center gap-3">
              <p className="text-[13px] font-semibold text-[#5f5e5e] uppercase tracking-wider">QR para unirse</p>
              <div className="p-3 bg-white rounded-xl border border-[#eeeeee]">
                <QRCodeSVG value={joinUrl} size={160} />
              </div>
              <p className="text-[12px] text-[#5f5e5e] text-center">Compartí este QR o el código <strong>{mercado.codigo}</strong></p>
            </div>

            {mercado.es_pseudo_admin && (
              <button
                onClick={() => navigate(`/pseudo-admin/mercados/${id}`)}
                className="w-full h-12 bg-[#009ee3] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">payments</span>
                Cargar saldo a participantes
              </button>
            )}

            {mercado.admin_id !== usuario.id && (
              <div className="pt-2">
                {abandonError && <p className="text-[13px] text-[#ba1a1a] text-center mb-2">{abandonError}</p>}
                {confirmarAbandono ? (
                  <div className="bg-[#ffdad6] rounded-2xl p-4 space-y-3">
                    <p className="text-[14px] font-semibold text-[#93000a] text-center">¿Abandonar "{mercado.nombre}"? Necesitás tener saldo en cero.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmarAbandono(false)} className="flex-1 h-11 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-[14px] rounded-full">Cancelar</button>
                      <button onClick={abandonar} disabled={abandonando} className="flex-1 h-11 bg-[#ba1a1a] text-white font-bold text-[14px] rounded-full disabled:opacity-60">
                        {abandonando ? 'Abandonando...' : 'Confirmar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setConfirmarAbandono(true)} className="w-full h-12 border-2 border-[#ba1a1a] text-[#ba1a1a] font-bold text-[14px] rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    Abandonar mercado
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TIENDA ── */}
        {tab === 'tienda' && (
          <div className="space-y-3">
            {/* Buscador */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#5f5e5e] text-[20px]">search</span>
              <input
                type="text"
                placeholder="Buscar producto o vendedor..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
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
                  {busqueda ? 'Sin resultados' : 'No hay productos disponibles aún'}
                </p>
              </div>
            ) : prodsFiltrados.map((prod) => {
              const enCart = carrito.find((i) => i.producto_id === prod.id);
              const esPropio = prod.vendedor_id === usuario?.id;
              return (
                <div key={prod.id} className="bg-white rounded-2xl elevation-l1 overflow-hidden">
                  <button
                    onClick={() => navigate(`/mercados/${id}/productos/${prod.id}`)}
                    className="w-full flex items-start gap-3 p-4 text-left active:bg-[#f8f8f8] transition-colors"
                  >
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
                  </button>
                  {/* Botones de acción */}
                  {!esPropio && !esCerrado && (prod.stock === null || prod.stock > 0) && (
                    <div className="px-4 pb-3 flex gap-2">
                      <button
                        onClick={() => navigate(`/mercados/${id}/productos/${prod.id}`)}
                        className="flex-1 h-9 border border-[#009ee3] text-[#009ee3] font-semibold text-[13px] rounded-xl active:bg-[#009ee3]/10 transition-colors"
                      >
                        Ver detalle
                      </button>
                      <button
                        onClick={() => agregarAlCarrito(prod)}
                        disabled={parseFloat(mercado.mi_saldo) < parseFloat(prod.precio) && !enCart}
                        className="flex-1 h-9 bg-[#009ee3] text-white font-semibold text-[13px] rounded-xl disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">{enCart ? 'add' : 'add_shopping_cart'}</span>
                        {enCart ? `En carrito (${enCart.cantidad})` : 'Agregar'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── MIS PRODUCTOS ── */}
        {tab === 'mis-productos' && (
          <div className="space-y-3">
            <button
              onClick={abrirFormNuevo}
              disabled={esCerrado}
              className="w-full h-12 bg-[#009ee3] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Publicar producto
            </button>

            {/* Formulario nueva/editar */}
            {showFormProd && (
              <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
                <p className="text-[15px] font-bold text-[#1a1c1c]">{editProd ? 'Editar producto' : 'Nuevo producto'}</p>

                {/* Imagen */}
                <div>
                  <p className={labelClass}>Imagen</p>
                  {imagenPreview ? (
                    <div className="mt-1 relative">
                      <img src={imagenPreview} alt="" className="w-full h-48 object-cover rounded-xl" />
                      <button
                        onClick={() => { setImagenPreview(''); setFormProd((f) => ({ ...f, imagen_url: '' })); }}
                        className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">close</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 w-full h-24 border-2 border-dashed border-[#bec8d2] rounded-xl flex flex-col items-center justify-center gap-1 text-[#5f5e5e] active:bg-[#f3f3f3]"
                    >
                      <span className="material-symbols-outlined text-[24px]">add_photo_alternate</span>
                      <span className="text-[12px]">Subir imagen</span>
                    </button>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagenProd} />
                </div>

                <div>
                  <p className={labelClass}>Nombre *</p>
                  <input className={inputClass} value={formProd.nombre} onChange={(e) => setFormProd((f) => ({ ...f, nombre: e.target.value }))} placeholder="Nombre del producto" />
                </div>
                <div>
                  <p className={labelClass}>Descripción</p>
                  <textarea
                    className="w-full mt-1 px-4 py-3 bg-[#f3f3f3] rounded-xl border-none outline-none focus:ring-2 focus:ring-[#009ee3] text-[16px] resize-none"
                    rows={3}
                    value={formProd.descripcion}
                    onChange={(e) => setFormProd((f) => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Describí el producto..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className={labelClass}>Precio * ({mercado.moneda_acronimo})</p>
                    <input className={inputClass} type="number" min="0.01" step="0.01" value={formProd.precio} onChange={(e) => setFormProd((f) => ({ ...f, precio: e.target.value }))} placeholder="0.00" />
                  </div>
                  <div>
                    <p className={labelClass}>Stock (vacío = ilimitado)</p>
                    <input className={inputClass} type="number" min="0" step="1" value={formProd.stock} onChange={(e) => setFormProd((f) => ({ ...f, stock: e.target.value }))} placeholder="—" />
                  </div>
                </div>

                {prodError && <p className="text-[13px] text-[#ba1a1a]">{prodError}</p>}

                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowFormProd(false)} className="flex-1 h-11 border-2 border-[#5f5e5e] text-[#5f5e5e] font-bold text-[14px] rounded-full">
                    Cancelar
                  </button>
                  <button onClick={guardarProducto} disabled={guardandoProd} className="flex-1 h-11 bg-[#009ee3] text-white font-bold text-[14px] rounded-full disabled:opacity-60">
                    {guardandoProd ? 'Guardando...' : editProd ? 'Guardar cambios' : 'Publicar'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de mis productos */}
            {misProductos.length === 0 && !showFormProd ? (
              <div className="bg-white rounded-2xl p-8 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">sell</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">No publicaste ningún producto aún</p>
                <p className="text-[12px] text-[#5f5e5e] mt-1">¡Publicá algo para vender en este mercado!</p>
              </div>
            ) : misProductos.map((prod) => (
              <div key={prod.id} className="bg-white rounded-2xl p-4 elevation-l1 flex items-start gap-3">
                {prod.imagen_url ? (
                  <img src={prod.imagen_url} alt={prod.nombre} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[#f3f3f3] flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-[#bec8d2] text-[24px]">image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-[#1a1c1c] text-[15px] leading-tight">{prod.nombre}</p>
                    <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${prod.activo ? 'bg-[#d3f5e1] text-[#006e2a]' : 'bg-[#ffdad6] text-[#93000a]'}`}>
                      {prod.activo ? 'Activo' : 'Sin stock'}
                    </div>
                  </div>
                  {prod.descripcion && <p className="text-[12px] text-[#5f5e5e] mt-0.5 line-clamp-1">{prod.descripcion}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <span className="text-[16px] font-bold text-[#006492]">{fmt(prod.precio)}</span>
                      <span className="text-[11px] text-[#5f5e5e] ml-1">{mercado.moneda_acronimo}</span>
                      {prod.stock !== null && <span className="ml-2 text-[11px] text-[#5f5e5e]">· Stock: {prod.stock}</span>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => abrirFormEditar(prod)} className="w-9 h-9 rounded-xl bg-[#f3f3f3] flex items-center justify-center active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">edit</span>
                      </button>
                      <button onClick={() => eliminarProducto(prod)} className="w-9 h-9 rounded-xl bg-[#ffdad6] flex items-center justify-center active:scale-95 transition-all">
                        <span className="material-symbols-outlined text-[#ba1a1a] text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── PEDIDOS ── */}
        {tab === 'pedidos' && (
          <div className="space-y-3">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              {[
                { id: 'compras', label: 'Mis compras', icon: 'shopping_bag' },
                { id: 'ventas', label: 'Mis ventas', icon: 'sell' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSubtabPedidos(st.id)}
                  className={`flex-1 h-11 rounded-full font-bold text-[13px] flex items-center justify-center gap-1.5 transition-all ${subtabPedidos === st.id ? 'bg-[#009ee3] text-white' : 'bg-white text-[#5f5e5e] elevation-l1'}`}
                >
                  <span className="material-symbols-outlined text-[16px]">{st.icon}</span>
                  {st.label}
                </button>
              ))}
            </div>

            {loadingPedidos ? (
              <div className="flex justify-center py-8"><Spinner size={32} /></div>
            ) : pedidos.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">
                  {subtabPedidos === 'compras' ? 'shopping_bag' : 'sell'}
                </span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">
                  {subtabPedidos === 'compras' ? 'No realizaste ninguna compra aún' : 'No vendiste ningún producto aún'}
                </p>
              </div>
            ) : subtabPedidos === 'compras' ? (
              <div className="space-y-3">
                {pedidos.map((pedido) => (
                  <div key={pedido.id} className="bg-white rounded-2xl p-4 elevation-l1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[12px] text-[#5f5e5e]">
                        {new Date(pedido.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <span className="text-[15px] font-bold text-[#006492]">{fmt(pedido.total)} {mercado.moneda_acronimo}</span>
                    </div>
                    <div className="space-y-1">
                      {pedido.items?.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-[13px]">
                          <span className="text-[#1a1c1c]">
                            {item.cantidad > 1 && <span className="font-semibold text-[#009ee3]">x{item.cantidad} </span>}
                            {item.nombre_producto}
                          </span>
                          <div className="text-right">
                            <span className="text-[#5f5e5e]">{fmt(item.precio * item.cantidad)} {mercado.moneda_acronimo}</span>
                            <p className="text-[11px] text-[#5f5e5e]">de {item.vendedor_nombre} {item.vendedor_apellido}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {pedidos.map((item) => (
                  <div key={item.id} className="bg-white rounded-2xl p-4 elevation-l1 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#009ee3]/10 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-[#009ee3] text-[20px]">sell</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">
                        {item.cantidad > 1 && <span className="text-[#009ee3]">x{item.cantidad} </span>}
                        {item.nombre_producto}
                      </p>
                      <p className="text-[12px] text-[#5f5e5e]">
                        Comprador: {item.comprador_nombre} {item.comprador_apellido}
                      </p>
                      <p className="text-[11px] text-[#5f5e5e]">
                        {new Date(item.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span className="text-[15px] font-bold text-[#006e2a]">+{fmt(item.precio * item.cantidad)} {mercado.moneda_acronimo}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        {tab === 'historial' && (
          <div>
            {loadingHist ? (
              <div className="flex justify-center py-8"><Spinner size={32} /></div>
            ) : historial.length === 0 ? (
              <div className="bg-white rounded-2xl p-6 text-center elevation-l1">
                <span className="material-symbols-outlined text-[#bec8d2] text-[40px]">receipt_long</span>
                <p className="text-[14px] text-[#5f5e5e] mt-2">Sin movimientos en este mercado</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl elevation-l1 overflow-hidden">
                {historial.map((tx, i) => {
                  const esEntrada = tx.usuario_destino_id === usuario.id;
                  const icono = tx.tipo === 'carga' ? 'add_circle' : tx.tipo === 'compra' ? 'shopping_cart' : tx.tipo === 'devolucion' ? 'undo' : esEntrada ? 'south_west' : 'north_east';
                  return (
                    <div key={tx.id} className={`flex items-center gap-3 px-4 py-3 ${i < historial.length - 1 ? 'border-b border-[#eeeeee]' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${esEntrada ? 'bg-[#00ac46]/10' : 'bg-[#009ee3]/10'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${esEntrada ? 'text-[#006e2a]' : 'text-[#006492]'}`}>{icono}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1a1c1c] truncate">
                          {tx.tipo === 'carga' ? 'Carga de saldo' : tx.tipo === 'devolucion' ? 'Devolución al cierre' : tx.tipo === 'compra' ? tx.descripcion : esEntrada ? `${tx.origen_nombre} ${tx.origen_apellido}` : `${tx.destino_nombre} ${tx.destino_apellido}`}
                        </p>
                        <p className="text-[12px] text-[#5f5e5e]">{new Date(tx.created_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className={`text-[15px] font-bold ${esEntrada ? 'text-[#006e2a]' : 'text-[#1a1c1c]'}`}>
                        {esEntrada ? '+' : '-'}{fmt(tx.monto)} {mercado.moneda_acronimo}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── DRAWER CARRITO ── */}
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
                    <p className={`text-[12px] font-semibold ${parseFloat(mercado.mi_saldo) >= totalCarrito ? 'text-[#006e2a]' : 'text-[#ba1a1a]'}`}>
                      Tu saldo: {fmt(mercado.mi_saldo)}
                    </p>
                  </div>
                  <button
                    onClick={pagarCarrito}
                    disabled={comprando || parseFloat(mercado.mi_saldo) < totalCarrito}
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
    </Layout>
  );
}

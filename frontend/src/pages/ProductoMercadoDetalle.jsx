import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

export default function ProductoMercadoDetalle() {
  const { id, pid } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();

  const [producto, setProducto] = useState(null);
  const [mercado, setMercado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [agregado, setAgregado] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [compraOk, setCompraOk] = useState(false);
  const [compraError, setCompraError] = useState('');
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      api.get(`/mercados/${id}/productos/${pid}`),
      api.get(`/mercados/${id}`),
    ]).then(([{ data: prod }, { data: merc }]) => {
      if (!mounted) return;
      setProducto(prod);
      setMercado(merc);
      setCargando(false);
    }).catch(() => {
      if (mounted) { setError('Producto no encontrado'); setCargando(false); }
    });
    return () => { mounted = false; };
  }, [id, pid]);

  useEffect(() => {
    const count = getCart(id).reduce((s, i) => s + i.cantidad, 0);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartCount(count);
  }, [id]);

  function agregarAlCarrito() {
    const cart = getCart(id);
    const idx = cart.findIndex((i) => i.producto_id === parseInt(pid));
    if (idx >= 0) {
      cart[idx].cantidad += 1;
    } else {
      cart.push({ producto_id: parseInt(pid), cantidad: 1, nombre: producto.nombre, precio: parseFloat(producto.precio), imagen_url: producto.imagen_url });
    }
    saveCart(id, cart);
    setCartCount(cart.reduce((s, i) => s + i.cantidad, 0));
    setAgregado(true);
    setTimeout(() => setAgregado(false), 2000);
  }

  async function comprarAhora() {
    setComprando(true);
    setCompraError('');
    try {
      await api.post(`/mercados/${id}/comprar`, { producto_id: parseInt(pid) });
      setCompraOk(true);
      setTimeout(() => navigate(`/mercados/${id}`, { state: { tab: 'inicio' } }), 1800);
    } catch (err) {
      setCompraError(err.response?.data?.error || 'Error al comprar');
    } finally {
      setComprando(false);
    }
  }

  if (cargando) return (
    <Layout titulo="Producto">
      <div className="flex justify-center py-16"><Spinner size={40} /></div>
    </Layout>
  );

  if (error || !producto) return (
    <Layout titulo="Producto">
      <div className="bg-[#ffdad6] text-[#93000a] rounded-xl px-4 py-3 text-[14px]">{error || 'Producto no encontrado'}</div>
    </Layout>
  );

  const esPropio = producto.vendedor_id === usuario?.id;
  const sinStock = producto.stock !== null && producto.stock <= 0;
  const saldoInsuf = mercado && parseFloat(mercado.mi_saldo) < parseFloat(producto.precio);
  const mercadoCerrado = mercado?.estado !== 'abierto';

  return (
    <Layout titulo="Detalle del producto">
      <div className="space-y-4 pb-4">
        {/* Imagen grande */}
        {producto.imagen_url ? (
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[#f3f3f3]">
            <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-square rounded-2xl bg-[#f3f3f3] flex items-center justify-center">
            <span className="material-symbols-outlined text-[#bec8d2] text-[64px]">image</span>
          </div>
        )}

        {/* Precio + nombre */}
        <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-[32px] font-bold text-[#006492]">{fmt(producto.precio)}</span>
            <span className="text-[16px] font-semibold text-[#5f5e5e]">{mercado?.moneda_acronimo}</span>
          </div>
          <h1 className="text-[20px] font-bold text-[#1a1c1c] leading-tight">{producto.nombre}</h1>
          {producto.descripcion && (
            <p className="text-[14px] text-[#5f5e5e] leading-relaxed">{producto.descripcion}</p>
          )}
        </div>

        {/* Info del vendedor y stock */}
        <div className="bg-white rounded-2xl p-4 elevation-l1 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#009ee3]/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#009ee3] text-[20px]">person</span>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#5f5e5e] uppercase tracking-wider">Vendedor</p>
              <p className="text-[15px] font-bold text-[#1a1c1c]">
                {producto.vendedor_nombre} {producto.vendedor_apellido}
                {esPropio && <span className="ml-2 text-[11px] text-[#009ee3] font-semibold">(vos)</span>}
              </p>
            </div>
          </div>

          <div className="h-px bg-[#eeeeee]" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">inventory_2</span>
              <span className="text-[14px] font-semibold text-[#1a1c1c]">Disponibilidad</span>
            </div>
            {producto.stock === null ? (
              <span className="text-[13px] text-[#006e2a] font-semibold">Sin límite de stock</span>
            ) : producto.stock > 0 ? (
              <span className="text-[13px] text-[#006e2a] font-semibold">{producto.stock} unidades disponibles</span>
            ) : (
              <span className="text-[13px] text-[#ba1a1a] font-semibold">Sin stock</span>
            )}
          </div>

          {mercado && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#5f5e5e] text-[18px]">account_balance_wallet</span>
                <span className="text-[14px] font-semibold text-[#1a1c1c]">Tu saldo</span>
              </div>
              <span className={`text-[13px] font-semibold ${saldoInsuf ? 'text-[#ba1a1a]' : 'text-[#1a1c1c]'}`}>
                {fmt(mercado.mi_saldo)} {mercado.moneda_acronimo}
              </span>
            </div>
          )}
        </div>

        {/* Carrito badge */}
        {cartCount > 0 && (
          <button
            onClick={() => navigate(`/mercados/${id}`, { state: { tab: 'tienda', openCart: true } })}
            className="w-full h-12 bg-[#f3f3f3] text-[#1a1c1c] font-semibold text-[14px] rounded-full flex items-center justify-center gap-2 elevation-l1"
          >
            <span className="material-symbols-outlined text-[18px]">shopping_cart</span>
            Ver carrito ({cartCount} {cartCount === 1 ? 'item' : 'items'})
          </button>
        )}

        {/* Acciones */}
        {compraOk ? (
          <div className="bg-[#d3f5e1] text-[#006e2a] rounded-2xl p-4 flex items-center gap-3 font-semibold text-[15px]">
            <span className="material-symbols-outlined text-[22px]">check_circle</span>
            ¡Compra realizada! Redirigiendo...
          </div>
        ) : !esPropio && !sinStock && !mercadoCerrado ? (
          <div className="space-y-2">
            {compraError && (
              <p className="text-[13px] text-[#ba1a1a] text-center">{compraError}</p>
            )}
            <button
              onClick={agregarAlCarrito}
              disabled={saldoInsuf}
              className={`w-full h-12 border-2 border-[#009ee3] font-bold text-[14px] rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${agregado ? 'bg-[#009ee3] text-white' : 'text-[#009ee3] bg-white'} disabled:opacity-40`}
            >
              <span className="material-symbols-outlined text-[18px]">{agregado ? 'check' : 'add_shopping_cart'}</span>
              {agregado ? '¡Agregado al carrito!' : 'Agregar al carrito'}
            </button>
            <button
              onClick={comprarAhora}
              disabled={comprando || saldoInsuf}
              className="w-full h-12 bg-[#009ee3] text-white font-bold text-[14px] rounded-full flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              {comprando ? 'Comprando...' : saldoInsuf ? 'Saldo insuficiente' : 'Comprar ahora'}
            </button>
          </div>
        ) : (
          <div className="bg-[#f3f3f3] text-[#5f5e5e] rounded-2xl p-4 text-center text-[14px]">
            {esPropio ? 'Este es tu propio producto' : sinStock ? 'Sin stock disponible' : 'Mercado cerrado'}
          </div>
        )}

        {/* Productos sugeridos */}
        {producto.sugeridos && producto.sugeridos.length > 0 && (
          <div className="space-y-3">
            <p className="text-[12px] font-semibold text-[#5f5e5e] uppercase tracking-wider px-1">También en este mercado</p>
            <div className="grid grid-cols-2 gap-3">
              {producto.sugeridos.map((sug) => (
                <button
                  key={sug.id}
                  onClick={() => navigate(`/mercados/${id}/productos/${sug.id}`)}
                  className="bg-white rounded-2xl overflow-hidden elevation-l1 text-left active:scale-[0.97] transition-transform"
                >
                  {sug.imagen_url ? (
                    <img src={sug.imagen_url} alt={sug.nombre} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-[#f3f3f3] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#bec8d2] text-[32px]">image</span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-[13px] font-bold text-[#1a1c1c] line-clamp-2 leading-tight">{sug.nombre}</p>
                    <p className="text-[12px] text-[#5f5e5e] mt-0.5">{sug.vendedor_nombre}</p>
                    <p className="text-[14px] font-bold text-[#006492] mt-1">
                      {fmt(sug.precio)} <span className="text-[11px] font-normal text-[#5f5e5e]">{mercado?.moneda_acronimo}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

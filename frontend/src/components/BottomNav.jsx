import { NavLink } from 'react-router-dom';
import { useMercado } from '../context/MercadoContext';

const tabs = [
  { to: '/dashboard', icon: 'home', label: 'Inicio', requiereMercado: true },
  { to: '/transferir', icon: 'sync_alt', label: 'Transferir', requiereMercado: true },
  { to: '/mercados', icon: 'storefront', label: 'Mercados' },
  { to: '/historial', icon: 'receipt_long', label: 'Historial', requiereMercado: true },
  { to: '/perfil', icon: 'account_circle', label: 'Perfil' },
];

export default function BottomNav() {
  const { mercadoActivo } = useMercado();

  return (
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-[#f9f9f9] rounded-t-xl shadow-[0_-4px_16px_rgba(0,0,0,0.04)] pb-[max(12px,env(safe-area-inset-bottom))]">
      {tabs.map(({ to, icon, label, requiereMercado }) => {
        const bloqueado = requiereMercado && mercadoActivo?.estado !== 'abierto';

        if (bloqueado) {
          return (
            <div key={to} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 opacity-25 select-none">
              <span className="material-symbols-outlined text-[24px] text-[#5f5e5e]">{icon}</span>
              <span className="text-[11px] font-semibold leading-none text-[#5f5e5e]">{label}</span>
            </div>
          );
        }

        return (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 px-3 py-1 rounded-full transition-all duration-200 active:scale-90 ${
                isActive ? 'text-[#006492] font-bold' : 'text-[#5f5e5e]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className="material-symbols-outlined text-[24px]"
                  style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                >
                  {icon}
                </span>
                <span className="text-[11px] font-semibold leading-none">{label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

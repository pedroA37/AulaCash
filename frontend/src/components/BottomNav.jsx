import { NavLink } from 'react-router-dom';
import { useMercado } from '../context/MercadoContext';

const tabs = [
  { to: '/dashboard',  icon: 'home',         label: 'Inicio',     requiereMercado: true },
  { to: '/transferir', icon: 'sync_alt',      label: 'Transferir', requiereMercado: true },
  { to: '/mercados',   icon: 'storefront',    label: 'Mercados' },
  { to: '/historial',  icon: 'receipt_long',  label: 'Historial',  requiereMercado: true },
  { to: '/perfil',     icon: 'account_circle',label: 'Perfil' },
];

export default function BottomNav() {
  const { mercadoActivo } = useMercado();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
      <div className="bg-white/95 backdrop-blur-xl rounded-2xl elevation-l2 border border-black/[0.04] flex justify-around items-center px-1 py-1.5">
        {tabs.map(({ to, icon, label, requiereMercado }) => {
          const bloqueado = requiereMercado && mercadoActivo?.estado !== 'abierto';

          if (bloqueado) {
            return (
              <div key={to}
                className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 opacity-20 select-none pointer-events-none min-w-[52px]">
                <span className="material-symbols-outlined text-[22px] text-[#6e7881]">{icon}</span>
                <span className="text-[10px] font-semibold text-[#6e7881]">{label}</span>
              </div>
            );
          }

          return (
            <NavLink
              key={to}
              to={to}
              className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-xl transition-transform duration-150 active:scale-90 min-w-[52px]"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute inset-0 bg-[#006492]/10 rounded-xl animate-scaleIn" />
                  )}
                  <span
                    className="material-symbols-outlined text-[22px] relative z-10 transition-colors duration-200"
                    style={{
                      color: isActive ? '#006492' : '#8a9aa6',
                      fontVariationSettings: isActive
                        ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    {icon}
                  </span>
                  <span
                    className="text-[10px] font-semibold leading-none relative z-10 transition-colors duration-200"
                    style={{ color: isActive ? '#006492' : '#8a9aa6' }}
                  >
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

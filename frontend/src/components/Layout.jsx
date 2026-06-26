import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';

export default function Layout({ titulo, children }) {
  const { pathname } = useLocation();
  return (
    <div className="min-h-dvh flex flex-col bg-[#f4f6f8]">
      {titulo && (
        <header className="sticky top-0 z-40 flex items-center h-14 px-5 backdrop-blur-xl bg-[#f4f6f8]/85 border-b border-black/[0.05]">
          <h1 className="text-[20px] font-bold text-[#006492] tracking-tight">{titulo}</h1>
        </header>
      )}
      <main key={pathname} className="flex-1 pb-28 px-4 pt-5 max-w-xl mx-auto w-full animate-fadeUp">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

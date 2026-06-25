import BottomNav from './BottomNav';

export default function Layout({ titulo, children }) {
  return (
    <div className="min-h-dvh flex flex-col bg-[#f9f9f9]">
      {titulo && (
        <header className="sticky top-0 z-40 flex items-center h-16 px-5 bg-[#f9f9f9] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
          <h1 className="text-[20px] font-bold text-[#006492] tracking-tight">{titulo}</h1>
        </header>
      )}
      <main className="flex-1 pb-24 px-5 py-5 max-w-xl mx-auto w-full">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

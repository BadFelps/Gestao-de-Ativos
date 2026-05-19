import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useLocalAuth } from '@/lib/LocalAuthContext';
import { useState } from 'react';
import { LayoutDashboard, Users, Package, LogOut, Menu, ChevronRight, FileText, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = {
  gestor: [
    { path: '/renovams/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/renovams/clientes', icon: Users, label: 'Clientes' },
    { path: '/renovams/divergentes', icon: AlertTriangle, label: 'Divergentes' },
    { path: '/renovams/protocolos', icon: FileText, label: 'Protocolos' },
    { path: '/renovams/usuarios', icon: Users, label: 'Usuários' },
  ],
  vendedor: [
    { path: '/renovams/minha-carteira', icon: Package, label: 'Minha Renovação' },
  ],
};

const LOGO_URL = 'https://media.base44.com/images/public/69efad67f4079ddda9110dd4/d1e00f320_ChatGPTImage28deabrde202610_30_10.png';

// Componente estável — fora do RenovaLayout para evitar remontagem a cada render
function SidebarContent({ role, setor, setorNome, perfil, items, location, onNavClick, onLogout }) {
  return (
    <div className="flex flex-col h-full text-white" style={{background: 'linear-gradient(180deg, hsl(122,58%,17%) 0%, hsl(122,60%,13%) 100%)'}}>
      <div className="p-5 border-b border-white/10" style={{background: 'hsl(122,62%,12%)'}}>
        <div className="flex items-center gap-3">
          <img src={LOGO_URL} alt="RenovaMS" className="w-10 h-10 rounded-xl object-cover shadow-md" />
          <div>
            <p className="font-bold text-sm leading-tight tracking-wide">RenovaMS</p>
            {setor ? <p className="text-white/50 text-xs">{setorNome}</p> : <p className="text-white/50 text-xs capitalize">{perfil}</p>}
          </div>
        </div>
      </div>
      <nav className="p-4 flex-1 space-y-0.5">
        {items.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} onClick={onNavClick}
              className={cn('flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                active ? 'bg-white/20 text-white shadow-sm' : 'text-white/60 hover:text-white hover:bg-white/10')}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-white/10" style={{background: 'hsl(122,62%,12%)'}}>
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0" style={{background: 'hsl(122,50%,35%)'}}>
            {role[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold capitalize">{role}</p>
            {setor && <p className="text-white/50 text-xs">Setor: {setor}</p>}
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 w-full px-3 py-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl text-sm transition-all">
          <LogOut className="w-4 h-4" />Sair
        </button>
      </div>
    </div>
  );
}

export default function RenovaLayout() {
  const { perfil, setor, setorNome, logout: localLogout } = useLocalAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = perfil || 'vendedor';
  const items = navItems[role] || navItems.vendedor;

  const handleLogout = () => {
    localLogout();
    navigate('/', { replace: true });
  };

  const sidebarProps = { role, setor, setorNome, perfil, items, location, onNavClick: () => setMobileOpen(false), onLogout: handleLogout };

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <aside className="hidden md:flex flex-col w-60 shrink-0 shadow-xl">
        <SidebarContent {...sidebarProps} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-60 z-50 shadow-2xl">
            <SidebarContent {...sidebarProps} />
          </aside>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
          <span className="font-semibold text-sm">RenovaMS</span>
          <div className="w-9" />
        </header>
        <main className="flex-1 overflow-auto"><Outlet /></main>
      </div>
    </div>
  );
}
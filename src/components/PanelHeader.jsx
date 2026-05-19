import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { LogOut, User, Beer, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

const panelColors = {
  admin: 'from-amber-500 to-orange-600',
  logistics: 'from-blue-500 to-indigo-600',
  driver: 'from-emerald-500 to-teal-600',
  warehouse: 'from-purple-500 to-violet-600',
  commercial: 'from-rose-500 to-pink-600',
};

export default function PanelHeader({ panel, title }) {
  const [userFullName, setUserFullName] = useState('');

  useEffect(() => {
    base44.auth.me().then(user => setUserFullName(user?.full_name || '')).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout('/');
  };

  return (
    <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className={`w-9 h-9 rounded-xl bg-gradient-to-br ${panelColors[panel]} flex items-center justify-center`}>
            <Beer className="w-5 h-5 text-white" />
          </Link>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-tight">{title}</h1>
            {userFullName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {userFullName}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground gap-1">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Início</span>
            </Button>
          </Link>
          {userFullName && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground">
              <LogOut className="w-4 h-4 mr-1" />
              Sair
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
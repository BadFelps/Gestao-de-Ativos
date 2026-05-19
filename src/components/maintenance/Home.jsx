import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Truck, MapPin, Warehouse, BarChart3, ArrowRight, Recycle, Wrench, Settings2, LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

const panels = [
  { key: 'admin', title: 'Administrativo', description: 'Cadastro de ordens de serviço', icon: Shield, color: 'from-amber-500 to-orange-600', path: '/Admin' },
  { key: 'logistics', title: 'Logística', description: 'Torre de controle e rotas', icon: Truck, color: 'from-blue-500 to-indigo-600', path: '/Logistics' },
  { key: 'driver', title: 'Motorista', description: 'Rota do dia e check-in', icon: MapPin, color: 'from-emerald-500 to-teal-600', path: '/Driver' },
  { key: 'warehouse', title: 'Armazém', description: 'Conferência de materiais', icon: Warehouse, color: 'from-purple-500 to-violet-600', path: '/WarehousePanel' },
  { key: 'commercial', title: 'Comercial', description: 'Acompanhamento de tratativas', icon: BarChart3, color: 'from-rose-500 to-pink-600', path: '/Commercial' },
  { key: 'renovams', title: 'RenovaMS', description: 'Renovação e gestão de ativos', icon: Recycle, color: 'from-green-500 to-emerald-600', path: '/RenovaMS' },
  { key: 'maintenance', title: 'Manutenção de Ativos', description: 'Solicitações e execução', icon: Wrench, color: 'from-purple-500 to-violet-600', path: '/Maintenance' },
  { key: 'gerenciais', title: 'Gerenciais', description: 'Acessos e configurações', icon: Settings2, color: 'from-slate-500 to-slate-700', path: '/Gerenciais' }
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [allowedPanels, setAllowedPanels] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser) {
          setUser(currentUser);
          setAllowedPanels(currentUser.allowed_panels || []);
        }
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
      }
    };
    loadUser();
  }, []);

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      toast.success('Desconectado com sucesso');
    } catch (error) {
      toast.error('Erro ao desconectar');
    }
  };

  const visiblePanels = panels.filter(p => allowedPanels.includes(p.key));

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12">
          
          <img 
            src="https://media.base44.com/images/public/69b984ecbe7402af99e141a5/107da0ce3_Logo-Gesto-de-Ativos.png" 
            alt="Grupo MS Logo" 
            className="w-24 h-24 sm:w-32 sm:h-32 mb-4 sm:mb-6 mx-auto"
          />
          <h1 className="text-2xl sm:text-4xl font-extrabold text-foreground tracking-tight">Gestão de Ativos - Grupo MS</h1>
          <p className="text-muted-foreground mt-2 sm:mt-3 text-sm sm:text-lg max-w-md mx-auto">
            Painel intersetores de gestão de ativos
          </p>
          
          {user && (
            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              <span className="text-muted-foreground">Bem-vindo, <strong>{user.full_name}</strong></span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          )}
        </motion.div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {visiblePanels.map((panel, i) =>
          <motion.div
            key={panel.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}>
            
              <Link
              to={panel.path}
              className="group flex items-center gap-4 bg-card rounded-2xl border p-4 sm:p-6 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 active:scale-95 sm:block">
              
                <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${panel.color} flex items-center justify-center shadow-sm`}>
                  <panel.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 sm:mt-4">
                  <h2 className="text-base sm:text-lg font-bold text-foreground">{panel.title}</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">{panel.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary shrink-0 sm:hidden" />
              </Link>
            </motion.div>
          )}
        </div>

        {visiblePanels.length === 0 && (
          <div className="text-center mt-12">
            <p className="text-muted-foreground">Você não tem acesso a nenhum módulo. Contate um administrador.</p>
          </div>
        )}
      </div>
    </div>
  );
}
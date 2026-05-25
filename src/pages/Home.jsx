import { useNavigate } from 'react-router-dom';
import { ChevronRight, BarChart3, Shield, Wrench, Truck, MapPin, Package, Settings, RotateCw, ShoppingBag } from 'lucide-react';
import { useAccess } from '@/lib/accessContext';

const MODULES = [
{
  key: 'admin',
  title: 'Administrativo',
  description: 'Triagem das solicitações e controle geral do processo',
  icon: Shield,
  color: 'from-orange-500 to-red-500',
  iconBg: 'bg-gradient-to-br from-orange-500 to-red-500',
},
{
  key: 'loans',
  title: 'Empréstimos e Recolhas',
  description: 'Solicitações de entrega e recolha de materiais',
  icon: ShoppingBag,
  color: 'from-orange-400 to-amber-500',
  iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500',
},
{
  key: 'logistics',
  title: 'Logística',
  description: 'Torre de controle e atribuição de rotas',
  icon: Truck,
  color: 'from-blue-500 to-cyan-500',
  iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
},
{
  key: 'driver',
  title: 'Motorista',
  description: 'Execução de rotas e coleta de ativos',
  icon: MapPin,
  color: 'from-green-500 to-emerald-500',
  iconBg: 'bg-gradient-to-br from-green-500 to-emerald-500',
},
{
  key: 'warehouse',
  title: 'Armazém',
  description: 'Conferência e recebimento de materiais recolhidos',
  icon: Package,
  color: 'from-purple-500 to-pink-500',
  iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
},
{
  key: 'commercial',
  title: 'Comercial',
  description: 'Gestão de ocorrências de rota de recolha de comodatos',
  icon: BarChart3,
  color: 'from-pink-500 to-rose-500',
  iconBg: 'bg-gradient-to-br from-pink-500 to-rose-500',
},
{
  key: 'maintenance',
  title: 'Manutenção de Ativos',
  description: 'Orçamentos, execução do serviço e registro de etapas',
  icon: Wrench,
  color: 'from-purple-500 to-indigo-500',
  iconBg: 'bg-gradient-to-br from-purple-500 to-indigo-500',
},
{
  key: 'renovams',
  title: 'RenovaMS',
  description: 'Gestão de campanhas de renovação de documentos',
  icon: RotateCw,
  color: 'from-emerald-500 to-teal-500',
  iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
},
{
  key: 'gerenciais',
  title: 'Gerenciais',
  description: 'Configurações e relatórios do sistema',
  icon: Settings,
  color: 'from-gray-600 to-slate-700',
  iconBg: 'bg-gradient-to-br from-gray-600 to-slate-700',
},
];

export default function Home() {
  const navigate = useNavigate();
  const { getSession } = useAccess();



  const handleModuleClick = (moduleKey) => {
    // Manutenção vai direto sem login (tem login próprio dentro)
    if (moduleKey === 'maintenance') {
      navigate('/Maintenance');
      return;
    }
    // RenovaMS vai direto para a tela de login com PIN
    if (moduleKey === 'renovams') {
      navigate('/RenovaMS');
      return;
    }
    if (moduleKey === 'loans') {
      navigate('/loans/login');
      return;
    }
    const session = getSession(moduleKey);
    if (session) {
      const pathMap = { warehouse: 'Warehouse' };
      const modulePath = pathMap[moduleKey] || (moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1));
      navigate(`/${modulePath}`);
    } else {
      navigate(`/access/${moduleKey}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50">
      {/* Header */}
      <div className="w-full bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center gap-3 mb-2">
            <img src="https://media.base44.com/images/public/69b984ecbe7402af99e141a5/99d0614e7_9c5566f29_sd.png" alt="Grupo MS" className="w-12 h-12 rounded-2xl" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestão de Ativos</h1>
              <p className="text-xs text-gray-500">Grupo MS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((module) => (
            <button
              key={module.key}
              onClick={() => handleModuleClick(module.key)}
              className="group relative bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-300 hover:border-gray-300 hover:shadow-lg active:scale-95"
            >
              {/* Background gradient subtle */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${module.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />

              <div className="relative flex items-start justify-between">
                <div className="flex-1 text-left">
                  {/* Icon em rounded square */}
                   <div className={`w-12 h-12 rounded-xl ${module.iconBg} flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110 shadow-lg`}>
                     <module.icon className="w-6 h-6 text-white" />
                   </div>

                  {/* Title e description */}
                  <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition-colors">
                    {module.title}
                  </h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {module.description}
                  </p>
                </div>

                {/* Arrow */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-300 group-hover:bg-gray-100 ml-4`}>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-500">
            Sistema de gestão de ativos da Grupo MS
          </p>
        </div>
      </div>
    </div>
  );
}
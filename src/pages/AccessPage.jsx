import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAccess } from '@/lib/accessContext';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Shield, Truck, MapPin, Package, BarChart3, Wrench, Settings, RotateCw } from 'lucide-react';

const PANEL_ACCESS = {
  admin: '1234',
  logistics: '5678',
  driver: '9012',
  warehouse: '3456',
  commercial: '7890',
  maintenance: '2468',
  gerenciais: '1111',
};

const MODULE_INFO = {
  admin:       { title: 'Administrativo',        icon: Shield,   color: 'from-orange-500 to-red-500' },
  logistics:   { title: 'Logística',             icon: Truck,    color: 'from-blue-500 to-cyan-500' },
  driver:      { title: 'Motorista',             icon: MapPin,   color: 'from-green-500 to-emerald-500' },
  warehouse:   { title: 'Armazém',               icon: Package,  color: 'from-purple-500 to-pink-500' },
  commercial:  { title: 'Comercial',             icon: BarChart3,color: 'from-pink-500 to-rose-500' },
  maintenance: { title: 'Manutenção de Ativos',  icon: Wrench,   color: 'from-purple-500 to-indigo-500' },
  gerenciais:  { title: 'Gerenciais',            icon: Settings, color: 'from-gray-600 to-slate-700' },
  renovams:    { title: 'RenovaMS',              icon: RotateCw, color: 'from-emerald-500 to-teal-500' },
};

const REVENDA_MODULES = ['admin', 'logistics', 'driver', 'warehouse', 'commercial'];
const REVENDAS = ['MS Paulo Afonso', 'MS Delmiro Gouveia'];

export default function AccessPage() {
  const navigate = useNavigate();
  const { module } = useParams();
  const { login } = useAccess();
  const [accessCode, setAccessCode] = useState('');
  const [revenda, setRevenda] = useState('');
  const [step, setStep] = useState(REVENDA_MODULES.includes(module) ? 'revenda' : 'code');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const moduleInfo = MODULE_INFO[module];

  if (!moduleInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
          <Card className="shadow-2xl border-0">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <h1 className="text-xl font-bold text-gray-900">Módulo não encontrado</h1>
              </div>
              <p className="text-gray-600 mb-6">O módulo solicitado não existe.</p>
              <Button className="w-full" onClick={() => navigate('/')}>
                Voltar ao início
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  const handleLogin = async () => {
       if (!accessCode.trim()) {
         setError('Por favor, informe o código de acesso');
         return;
       }

       setIsLoading(true);
       try {
         if (module === 'renovams') {
           sessionStorage.removeItem('renova_session');
           navigate(`/RenovaMS`, { replace: true });
         } else {
        // Filtra por código + role. Se o módulo usa revenda, verifica revenda estritamente.
        const allCodes = await base44.entities.AccessCode.filter({ code: accessCode, role: module });
        const codes = allCodes.filter(c => {
          if (!REVENDA_MODULES.includes(module)) return true; // módulo sem revenda: aceita qualquer
          if (!revenda) return true; // usuário não selecionou revenda: aceita qualquer
          // Se o código tem revenda específica, deve bater exatamente com a revenda selecionada
          if (c.revenda && c.revenda !== '') return c.revenda === revenda;
          // Código sem revenda = acesso geral, aceita em qualquer revenda
          return true;
        });
        if (codes.length > 0) {
          login(module, codes[0].name, accessCode, revenda || null);
          // Para o warehouse, também salva no sessionStorage próprio
          if (module === 'warehouse') {
            sessionStorage.setItem('warehouse_session', JSON.stringify({ operatorName: codes[0].name, revenda: revenda || null }));
          }
          const pathMap = { maintenance: 'Maintenance', warehouse: 'Warehouse' };
          const path = pathMap[module] || (module.charAt(0).toUpperCase() + module.slice(1));
          navigate(`/${path}`, { replace: true });
        } else {
          setError('Código de acesso inválido');
        }
      }
    } catch (err) {
      setError('Erro ao validar código de acesso');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <Card className="shadow-2xl border-0">
          <div className="p-8">
            {/* Header com cores dinâmicas */}
            <div className="flex items-center gap-4 mb-8">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${moduleInfo.color} flex items-center justify-center shadow-lg`}>
                <moduleInfo.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{moduleInfo.title}</h1>
                <p className="text-sm text-gray-500">{step === 'revenda' ? 'Selecione a empresa' : 'Código de acesso'}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {step === 'revenda' ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 font-medium mb-2">Qual empresa você vai acessar?</p>
                <div className="flex flex-col gap-3">
                  {REVENDAS.map(r => (
                    <button
                      key={r}
                      onClick={() => { setRevenda(r); setStep('code'); setError(''); }}
                      className={`w-full h-14 rounded-xl border-2 text-base font-bold transition-all flex items-center justify-center
                        ${revenda === r
                          ? `bg-gradient-to-r ${moduleInfo.color} text-white border-transparent shadow-lg`
                          : 'bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:bg-gray-50'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <Button variant="outline" className="w-full h-11 mt-2" onClick={() => navigate('/')}>
                  Voltar
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {revenda && (
                  <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                    <span className="text-sm font-semibold text-orange-700">{revenda}</span>
                    {REVENDA_MODULES.includes(module) && (
                      <button onClick={() => setStep('revenda')} className="ml-auto text-xs text-orange-500 hover:text-orange-700 underline">Trocar</button>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código de Acesso</label>
                  <Input
                    type="password"
                    placeholder="••••••"
                    value={accessCode}
                    onChange={(e) => {
                      setAccessCode(e.target.value);
                      setError('');
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-11"
                    onClick={() => REVENDA_MODULES.includes(module) ? setStep('revenda') : navigate('/')}
                  >
                    Voltar
                  </Button>
                  <Button
                    disabled={isLoading}
                    className={`flex-1 h-11 text-white bg-gradient-to-r ${moduleInfo.color} hover:opacity-90`}
                    onClick={handleLogin}
                  >
                    {isLoading ? 'Validando...' : 'Entrar'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext';
import { BarChart3, Shield, Wrench, ArrowRight, ArrowLeft, Lock, Truck, MapPin, Package, Settings, RotateCw } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const panels = [
  { key: 'commercial', title: 'Comercial', description: 'Abrir solicitações de manutenção e aprovar orçamentos', icon: BarChart3, color: 'from-pink-500 to-rose-500' },
  { key: 'admin', title: 'Administrativo', description: 'Triagem das solicitações e controle geral do processo', icon: Shield, color: 'from-orange-500 to-red-500' },
  { key: 'technician', title: 'Técnico', description: 'Orçamentos, execução do serviço e registro de etapas', icon: Wrench, color: 'from-purple-500 to-indigo-500' },
];

export default function Maintenance() {
  const [selectedPanel, setSelectedPanel] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAccess();
  const navigate = useNavigate();

  const handleSelectPanel = (panelKey) => {
    setSelectedPanel(panelKey);
    setCode('');
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const roleMap = { commercial: 'maintenance_commercial', admin: 'maintenance_admin', technician: 'maintenance_technician' };
      const codes = await base44.entities.AccessCode.filter({ code, role: roleMap[selectedPanel] });
      if (codes.length > 0) {
        login(`maintenance_${selectedPanel}`, codes[0].name, code);
        navigate(`/Maintenance/${selectedPanel === 'commercial' ? 'Commercial' : selectedPanel === 'admin' ? 'Admin' : 'Technician'}`);
      } else {
        setError('Código de acesso inválido');
      }
    } catch (err) {
      setError('Erro ao validar código');
    } finally {
      setLoading(false);
    }
  };

  if (selectedPanel) {
    const panel = panels.find(p => p.key === selectedPanel);
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background: 'linear-gradient(135deg, hsl(0,0%,97%) 0%, hsl(0,0%,92%) 100%)'}}>
        <div className="w-full max-w-sm">
          <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-8">
            <button onClick={() => setSelectedPanel(null)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <div className="text-center space-y-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${panel.color} flex items-center justify-center mx-auto shadow-lg`}>
                <panel.icon className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{panel.title}</h1>
                <p className="text-muted-foreground text-sm mt-2">Manutenção de Ativos</p>
              </div>
            </div>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-medium">Código de Acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input id="code" type="password" placeholder="••••••" value={code} onChange={(e) => { setCode(e.target.value); setError(''); }} className="pl-10" disabled={loading} autoFocus />
                </div>
              </div>
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-xs text-red-700">{error}</p></div>}
              <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={!code || loading}>{loading ? 'Validando...' : 'Entrar'}</Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-md mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => window.location.href = '/'} className="p-2 rounded-full hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-foreground">Manutenção de Ativos</h1>
            <p className="text-xs text-muted-foreground">Selecione seu painel de acesso</p>
          </div>
        </div>
        <div className="space-y-3">
          {panels.map((panel, i) => (
            <motion.div key={panel.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <button onClick={() => handleSelectPanel(panel.key)} className="w-full group flex items-center gap-4 bg-card rounded-2xl border p-4 hover:shadow-lg transition-all duration-200 active:scale-95">
                <div className={`shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br ${panel.color} flex items-center justify-center shadow-sm`}>
                  <panel.icon className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h2 className="text-base font-bold text-foreground">{panel.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{panel.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary shrink-0" />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
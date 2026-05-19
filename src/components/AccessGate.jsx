import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Lock, LogIn, Beer } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccessGate({ panel, children }) {
  const { getSession, login } = useAccess();
  const session = getSession(panel);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const panelLabels = {
    admin: 'Painel Administrativo',
    logistics: 'Painel Logística',
    driver: 'Painel Motorista',
    warehouse: 'Painel Armazém',
    commercial: 'Painel Comercial',
  };

  const panelColors = {
    admin: 'from-amber-500 to-orange-600',
    logistics: 'from-blue-500 to-indigo-600',
    driver: 'from-emerald-500 to-teal-600',
    warehouse: 'from-purple-500 to-violet-600',
    commercial: 'from-rose-500 to-pink-600',
  };

  if (session) return children;

  const handleLogin = async () => {
    if (!code.trim()) {
      setError('Informe o código de acesso');
      return;
    }
    setLoading(true);
    setError('');
    const codes = await base44.entities.AccessCode.filter({ code: code.trim(), panel, is_active: true });
    if (codes.length === 0) {
      setError('Código inválido ou sem acesso a este painel');
      setLoading(false);
      return;
    }
    const matched = codes[0];
    login(panel, matched.owner_name, matched.code);
    await base44.entities.ActivityLog.create({
      action: 'Login',
      panel,
      operator_name: matched.owner_name,
      access_code: matched.code,
      details: `Acesso ao ${panelLabels[panel]}`,
    });
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${panelColors[panel]} mb-4`}>
            <Beer className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">{panelLabels[panel]}</h1>
          <p className="text-muted-foreground text-sm mt-1">Informe seu código de acesso</p>
        </div>

        <div className="bg-card rounded-2xl border p-6 shadow-sm space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Código de Acesso</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                placeholder="••••••"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="pl-10 h-12 text-lg tracking-widest"
              />
            </div>
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <Button
            onClick={handleLogin}
            disabled={loading}
            className="w-full h-12 text-base font-semibold"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
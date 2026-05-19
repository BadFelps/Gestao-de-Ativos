import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Package } from 'lucide-react';

export default function WarehouseLogin({ onLogin }) {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!code.trim()) {
      setError('Informe o código de acesso');
      return;
    }
    setLoading(true);
    try {
      const results = await base44.entities.AccessCode.filter({ code: code.trim(), role: 'warehouse' });
      if (results.length > 0) {
        onLogin(results[0].name);
      } else {
        setError('Código de acesso inválido');
      }
    } catch {
      setError('Erro ao validar código');
    } finally {
      setLoading(false);
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
            <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-3xl">
                🏭
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Armazém</h1>
                <p className="text-sm text-gray-500">Conferência de materiais</p>
              </div>
            </div>

            {error && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Código de Acesso</label>
                <Input
                  type="password"
                  placeholder="••••••"
                  value={code}
                  onChange={e => { setCode(e.target.value); setError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 h-11" onClick={() => navigate('/')}>
                  Cancelar
                </Button>
                <Button
                  disabled={loading}
                  className="flex-1 h-11 bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
                  onClick={handleLogin}
                >
                  {loading ? 'Validando...' : 'Entrar'}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
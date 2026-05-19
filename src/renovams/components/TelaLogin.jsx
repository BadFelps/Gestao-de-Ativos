import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Delete } from 'lucide-react';
import { useLocalAuth } from '@/lib/LocalAuthContext';

const LOGO_URL = 'https://media.base44.com/images/public/69b984ecbe7402af99e141a5/bbd61ff9d_image.png';

const SETORES = [
  { label: 'Gestor', value: 'Gestor' },
  { label: '101', value: '101' },
  { label: '102', value: '102' },
  { label: '103', value: '103' },
  { label: '104', value: '104' },
  { label: '105', value: '105' },
  { label: '202', value: '202' },
  { label: '203', value: '203' },
  { label: '204', value: '204' },
  { label: '205', value: '205' },
  { label: '206', value: '206' },
  { label: '207', value: '207' },
  { label: '501', value: '501' },
  { label: '502', value: '502' },
  { label: '503', value: '503' },
  { label: '504', value: '504' },
  { label: '505', value: '505' },
  { label: '506', value: '506' },
];

const PIN_LENGTH = 4;

export default function TelaLogin() {
  const [step, setStep] = useState('setor'); // 'setor' | 'pin'
  const [setorSelecionado, setSetorSelecionado] = useState(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login: loginLocal } = useLocalAuth();

  const handleSetorSelect = (setor) => {
    setSetorSelecionado(setor);
    setPin('');
    setError('');
    setStep('pin');
  };

  const handlePinDigit = (digit) => {
    if (pin.length < PIN_LENGTH) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === PIN_LENGTH) {
        handleLogin(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError('');
  };

  const handleLogin = async (pinValue) => {
    setLoading(true);
    setError('');
    try {
      const codes = await base44.entities.AccessCode.filter({ role: 'renovams', name: setorSelecionado.value });
      const found = codes.find(c => c.code === pinValue);
      if (found) {
        const perfil = setorSelecionado.value === 'Gestor' ? 'gestor' : 'vendedor';
        loginLocal(perfil, setorSelecionado.value);
      } else {
        setError('PIN incorreto. Tente novamente.');
        setPin('');
      }
    } catch {
      setError('Erro ao validar. Tente novamente.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(122,58%,14%) 0%, hsl(122,50%,22%) 50%, hsl(140,45%,28%) 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
          {/* Logo */}
          <div className="text-center space-y-2">
            <img src={LOGO_URL} alt="RenovaMS" className="w-16 h-16 rounded-2xl mx-auto shadow-lg object-cover" />
            <h1 className="text-2xl font-bold text-foreground">RenovaMS</h1>
            <p className="text-muted-foreground text-sm">Gestão de Campanhas</p>
          </div>

          {step === 'setor' && (
            <>
              <p className="text-center text-sm font-medium text-gray-600">Selecione seu setor</p>
              <div className="grid grid-cols-3 gap-2">
                {SETORES.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleSetorSelect(s)}
                    className="py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:border-green-500 hover:bg-green-50 hover:text-green-700 transition-all active:scale-95"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'pin' && (
            <>
              <div className="flex items-center gap-2">
                <button onClick={() => { setStep('setor'); setError(''); setPin(''); }} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <p className="text-sm font-semibold text-gray-700">
                  Setor <span className="text-green-700">{setorSelecionado?.label}</span> — Digite o PIN
                </p>
              </div>

              {/* Indicador de dígitos */}
              <div className="flex justify-center gap-4">
                {Array.from({ length: PIN_LENGTH }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-full border-2 transition-all ${
                      i < pin.length ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Teclado numérico */}
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3,4,5,6,7,8,9].map(d => (
                  <button
                    key={d}
                    onClick={() => handlePinDigit(String(d))}
                    disabled={loading}
                    className="h-14 rounded-2xl bg-gray-50 border border-gray-200 text-xl font-semibold text-gray-800 hover:bg-green-50 hover:border-green-400 hover:text-green-700 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {d}
                  </button>
                ))}
                <div /> {/* espaço vazio */}
                <button
                  onClick={() => handlePinDigit('0')}
                  disabled={loading}
                  className="h-14 rounded-2xl bg-gray-50 border border-gray-200 text-xl font-semibold text-gray-800 hover:bg-green-50 hover:border-green-400 hover:text-green-700 active:scale-95 transition-all disabled:opacity-40"
                >
                  0
                </button>
                <button
                  onClick={handleBackspace}
                  disabled={loading || pin.length === 0}
                  className="h-14 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-300 active:scale-95 transition-all disabled:opacity-30"
                >
                  <Delete className="w-5 h-5 text-gray-600" />
                </button>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center">
                  <p className="text-xs text-red-700 font-medium">{error}</p>
                </div>
              )}

              {loading && (
                <p className="text-center text-sm text-green-700 font-medium animate-pulse">Validando...</p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-white/40 text-xs mt-6">© 2025 Grupo MS · Gestão de Ativos</p>
      </div>
    </div>
  );
}
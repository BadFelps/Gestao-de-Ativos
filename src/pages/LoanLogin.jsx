import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, AlertCircle, Package2, ChevronRight, CheckCircle2 } from 'lucide-react';
import { setLoanSession } from './LoanRequests';

const REVENDAS = ['MS Paulo Afonso', 'MS Delmiro'];

const SETOR_OPTIONS = ['101','102','103','104','105','202','203','204','205','206','207','501','502','503','504','505','506'];

const ROLE_OPTIONS = [
  { value: 'comercial', label: 'Comercial', description: 'Criar, editar e aprovar solicitações', color: 'from-pink-500 to-rose-500' },
  { value: 'analista', label: 'Analista', description: 'Visualizar e atualizar status das solicitações', color: 'from-blue-500 to-cyan-500' },
  { value: 'vendedor', label: 'Vendedor', description: 'Criar solicitações para seu setor', color: 'from-green-500 to-emerald-500' },
  { value: 'armazem', label: 'Armazém', description: 'Acompanhar e sinalizar separação de materiais', color: 'from-purple-500 to-pink-500' },
  { value: 'logistica', label: 'Logística', description: 'Acompanhar solicitações e filtrar por cidade', color: 'from-orange-500 to-amber-500' },
];

// Códigos dos roles para validação via AccessCode
const ROLE_CODE_MAP = {
  comercial: 'loan_comercial',
  analista: 'loan_analista',
  vendedor: 'loan_vendedor',
  armazem: 'loan_armazem',
  logistica: 'loan_logistica',
};

export default function LoanLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState('role'); // role | revenda | vendor_code | setor | confirm
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedRevenda, setSelectedRevenda] = useState(null);
  const [accessCode, setAccessCode] = useState('');
  const [selectedSetor, setSelectedSetor] = useState(null);
  const [operatorName, setOperatorName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setStep('revenda');
    setError('');
  };

  const handleSelectRevenda = async (revenda) => {
    setSelectedRevenda(revenda);
    if (selectedRole.value === 'vendedor') {
      setStep('vendor_code');
    } else {
      // Para outros roles, vai direto e valida via AccessCode
      setStep('code');
    }
    setError('');
  };

  const handleVendorCode = async () => {
    if (!accessCode.trim()) { setError('Informe o código de acesso'); return; }
    setLoading(true);
    try {
      const codes = await base44.entities.AccessCode.filter({ code: accessCode.trim(), role: 'loan_vendedor' });
      if (codes.length > 0) {
        setOperatorName(codes[0].name);
        setStep('setor');
        setError('');
      } else {
        setError('Código de acesso inválido');
      }
    } catch { setError('Erro ao validar código'); }
    finally { setLoading(false); }
  };

  const handleCodeLogin = async () => {
    if (!accessCode.trim()) { setError('Informe o código de acesso'); return; }
    setLoading(true);
    const roleCode = ROLE_CODE_MAP[selectedRole.value];
    try {
      const codes = await base44.entities.AccessCode.filter({ code: accessCode.trim(), role: roleCode });
      if (codes.length > 0) {
        setLoanSession({ role: selectedRole.value, revenda: selectedRevenda, operatorName: codes[0].name });
        navigate('/loans', { replace: true });
      } else {
        setError('Código de acesso inválido');
      }
    } catch { setError('Erro ao validar código'); }
    finally { setLoading(false); }
  };

  const handleSelectSetor = (setor) => {
    setSelectedSetor(setor);
    setStep('confirm');
  };

  const handleConfirm = () => {
    setLoanSession({ role: 'vendedor', revenda: selectedRevenda, operatorName, setor: selectedSetor });
    navigate('/loans', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back */}
        <button
          onClick={() => { if (step === 'role') navigate('/'); else if (step === 'revenda') setStep('role'); else if (step === 'code' || step === 'vendor_code') setStep('revenda'); else if (step === 'setor') { setStep('vendor_code'); setAccessCode(''); } else if (step === 'confirm') setStep('setor'); }}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Package2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Solicitações de Ativos</h1>
                <p className="text-orange-100 text-sm">Gestão de PDV</p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Step: Escolher perfil */}
            {step === 'role' && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Selecione seu perfil</h2>
                {ROLE_OPTIONS.map(role => (
                  <button key={role.value} onClick={() => handleSelectRole(role)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                  >
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{role.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{role.description}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                  </button>
                ))}
              </div>
            )}

            {/* Step: Escolher revenda */}
            {step === 'revenda' && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Selecione a Revenda</h2>
                <p className="text-sm text-gray-500 mb-4">Perfil: <span className="font-semibold text-orange-600">{selectedRole?.label}</span></p>
                {REVENDAS.map(r => (
                  <button key={r} onClick={() => handleSelectRevenda(r)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                  >
                    <p className="font-semibold text-gray-900">{r}</p>
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-orange-500" />
                  </button>
                ))}
              </div>
            )}

            {/* Step: Código de acesso (não-vendedor) */}
            {step === 'code' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Código de Acesso</h2>
                  <p className="text-sm text-gray-500 mt-1">{selectedRole?.label} · {selectedRevenda}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                  <Input type="password" placeholder="••••••" value={accessCode} onChange={e => { setAccessCode(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleCodeLogin()} className="h-11" autoFocus />
                </div>
                <Button onClick={handleCodeLogin} disabled={loading} className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-semibold">
                  {loading ? 'Validando...' : 'Entrar'}
                </Button>
              </div>
            )}

            {/* Step: Código do vendedor */}
            {step === 'vendor_code' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Código de Acesso</h2>
                  <p className="text-sm text-gray-500 mt-1">Vendedor · {selectedRevenda}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Código</label>
                  <Input type="password" placeholder="••••••" value={accessCode} onChange={e => { setAccessCode(e.target.value); setError(''); }}
                    onKeyDown={e => e.key === 'Enter' && handleVendorCode()} className="h-11" autoFocus />
                </div>
                <Button onClick={handleVendorCode} disabled={loading} className="w-full h-11 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-semibold">
                  {loading ? 'Validando...' : 'Avançar'}
                </Button>
              </div>
            )}

            {/* Step: Escolher setor (vendedor) */}
            {step === 'setor' && (
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-1">Selecione seu Setor</h2>
                <p className="text-sm text-gray-500 mb-4">Olá, <span className="font-semibold">{operatorName}</span>! Qual é o seu setor?</p>
                <div className="grid grid-cols-4 gap-2">
                  {SETOR_OPTIONS.map(s => (
                    <button key={s} onClick={() => handleSelectSetor(s)}
                      className="p-2.5 rounded-lg border border-gray-200 hover:border-orange-400 hover:bg-orange-50 text-sm font-bold text-gray-800 transition-all">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step: Confirmação (vendedor) */}
            {step === 'confirm' && (
              <div className="space-y-5">
                <h2 className="text-lg font-bold text-gray-900">Confirmar acesso</h2>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-orange-500" />
                    <p className="font-semibold text-gray-900">{operatorName}</p>
                  </div>
                  <p className="text-sm text-gray-600 pl-7">Perfil: <strong>Vendedor</strong></p>
                  <p className="text-sm text-gray-600 pl-7">Revenda: <strong>{selectedRevenda}</strong></p>
                  <p className="text-sm text-gray-600 pl-7">Setor: <strong>{selectedSetor}</strong></p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('setor')}>Voltar</Button>
                  <Button onClick={handleConfirm} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-semibold">
                    Confirmar e Entrar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
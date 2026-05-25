import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { X, Edit2, CheckCircle2, XCircle, AlertCircle, Loader2, Paperclip, ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import LoanFormModal from './LoanFormModal';

const STATUS_LABELS = {
  pendente_aprovacao_comercial: 'Aguardando Aprovação Comercial',
  aprovado_comercial: 'Aprovado pelo Comercial',
  negado_comercial: 'Negado pelo Comercial',
  pendente_aprovacao_analista: 'Aguardando Aprovação Analista',
  aprovado_analista: 'Aprovado pelo Analista',
  negado_analista: 'Negado pelo Analista',
  pendente: 'Aguardando Entrega',
  entregue: 'Entregue',
  recolhido: 'Recolhido',
  cancelado: 'Cancelado',
};

const STATUS_COLORS = {
  pendente_aprovacao_comercial: 'bg-yellow-100 text-yellow-800',
  aprovado_comercial: 'bg-blue-100 text-blue-800',
  negado_comercial: 'bg-red-100 text-red-700',
  pendente_aprovacao_analista: 'bg-purple-100 text-purple-800',
  aprovado_analista: 'bg-emerald-100 text-emerald-800',
  negado_analista: 'bg-red-100 text-red-700',
  pendente: 'bg-teal-100 text-teal-800',
  entregue: 'bg-green-100 text-green-800',
  recolhido: 'bg-blue-100 text-blue-800',
  cancelado: 'bg-gray-100 text-gray-600',
};

const ANALISTA_DENIAL_REASONS = [
  { code: 1, label: 'Pendente Documento com Foto' },
  { code: 2, label: 'Cliente com pendência' },
  { code: 3, label: 'Pendente comprovante de residência' },
];

async function notifyTeams(type, request) {
  try {
    await base44.functions.invoke('notifyLoanTeams', { type, request });
  } catch (e) {
    console.error('Teams notify error', e);
  }
}

export default function LoanDetailModal({ request, session, onClose, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDenialForm, setShowDenialForm] = useState(null); // 'comercial' | 'analista'
  const [denialReason, setDenialReason] = useState('');
  const [denialCodes, setDenialCodes] = useState([]); // multi-select array
  const [separationLoading, setSeparationLoading] = useState(false);
  const [attachLoading, setAttachLoading] = useState(false);
  const fileInputRef = useRef(null);

  const { role, operatorName } = session;
  const r = request;

  const canEdit = (() => {
    if (['entregue', 'recolhido'].includes(r.status)) return false;
    if (role === 'comercial') return true;
    if (role === 'vendedor') {
      if (r.created_by_role === 'comercial') return false;
      if (r.commercial_decision && r.commercial_decision !== '') return false;
      return r.created_by_setor === session.setor || r.created_by_name === operatorName;
    }
    return false;
  })();

  const canApproveCommercial = role === 'comercial' && r.status === 'pendente_aprovacao_comercial';
  const canApproveAnalista = role === 'analista' && r.status === 'pendente_aprovacao_analista';
  // Analista pode cancelar negação e aprovar mesmo se já negou
  const canReverseAnalistaDenial = role === 'analista' && r.status === 'negado_analista';
  const canUpdateStatus = role === 'analista' && ['pendente', 'aprovado_analista', 'entregue'].includes(r.status);
  const canSeparation = role === 'armazem';
  const canAttachDoc = (role === 'comercial' || role === 'vendedor') &&
    r.status === 'negado_analista' && (r.analista_denial_codes?.includes(1) || r.analista_denial_codes?.includes(3) ||
    r.analista_denial_code === 1 || r.analista_denial_code === 3);
  const canCancel = (role === 'comercial') || (role === 'vendedor' && canEdit);
  const canDelete = role === 'comercial' || role === 'analista';

  const doUpdate = async (data) => {
    setLoading(true);
    await base44.entities.LoanRequest.update(r.id, data);
    setLoading(false);
    toast.success('Atualizado!');
    onUpdated?.();
  };

  const handleCommercialApprove = async () => {
    const nextStatus = r.request_type === 'Fixo' ? 'pendente_aprovacao_analista' : 'pendente';
    await doUpdate({
      commercial_decision: 'aprovado',
      commercial_decision_by: operatorName,
      commercial_decision_date: new Date().toISOString(),
      status: nextStatus,
    });
  };

  const handleCommercialDeny = async () => {
    if (!denialReason.trim()) { toast.error('Informe o motivo'); return; }
    const updated = {
      commercial_decision: 'negado',
      commercial_decision_by: operatorName,
      commercial_decision_date: new Date().toISOString(),
      commercial_denial_reason: denialReason,
      status: 'negado_comercial',
    };
    await doUpdate(updated);
    notifyTeams('negada_comercial', { ...r, ...updated });
  };

  const handleAnalistaApprove = async () => {
    await doUpdate({
      analista_decision: 'aprovado',
      analista_decision_by: operatorName,
      analista_decision_date: new Date().toISOString(),
      status: 'aprovado_analista',
    });
  };

  const handleAnalistaDeny = async () => {
    if (denialCodes.length === 0) { toast.error('Selecione pelo menos um motivo'); return; }
    const reasons = ANALISTA_DENIAL_REASONS.filter(x => denialCodes.includes(x.code)).map(x => x.label);
    const reasonText = reasons.join('; ');
    const updated = {
      analista_decision: 'negado',
      analista_decision_by: operatorName,
      analista_decision_date: new Date().toISOString(),
      analista_denial_reason: reasonText,
      analista_denial_codes: denialCodes,
      analista_denial_code: denialCodes[0], // backward compat
      status: 'negado_analista',
    };
    await doUpdate(updated);
    notifyTeams('negada_analista', { ...r, ...updated });
  };

  const toggleDenialCode = (code) => {
    setDenialCodes(prev => prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]);
  };

  const handleStatusChange = async (newStatus) => {
    await doUpdate({ status: newStatus });
  };

  const handleSeparation = async (sepStatus) => {
    setSeparationLoading(true);
    await base44.entities.LoanRequest.update(r.id, { separation_status: sepStatus, separation_by: operatorName });
    setSeparationLoading(false);
    toast.success('Separação atualizada!');
    onUpdated?.();
  };

  const handleAttachFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachLoading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.LoanRequest.update(r.id, { attachment_url: file_url });
      toast.success('Documento anexado!');
      onUpdated?.();
    } catch { toast.error('Erro ao enviar arquivo'); }
    finally { setAttachLoading(false); }
  };

  const handleCancel = async () => {
    if (!confirm('Cancelar esta solicitação?')) return;
    await doUpdate({ status: 'cancelado' });
  };

  const handleDelete = async () => {
    if (!confirm('Excluir permanentemente esta solicitação? Esta ação não pode ser desfeita.')) return;
    setLoading(true);
    await base44.entities.LoanRequest.delete(r.id);
    setLoading(false);
    toast.success('Solicitação excluída!');
    onUpdated?.();
  };

  if (editing) {
    return (
      <LoanFormModal
        session={session}
        existingRequest={r}
        onClose={() => setEditing(false)}
        onSaved={() => { setEditing(false); onUpdated?.(); }}
      />
    );
  }

  // Denial reasons display (supports both old single code and new array)
  const denialReasonsList = r.analista_denial_codes?.length > 0
    ? ANALISTA_DENIAL_REASONS.filter(x => r.analista_denial_codes.includes(x.code)).map(x => x.label)
    : r.analista_denial_reason
    ? [r.analista_denial_reason]
    : [];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">{r.request_number}</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] || 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABELS[r.status] || r.status}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <Edit2 className="w-4 h-4 text-gray-600" />
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">

          {/* Aviso de negação pelo Analista — visível para todos */}
          {r.status === 'negado_analista' && denialReasonsList.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <p className="text-sm font-bold text-red-700">Solicitação Negada pelo Analista</p>
              </div>
              <ul className="text-sm text-red-700 list-disc list-inside space-y-0.5">
                {denialReasonsList.map((m, i) => <li key={i}>{m}</li>)}
              </ul>
              <p className="text-xs text-red-600 mt-1 leading-relaxed">
                ⚠️ Atenção, sua solicitação foi negada pelo(s) motivo(s) acima. Regularize a solicitação enviando a informação necessária via Teams para o Analista de Ativos.
              </p>
            </div>
          )}

          {/* Dados principais */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <InfoRow label="PDV" value={r.pdv_code} />
            <InfoRow label="Tipo Solicitação" value={r.request_type} />
            <InfoRow label="Razão Social" value={r.razao_social} />
            <InfoRow label="Fantasia" value={r.fantasia} />
            <InfoRow label="Cidade" value={r.cidade} />
            <InfoRow label="Bairro" value={r.bairro} />
            <InfoRow label="Setor" value={r.setor} />
            <InfoRow label="Revenda" value={r.revenda} />
            {/* Materiais — mostra todos a partir de extra_items */}
            {(() => {
              let allItems = [];
              if (r.extra_items) {
                try { allItems = JSON.parse(r.extra_items); } catch {}
              }
              if (allItems.length === 0) allItems = [{ asset_type: r.asset_type, asset_brand: r.asset_brand, quantity: r.quantity }];
              return allItems.map((it, i) => (
                <InfoRow key={i} label={i === 0 ? 'Material' : `Material ${i+1}`} value={`${it.asset_type}${it.asset_brand ? ' · ' + it.asset_brand : ''} × ${it.quantity || 1}`} />
              ));
            })()}
            {r.voltage && <InfoRow label="Voltagem" value={r.voltage} />}
            {r.patrimonio && <InfoRow label="Nº Patrimônio" value={r.patrimonio} />}
            {r.comodato_type && <InfoRow label="Tipo de Comodato" value={r.comodato_type} />}
            <InfoRow label="Data Empréstimo" value={r.loan_date} />
            {r.return_date && <InfoRow label="Data Recolha" value={r.return_date} />}
            {r.observations && <div className="col-span-2"><InfoRow label="Observações" value={r.observations} /></div>}
          </div>

          <div className="text-xs text-gray-400 pt-1">
            Criado por: {r.created_by_name} ({r.created_by_role})
          </div>

          {/* Histórico de decisões */}
          {(r.commercial_decision || r.analista_decision) && (
            <div className="space-y-2 border-t pt-3">
              {r.commercial_decision && (
                <div className={`text-xs p-2.5 rounded-lg ${r.commercial_decision === 'aprovado' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="font-semibold">Comercial: {r.commercial_decision === 'aprovado' ? '✓ Aprovado' : '✗ Negado'} por {r.commercial_decision_by}</p>
                  {r.commercial_denial_reason && <p className="mt-0.5 opacity-80">{r.commercial_denial_reason}</p>}
                </div>
              )}
              {r.analista_decision && (
                <div className={`text-xs p-2.5 rounded-lg ${r.analista_decision === 'aprovado' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                  <p className="font-semibold">Analista: {r.analista_decision === 'aprovado' ? '✓ Aprovado' : '✗ Negado'} por {r.analista_decision_by}</p>
                  {r.analista_denial_reason && <p className="mt-0.5 opacity-80">{r.analista_denial_reason}</p>}
                </div>
              )}
            </div>
          )}

          {/* Separação (Armazém) */}
          {r.separation_status && (
            <div className={`text-xs p-2.5 rounded-lg ${r.separation_status === 'concluida' ? 'bg-green-50 text-green-800' : 'bg-yellow-50 text-yellow-800'}`}>
              <p className="font-semibold">Separação: {r.separation_status === 'concluida' ? '✓ Concluída' : '⏳ Em andamento'}{r.separation_by ? ` · ${r.separation_by}` : ''}</p>
            </div>
          )}

          {/* Documento anexado */}
          {r.attachment_url && (
            <a href={r.attachment_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-blue-600 underline hover:text-blue-800">
              <Paperclip className="w-3.5 h-3.5" />
              Ver documento anexado
              <ExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Aprovação Comercial */}
          {canApproveCommercial && !showDenialForm && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowDenialForm('comercial')}>
                <XCircle className="w-4 h-4" /> Negar
              </Button>
              <Button className="flex-1 gap-2 bg-green-500 hover:bg-green-600 text-white" onClick={handleCommercialApprove} disabled={loading}>
                <CheckCircle2 className="w-4 h-4" /> Aprovar
              </Button>
            </div>
          )}

          {showDenialForm === 'comercial' && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-semibold text-gray-800">Motivo da negação (Comercial):</p>
              <textarea value={denialReason} onChange={e => setDenialReason(e.target.value)} rows={3}
                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                placeholder="Descreva o motivo..." />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDenialForm(null)}>Cancelar</Button>
                <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleCommercialDeny} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Negação'}
                </Button>
              </div>
            </div>
          )}

          {/* Aprovação Analista */}
          {canApproveAnalista && !showDenialForm && (
            <div className="flex gap-2 pt-2 border-t">
              <Button variant="outline" className="flex-1 gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={() => setShowDenialForm('analista')}>
                <XCircle className="w-4 h-4" /> Negar
              </Button>
              <Button className="flex-1 gap-2 bg-green-500 hover:bg-green-600 text-white" onClick={handleAnalistaApprove} disabled={loading}>
                <CheckCircle2 className="w-4 h-4" /> Aprovar
              </Button>
            </div>
          )}

          {/* Analista pode cancelar negação e aprovar */}
          {canReverseAnalistaDenial && !showDenialForm && (
            <div className="pt-2 border-t space-y-2">
              <p className="text-xs text-gray-500 font-semibold">Ações do Analista</p>
              <Button className="w-full gap-2 bg-green-500 hover:bg-green-600 text-white" onClick={handleAnalistaApprove} disabled={loading}>
                <CheckCircle2 className="w-4 h-4" /> Cancelar Negação e Aprovar
              </Button>
            </div>
          )}

          {showDenialForm === 'analista' && (
            <div className="space-y-3 pt-2 border-t">
              <p className="text-sm font-semibold text-gray-800">Motivos da negação (Analista) — selecione um ou mais:</p>
              <div className="space-y-2">
                {ANALISTA_DENIAL_REASONS.map(reason => (
                  <label key={reason.code} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${denialCodes.includes(reason.code) ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={denialCodes.includes(reason.code)} onChange={() => toggleDenialCode(reason.code)} className="accent-red-500 w-4 h-4" />
                    <span className="text-sm text-gray-800">{reason.label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowDenialForm(null); setDenialCodes([]); }}>Cancelar</Button>
                <Button size="sm" className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleAnalistaDeny} disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Negação'}
                </Button>
              </div>
            </div>
          )}

          {/* Analista - alterar status operacional */}
          {canUpdateStatus && (
            <div className="pt-2 border-t">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Alterar Status</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'pendente', label: 'Ag. Entrega', color: 'bg-teal-100 text-teal-800 border-teal-200' },
                  { value: 'entregue', label: 'Entregue', color: 'bg-green-100 text-green-800 border-green-200' },
                  { value: 'cancelado', label: 'Cancelado', color: 'bg-gray-100 text-gray-700 border-gray-200' },
                ].map(s => (
                  <button key={s.value} onClick={() => handleStatusChange(s.value)} disabled={loading || r.status === s.value}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-40 ${s.color} hover:opacity-80`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Armazém — separação */}
          {canSeparation && (
            <div className="pt-2 border-t">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Separação do Material</p>
              <div className="flex gap-2">
                <button onClick={() => handleSeparation('em_andamento')} disabled={separationLoading || r.separation_status === 'em_andamento'}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold border bg-yellow-50 text-yellow-800 border-yellow-200 hover:bg-yellow-100 disabled:opacity-40 transition-all">
                  ⏳ Em Andamento
                </button>
                <button onClick={() => handleSeparation('concluida')} disabled={separationLoading || r.separation_status === 'concluida'}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold border bg-green-50 text-green-800 border-green-200 hover:bg-green-100 disabled:opacity-40 transition-all">
                  ✓ Concluída
                </button>
              </div>
            </div>
          )}

          {/* Anexar documento */}
          {canAttachDoc && (
            <div className="pt-2 border-t">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Documentação Solicitada</p>
              <p className="text-xs text-red-600 mb-3">Motivo negação: {r.analista_denial_reason}</p>
              <input type="file" ref={fileInputRef} onChange={handleAttachFile} accept="image/*,.pdf" className="hidden" />
              <Button variant="outline" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={attachLoading}>
                {attachLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
                {attachLoading ? 'Enviando...' : 'Anexar Documento / Foto'}
              </Button>
            </div>
          )}

          {/* Cancelar */}
          {canCancel && !['cancelado', 'negado_comercial', 'negado_analista'].includes(r.status) && !showDenialForm && (
            <div className="pt-2 border-t">
              <button onClick={handleCancel} className="text-xs text-red-500 hover:text-red-700 underline">
                Cancelar solicitação
              </button>
            </div>
          )}

          {/* Excluir */}
          {canDelete && !showDenialForm && (
            <div className="pt-2 border-t">
              <Button variant="outline" size="sm" className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={loading}>
                <Trash2 className="w-4 h-4" /> Excluir Solicitação
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value}</p>
    </div>
  );
}
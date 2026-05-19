import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { PriorityBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAccess } from '@/lib/accessContext.jsx';
import { AlertTriangle, MessageSquare, Loader2, Calendar, RefreshCw, ChevronDown, ChevronUp, History, CheckCircle2, XCircle, Wrench } from 'lucide-react';
import AssetsList from '@/components/AssetsList';
import OSHistoryModal from '@/components/admin/OSHistoryModal';
import { toast } from 'sonner';

export default function CommercialCard({ order: o, onUpdated, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showHistory, setShowHistory] = useState(false);
  const [showTratativa, setShowTratativa] = useState(false);
  const [saving, setSaving] = useState(false);

  // Campos da tratativa
  const [novaData, setNovaData] = useState('');
  const [observacao, setObservacao] = useState('');
  const [cancelar, setCancelar] = useState(false);

  const { getSession } = useAccess();
  const session = getSession('commercial');

  const handleSalvarTratativa = async () => {
    if (!cancelar && !novaData && !observacao.trim()) {
      toast.error('Informe pelo menos uma ação: nova data, observação ou cancelamento.');
      return;
    }
    setSaving(true);
    const update = {
      commercial_comment: observacao.trim() || (cancelar ? 'Solicitado cancelamento da recolha.' : `Nova tentativa sugerida para ${novaData}.`),
      commercial_comment_by: session?.operatorName || 'Comercial',
      commercial_comment_date: new Date().toISOString(),
    };
    if (novaData) update.retry_suggested_date = novaData;
    if (cancelar) {
      update.cancelamento_solicitado = true;
      update.commercial_comment = observacao.trim() || 'Solicitado cancelamento da recolha.';
    }
    await base44.entities.ServiceOrder.update(o.id, update);
    toast.success(cancelar ? 'Cancelamento solicitado ao Administrativo!' : 'Tratativa registrada!');
    setSaving(false);
    setShowTratativa(false);
    onUpdated?.();
  };

  const isOccurrence = o.status === 'Concluído com Ocorrência';
  const jaTemTratativa = !!o.commercial_comment;

  return (
    <div className={`rounded-xl border overflow-hidden transition-shadow hover:shadow-lg ${
      isOccurrence && jaTemTratativa ? 'bg-green-50 border-green-300' :
      isOccurrence ? 'bg-orange-50 border-orange-300' : 'bg-white border-border'
    }`}>
      {isOccurrence && (
        <div className={`${jaTemTratativa ? 'bg-green-600' : 'bg-orange-500'} text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2`}>
          <AlertTriangle className="w-3.5 h-3.5" /> {jaTemTratativa ? 'OCORRÊNCIA — TRATATIVA SINALIZADA' : 'OCORRÊNCIA — ATENÇÃO COMERCIAL'}
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
              <PriorityBadge priority={o.priority} />
            </div>
            <p className="font-bold text-base leading-snug text-foreground">{o.client_name}</p>
            {o.setor && (
              <span className="text-xs font-semibold bg-violet-100 text-violet-800 border border-violet-200 rounded-full px-2 py-0.5 mt-1 inline-block">
                🗂 Setor {o.setor}
              </span>
            )}
            <div className="mt-1"><AssetsList order={o} /></div>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            <button onClick={() => setShowHistory(true)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition-colors" title="Ver histórico">
              <History className="w-4 h-4" />
            </button>
            <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
          </div>
        </div>

        {/* Status em trânsito */}
        {(o.status === 'Em Rota' || o.status === 'No Cliente') && (
          <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2.5 py-0.5 ${o.status === 'Em Rota' ? 'bg-indigo-100 text-indigo-700' : 'bg-purple-100 text-purple-700'}`}>
            {o.status === 'Em Rota' ? '🚚' : '📍'} {o.status}
          </span>
        )}

        {o.assigned_driver && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            🚛 <span>{o.assigned_driver}{o.assigned_vehicle && ` · ${o.assigned_vehicle}`}</span>
          </p>
        )}

        {/* Tratativa já existente — resumo colapsado */}
        {jaTemTratativa && !expanded && (
          <div className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{o.commercial_comment}</span>
          </div>
        )}

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="space-y-3 border-t pt-3">
            {o.client_phone && <p className="text-sm text-muted-foreground">📞 {o.client_phone}</p>}
            {o.route_date && <p className="text-sm text-muted-foreground">📅 Data da rota: <strong>{(() => { try { const [y,m,d] = o.route_date.split('-'); return `${d}/${m}/${y}`; } catch { return o.route_date; } })()}</strong></p>}
            {o.driver_notes && <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg p-2.5">📝 {o.driver_notes}</p>}
            {o.occurrence_reason && (
              <p className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-2.5 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span><strong>{o.occurrence_reason}</strong>{o.occurrence_details && `: ${o.occurrence_details}`}</span>
              </p>
            )}

            {/* Tratativa registrada */}
            {jaTemTratativa && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-blue-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Tratativa registrada
                </p>
                <p className="text-sm text-blue-900">{o.commercial_comment}</p>
                {o.retry_suggested_date && (
                  <p className="text-xs text-orange-700 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Nova tentativa: <strong>{o.retry_suggested_date}</strong>
                  </p>
                )}
                <p className="text-xs text-muted-foreground">Por {o.commercial_comment_by}</p>
              </div>
            )}

            {/* Botão Tratar — apenas para ocorrências sem tratativa, ou para atualizar */}
            {isOccurrence && !showTratativa && (
              <Button size="sm" onClick={() => setShowTratativa(true)} className="w-full gap-2 bg-orange-500 hover:bg-orange-600 text-white h-9">
                <Wrench className="w-4 h-4" />
                {jaTemTratativa ? 'Atualizar Tratativa' : 'Tratar Ocorrência'}
              </Button>
            )}

            {/* Formulário de tratativa */}
            {isOccurrence && showTratativa && (
              <div className="bg-white border border-orange-300 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-orange-800 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4" /> Tratativa da Ocorrência
                </p>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Nova data para tentativa (opcional)
                  </label>
                  <input
                    type="date"
                    value={novaData}
                    onChange={e => setNovaData(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Observação para o Administrativo (opcional)</label>
                  <Textarea
                    placeholder="Ex: Cliente confirma que estará disponível na nova data..."
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
                  <input type="checkbox" checked={cancelar} onChange={e => setCancelar(e.target.checked)} className="w-4 h-4" />
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-semibold text-red-700">Solicitar cancelamento ao Administrativo</span>
                </label>

                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" className="flex-1 h-9" onClick={() => setShowTratativa(false)} disabled={saving}>Cancelar</Button>
                  <Button
                    size="sm"
                    className={`flex-1 h-9 gap-1.5 ${cancelar ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                    onClick={handleSalvarTratativa}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {cancelar ? 'Confirmar Cancelamento' : 'Salvar Tratativa'}
                  </Button>
                </div>
              </div>
            )}

            {o.warehouse_asset_condition && (
              <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-2.5">
                📦 Armazém: <strong>{o.warehouse_asset_condition}</strong>
                {o.warehouse_divergence && <span className="text-orange-600 ml-2">⚠️ Divergência</span>}
              </p>
            )}

            {o.photo_urls?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {o.photo_urls.map((url, idx) => (
                  <a key={idx} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="w-14 h-14 rounded-lg object-cover border hover:opacity-80 transition-opacity" />
                  </a>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {showHistory && <OSHistoryModal order={o} onClose={() => setShowHistory(false)} />}
    </div>
  );
}
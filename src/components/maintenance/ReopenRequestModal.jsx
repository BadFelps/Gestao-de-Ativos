import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { RotateCcw, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ReopenRequestModal({ request, operatorName, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleReopen = async () => {
    setSaving(true);
    await base44.entities.MaintenanceRequest.update(request.id, {
      status: 'pendente_triagem',
      cancellation_reason: null,
      cancelled_by: null,
      commercial_decision: '',
      commercial_decision_by: null,
      commercial_decision_date: null,
      commercial_notes: notes || `Solicitação reaberta por ${operatorName}`,
      admin_notes: null,
      admin_action_by: null,
      admin_action_date: null,
    });
    toast.success('Solicitação reaberta com sucesso!');
    setSaving(false);
    onDone();
  };

  const handleCancelAgain = async () => {
    setSaving(true);
    await base44.entities.MaintenanceRequest.update(request.id, {
      status: 'cancelado',
      commercial_notes: notes || '',
    });
    toast.success('Solicitação mantida como cancelada.');
    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-5 space-y-4">
        <h2 className="text-base font-bold">Reabrir Solicitação Cancelada</h2>

        <div className="p-3 rounded-lg bg-muted space-y-1 text-sm">
          <p className="font-semibold">{request.fantasia || request.razao_social}</p>
          <p className="text-muted-foreground text-xs">PDV: {request.pdv_code} · Plaqueta: {request.asset_tag || '—'}</p>
          <p className="text-xs text-muted-foreground mt-1">{request.problem_description}</p>
          {request.cancellation_reason && (
            <p className="text-xs text-red-600 mt-1">Motivo do cancelamento: {request.cancellation_reason}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Observação (opcional)</Label>
          <Textarea
            placeholder="Motivo da reabertura ou instruções adicionais..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="min-h-[60px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Button
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            onClick={handleReopen}
            disabled={saving}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><RotateCcw className="w-4 h-4" />Reabrir Solicitação</>}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2 border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleCancelAgain}
            disabled={saving}
          >
            <XCircle className="w-4 h-4" /> Manter Cancelada
          </Button>
          <Button variant="ghost" className="w-full" onClick={onClose} disabled={saving}>
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );
}
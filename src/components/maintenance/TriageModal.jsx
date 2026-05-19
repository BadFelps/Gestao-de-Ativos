import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function TriageModal({ request, operatorName, onClose, onDone }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handle = async (action) => {
    setSaving(true);
    await base44.entities.MaintenanceRequest.update(request.id, {
      status: action === 'approve' ? 'em_orcamento' : 'cancelado',
      admin_notes: notes,
      admin_action_by: operatorName,
      admin_action_date: new Date().toISOString(),
      ...(action === 'approve' ? {} : { cancellation_reason: notes, cancelled_by: operatorName }),
    });
    toast.success(action === 'approve' ? 'Solicitação encaminhada ao técnico!' : 'Solicitação cancelada.');
    setSaving(false);
    onDone();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-md p-5 space-y-4">
        <h2 className="text-base font-bold">Triagem da Solicitação</h2>
        <div className="p-3 rounded-lg bg-muted space-y-1 text-sm">
          <p className="font-semibold">{request.fantasia || request.razao_social}</p>
          <p className="text-xs text-muted-foreground">PDV: {request.pdv_code} · Plaqueta: {request.asset_tag || '—'}</p>
          {request.equipment_description && (
            <p className="text-xs text-blue-700 font-medium">🧊 Refrigerador: {request.equipment_description}</p>
          )}
          {request.address && <p className="text-xs text-muted-foreground">📍 {request.address}</p>}
          {request.contact && <p className="text-xs text-muted-foreground">📞 {request.contact}</p>}
          <p className="text-xs text-muted-foreground">{request.problem_description}</p>
        </div>

        <div className="space-y-1">
          <Label className="text-xs">Observações (opcional)</Label>
          <Textarea placeholder="Observações internas para o técnico..." value={notes} onChange={e => setNotes(e.target.value)} className="min-h-[60px]" />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={saving}>Voltar</Button>
          <Button className="flex-1 border-red-200 text-red-600 bg-red-50 hover:bg-red-100" variant="outline" onClick={() => handle('cancel')} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4 mr-1" />Cancelar</>}
          </Button>
          <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handle('approve')} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 mr-1" />Encaminhar</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
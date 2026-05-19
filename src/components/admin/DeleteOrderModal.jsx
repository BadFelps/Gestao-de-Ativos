import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteOrderModal({ order, onClose, onDeleted }) {
  const { getSession } = useAccess();
  const session = getSession('admin');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!reason.trim()) {
      toast.error('Preencha o motivo da exclusão');
      return;
    }
    setLoading(true);
    await base44.entities.ServiceOrder.update(order.id, {
      status: 'Excluído',
      deleted_at: new Date().toISOString(),
      deleted_by: session?.operatorName || 'Admin',
      deletion_reason: reason.trim(),
    });
    await base44.entities.ActivityLog.create({
      action: 'Excluiu OS',
      panel: 'admin',
      operator_name: session?.operatorName || 'Admin',
      access_code: session?.code || '',
      os_number: order.os_number,
      details: `Motivo: ${reason.trim()}`,
    });
    toast.success(`OS ${order.os_number} excluída`);
    setLoading(false);
    onClose?.();
    onDeleted?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-base flex items-center gap-2 text-destructive">
            <Trash2 className="w-4 h-4" /> Excluir OS
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-muted/40 rounded-xl p-3 text-sm">
          <p className="font-mono text-xs font-bold text-primary">{order.os_number}</p>
          <p className="font-semibold">{order.client_name}</p>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Motivo da Exclusão *
          </Label>
          <Textarea
            placeholder="Descreva o motivo da exclusão..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
            className="text-sm"
          />
        </div>

        <p className="text-xs text-muted-foreground bg-yellow-50 border border-yellow-200 rounded-lg p-2.5">
          ⚠️ A OS será movida para a aba de <strong>Excluídos</strong> e ficará disponível para consulta.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading || !reason.trim()}
            className="flex-1 gap-1.5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Excluir OS
          </Button>
        </div>
      </div>
    </div>
  );
}
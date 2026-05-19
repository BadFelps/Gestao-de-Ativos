import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccess } from '@/lib/accessContext.jsx';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function WarehouseResolutionModal({ order, open, onClose, onSaved }) {
  const [resolution, setResolution] = useState(order.warehouse_resolution || '');
  const [newStatus, setNewStatus] = useState(order.status);
  const [saving, setSaving] = useState(false);
  const { getSession } = useAccess();
  const session = getSession('admin');

  const handleSave = async () => {
    if (!resolution.trim()) { toast.error('Descreva a tratativa realizada'); return; }
    setSaving(true);
    await base44.entities.ServiceOrder.update(order.id, {
      warehouse_resolution: resolution.trim(),
      warehouse_resolution_by: session?.operatorName || 'Admin',
      warehouse_resolution_date: new Date().toISOString(),
      status: newStatus,
    });
    await base44.entities.ActivityLog.create({
      action: 'Tratativa Armazém',
      panel: 'admin',
      operator_name: session?.operatorName || 'Admin',
      os_number: order.os_number,
      details: `Tratativa: ${resolution.trim()} | Novo status: ${newStatus}`,
    });
    toast.success('Tratativa registrada com sucesso!');
    setSaving(false);
    onSaved?.();
    onClose();
  };

  const conditionLabel = {
    'Danificado': '🟠 Danificado',
    'Sucata': '🔴 Sucata',
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Registrar Tratativa — {order.os_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1 text-sm bg-muted/30 rounded-xl p-3">
          <p><span className="font-semibold">Cliente:</span> {order.client_name}</p>
          <p><span className="font-semibold">Condição registrada:</span> {conditionLabel[order.warehouse_asset_condition] || order.warehouse_asset_condition}</p>
          {order.warehouse_notes && <p><span className="font-semibold">Obs. Armazém:</span> {order.warehouse_notes}</p>}
          {order.warehouse_divergence_details && <p className="text-red-600"><span className="font-semibold">Divergência:</span> {order.warehouse_divergence_details}</p>}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Descrição da Tratativa *</Label>
            <Textarea
              placeholder="Descreva a ação tomada para resolver a divergência..."
              value={resolution}
              onChange={e => setResolution(e.target.value)}
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Novo Status da OS</Label>
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['Conferido', 'Fechado', 'Concluído', 'Aguardando'].map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Registrar Tratativa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
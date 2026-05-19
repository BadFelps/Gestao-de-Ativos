import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['Aguardando', 'Atribuído', 'Em Rota', 'No Cliente', 'Concluído', 'Concluído com Ocorrência', 'Conferido', 'Fechado'];
const PRIORITIES = ['Baixa', 'Média', 'Alta', 'Urgente'];
const ASSET_TYPES = ['Geladeira Vertical', 'Geladeira Horizontal', 'Freezer', 'Chopeira', 'Display', 'Rack', 'Barril', 'Outro'];
const ACTION_TYPES = ['Entrega', 'Recolha'];

export default function EditOrderModal({ order, open, onClose, onSaved }) {
  const [form, setForm] = useState({ ...order });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setLoading(true);
    await base44.entities.ServiceOrder.update(order.id, form);
    toast.success('OS atualizada com sucesso');
    setLoading(false);
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar OS — {order.os_number}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="space-y-1">
            <Label>Cliente</Label>
            <Input value={form.client_name || ''} onChange={e => set('client_name', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Código do Cliente</Label>
            <Input value={form.client_code || ''} onChange={e => set('client_code', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.client_address || ''} onChange={e => set('client_address', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={form.client_phone || ''} onChange={e => set('client_phone', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Região</Label>
            <Input value={form.region || ''} onChange={e => set('region', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tipo de Ativo</Label>
            <Select value={form.asset_type} onValueChange={v => set('asset_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ASSET_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Série / Patrimônio</Label>
            <Input value={form.asset_serial || ''} onChange={e => set('asset_serial', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Descrição do Ativo</Label>
            <Input value={form.asset_description || ''} onChange={e => set('asset_description', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Tipo de Ação</Label>
            <Select value={form.action_type} onValueChange={v => set('action_type', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ACTION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Prioridade</Label>
            <Select value={form.priority} onValueChange={v => set('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Motorista</Label>
            <Input value={form.assigned_driver || ''} onChange={e => set('assigned_driver', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Veículo / Placa</Label>
            <Input value={form.assigned_vehicle || ''} onChange={e => set('assigned_vehicle', e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Data da Rota</Label>
            <Input type="date" value={form.route_date || ''} onChange={e => set('route_date', e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>Obs. Motorista</Label>
            <Textarea rows={2} value={form.driver_notes || ''} onChange={e => set('driver_notes', e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
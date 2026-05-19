import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, Package, AlertTriangle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const CONDITIONS = ['Bom', 'Danificado', 'Sucata'];
const NO_BRAND_TYPES = ['Barril 30L', 'Barril 50L', 'Cilindro'];

export default function ConferenciaCard({ order, operatorName, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Card Header */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <span className="font-mono text-xs font-bold text-primary">{order.os_number}</span>
            <h4 className="font-semibold text-sm mt-0.5">{order.client_name}</h4>
            {order.client_address && (
              <p className="text-xs text-muted-foreground mt-0.5">📍 {order.client_address}</p>
            )}
            {order.assigned_driver && (
              <p className="text-xs text-muted-foreground mt-0.5">🚛 {order.assigned_driver}</p>
            )}
          </div>
          <span className={`shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${
            order.status === 'Concluído com Ocorrência'
              ? 'bg-orange-100 text-orange-800'
              : 'bg-green-100 text-green-800'
          }`}>
            {order.status}
          </span>
        </div>

        {/* O que o motorista declarou */}
        {order.driver_collected_assets?.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-bold text-blue-800 mb-1">📦 Motorista declarou recolher:</p>
            <div className="space-y-0.5">
              {order.driver_collected_assets.map((d, i) => (
                <p key={i} className="text-xs text-blue-700">
                  • {d.asset_type}{d.asset_brand ? ` (${d.asset_brand})` : ''}: <strong>{d.qty_collected} un.</strong>
                </p>
              ))}
            </div>
          </div>
        )}

        {order.occurrence_reason && (
          <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
            ⚠️ {order.occurrence_reason}{order.occurrence_details ? `: ${order.occurrence_details}` : ''}
          </p>
        )}
      </div>

      {/* Botão abrir conferência */}
      {!open ? (
        <div className="px-4 pb-4">
          <Button
            className="w-full gap-2 bg-purple-600 hover:bg-purple-700"
            onClick={() => setOpen(true)}
          >
            <ClipboardCheck className="w-4 h-4" />
            Iniciar Conferência
          </Button>
        </div>
      ) : (
        <ConferenciaForm
          order={order}
          operatorName={operatorName}
          onSave={async (checklist, notes, hasDivergence, divergenceDetails) => {
            setSaving(true);
            try {
              await base44.entities.ServiceOrder.update(order.id, {
                warehouse_received: true,
                warehouse_checklist: checklist,
                warehouse_divergence: hasDivergence,
                warehouse_divergence_details: hasDivergence ? divergenceDetails : '',
                warehouse_notes: notes,
                warehouse_checked_by: operatorName,
                warehouse_check_date: new Date().toISOString(),
                status: 'Conferido',
              });
              await base44.entities.ActivityLog.create({
                action: 'Conferência armazém',
                panel: 'warehouse',
                operator_name: operatorName,
                os_number: order.os_number,
                details: hasDivergence ? `Divergência: ${divergenceDetails}` : 'Sem divergências.',
              });
              toast.success('Conferência registrada!');
              setOpen(false);
              onUpdated?.();
            } catch {
              toast.error('Erro ao salvar conferência');
            } finally {
              setSaving(false);
            }
          }}
          saving={saving}
          onCancel={() => setOpen(false)}
        />
      )}
    </div>
  );
}

function ConferenciaForm({ order, operatorName, onSave, saving, onCancel }) {
  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => base44.entities.AssetType.list('name'),
    staleTime: 60000,
  });

  // Monta lista de tipos disponíveis
  const typeNames = assetTypes.filter(t => t.is_active).map(t => t.name);

  const [checklist, setChecklist] = useState(() => {
    // Pré-popula com o que o motorista declarou
    if (order.driver_collected_assets?.length > 0) {
      return order.driver_collected_assets.map(d => ({
        asset_type: d.asset_type,
        qty_motorista: d.qty_collected,
        qty_conferente: d.qty_collected, // começa igual, conferente ajusta
        condition: 'Bom',
        notes: '',
      }));
    }
    // Se não tem declaração do motorista, começa vazio
    return [];
  });
  const [selectedTypes, setSelectedTypes] = useState(() =>
    checklist.map(c => c.asset_type)
  );
  const [notes, setNotes] = useState('');

  const toggleType = (name) => {
    if (selectedTypes.includes(name)) {
      setSelectedTypes(selectedTypes.filter(t => t !== name));
      setChecklist(checklist.filter(c => c.asset_type !== name));
    } else {
      setSelectedTypes([...selectedTypes, name]);
      const driverItem = order.driver_collected_assets?.find(d => d.asset_type === name);
      setChecklist([...checklist, {
        asset_type: name,
        qty_motorista: driverItem?.qty_collected ?? null,
        qty_conferente: driverItem?.qty_collected ?? 1,
        condition: 'Bom',
        notes: '',
      }]);
    }
  };

  const updateItem = (index, field, value) => {
    const updated = [...checklist];
    updated[index] = { ...updated[index], [field]: value };
    setChecklist(updated);
  };

  const handleSubmit = () => {
    const divergences = [];
    checklist.forEach(item => {
      if (item.qty_motorista !== null && Number(item.qty_conferente) !== Number(item.qty_motorista)) {
        divergences.push(
          `${item.asset_type}: motorista informou ${item.qty_motorista}, conferente recebeu ${item.qty_conferente}`
        );
      }
      if (item.condition !== 'Bom') {
        divergences.push(`${item.asset_type} com condição: ${item.condition}${item.notes ? ` (${item.notes})` : ''}`);
      }
    });
    const hasDivergence = divergences.length > 0;
    onSave(checklist, notes, hasDivergence, divergences.join('; '));
  };

  const canSubmit = checklist.length > 0 && checklist.every(c => c.qty_conferente > 0 && c.condition);

  return (
    <div className="border-t bg-muted/20 p-4 space-y-5">
      <h3 className="font-bold text-sm">📋 Conferência de Materiais</h3>

      {/* Seleção de tipos */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipos de Material Recebido</Label>
        <div className="grid grid-cols-2 gap-2">
          {typeNames.map(name => {
            const selected = selectedTypes.includes(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleType(name)}
                className={`rounded-xl border-2 p-3 text-xs font-medium text-left transition-all flex items-center gap-2 ${
                  selected
                    ? 'border-purple-500 bg-purple-50 text-purple-800'
                    : 'border-muted bg-card hover:border-purple-300'
                }`}
              >
                <Package className={`w-3.5 h-3.5 shrink-0 ${selected ? 'text-purple-600' : 'text-muted-foreground'}`} />
                <span className="leading-tight">{name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quantidades e condições */}
      {checklist.length > 0 && (
        <div className="space-y-3">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quantidades & Condição</Label>
          {checklist.map((item, i) => {
            const hasDivQty = item.qty_motorista !== null && Number(item.qty_conferente) !== Number(item.qty_motorista);
            return (
              <div key={i} className={`rounded-xl border p-4 space-y-3 ${hasDivQty ? 'bg-red-50 border-red-300' : 'bg-card'}`}>
                <div className="flex items-center gap-2">
                  <Package className={`w-4 h-4 ${hasDivQty ? 'text-red-500' : 'text-purple-600'}`} />
                  <span className="font-semibold text-sm">{item.asset_type}</span>
                  {item.qty_motorista !== null && (
                    <span className="ml-auto text-xs text-muted-foreground">
                      Motorista: <strong>{item.qty_motorista}</strong>
                    </span>
                  )}
                </div>

                {hasDivQty && (
                  <div className="flex items-center gap-2 bg-red-100 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                    <p className="text-xs text-red-700 font-semibold">
                      Divergência de quantidade!
                    </p>
                  </div>
                )}

                {/* Quantidade conferente */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Qtd. Conferida</Label>
                  <Input
                    type="number"
                    min="0"
                    value={item.qty_conferente}
                    onChange={e => updateItem(i, 'qty_conferente', Number(e.target.value))}
                    className="h-10 text-center text-lg font-bold"
                  />
                </div>

                {/* Condição */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Condição</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {CONDITIONS.map(cond => (
                      <button
                        key={cond}
                        type="button"
                        onClick={() => updateItem(i, 'condition', cond)}
                        className={`rounded-lg border-2 py-2 text-xs font-bold transition-all ${
                          item.condition === cond
                            ? cond === 'Bom' ? 'border-green-500 bg-green-50 text-green-700'
                              : cond === 'Danificado' ? 'border-orange-500 bg-orange-50 text-orange-700'
                              : 'border-red-500 bg-red-50 text-red-700'
                            : 'border-muted bg-card hover:border-primary/40'
                        }`}
                      >
                        {cond === 'Bom' ? '✅' : cond === 'Danificado' ? '⚠️' : '🗑️'} {cond}
                      </button>
                    ))}
                  </div>
                </div>

                {item.condition && item.condition !== 'Bom' && (
                  <Input
                    placeholder="Descreva o problema..."
                    value={item.notes}
                    onChange={e => updateItem(i, 'notes', e.target.value)}
                    className="text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Observações gerais */}
      <div className="space-y-1">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Observações (opcional)</Label>
        <Input
          placeholder="Alguma observação adicional..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          disabled={!canSubmit || saving}
          className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
          onClick={handleSubmit}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Confirmar
        </Button>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAccess } from '@/lib/accessContext';
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const NEEDS_PATRIMONIO = ['Refrigerador Vertical', 'Refrigerador Horizontal', 'Chopeira'];
const DEFAULT_BRANDS = ['Devassa', 'Heineken', 'Amstel', 'Schin'];

function needsPatrimonio(asset_type) {
  return NEEDS_PATRIMONIO.some(t => asset_type?.toLowerCase().includes(t.toLowerCase()) ||
    t.toLowerCase().includes(asset_type?.toLowerCase() || '___'));
}

export default function WarehouseConferencia({ order, onSaved, readOnly, lockedForCollection }) {
  const [conferindo, setConferindo] = useState(false);

  const { data: assetTypes = [] } = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => base44.entities.AssetType.filter({ is_active: true }),
    enabled: conferindo,
  });

  const isOccurrence = order.status === 'Concluído com Ocorrência';
  const driverAssets = order.driver_collected_assets || [];
  const warehouseChecklist = order.warehouse_checklist || [];

  // Ativos registrados pelo Administrativo na OS
  const adminAssets = order.assets?.length > 0
    ? order.assets
    : (order.asset_type ? [{ asset_type: order.asset_type, quantity: order.quantity || 1 }] : []);

  const routeDate = order.route_date
    ? format(new Date(order.route_date), "dd/MM/yyyy", { locale: ptBR })
    : order.assigned_date
    ? format(new Date(order.assigned_date), "dd/MM/yyyy", { locale: ptBR })
    : null;

  return (
    <div className={`rounded-xl border overflow-hidden bg-white shadow-sm ${isOccurrence ? 'border-orange-300' : 'border-border'}`}>
      {isOccurrence && (
        <div className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" /> OCORRÊNCIA
        </div>
      )}

      <div className="p-4 space-y-3">
        {/* Header — foco no que importa: motorista, data, cliente, materiais */}
        <div className="space-y-0.5">
          {order.assigned_driver && (
            <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
              🚛 {order.assigned_driver}{order.assigned_vehicle ? ` · ${order.assigned_vehicle}` : ''}
            </p>
          )}
          {routeDate && <p className="text-xs text-muted-foreground">📅 {routeDate}</p>}
          <p className="text-sm text-foreground font-medium">{order.client_name}</p>
          {order.status === 'Conferido' && (
            <span className="inline-block text-xs bg-teal-100 text-teal-800 border border-teal-200 px-2 py-0.5 rounded-full font-semibold">
              ✓ Conferido
            </span>
          )}
        </div>

        {/* Ativos registrados pelo Administrativo */}
        {adminAssets.length > 0 && (
          <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground">
            <p className="font-semibold mb-1">📋 Registrado pelo Administrativo:</p>
            {adminAssets.map((a, i) => (
              <p key={i}>{a.asset_type}: <strong>{a.quantity} un.</strong>{a.asset_patrimonio ? ` · PAT: ${a.asset_patrimonio}` : ''}</p>
            ))}
          </div>
        )}

        {/* O que o motorista declarou */}
        {driverAssets.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-800">
            <p className="font-semibold mb-1">📦 Declarado pelo motorista:</p>
            {driverAssets.map((a, i) => (
              <p key={i}>{a.asset_type}: <strong>{a.qty_collected} un.</strong></p>
            ))}
          </div>
        )}

        {/* Resultado da conferência */}
        {warehouseChecklist.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-800">
            <p className="font-semibold mb-1"><CheckCircle2 className="w-3 h-3 inline mr-1" />Conferido pelo armazém:</p>
            {warehouseChecklist.map((c, i) => (
              <p key={i}>
                {c.asset_type}: <strong>{c.quantity} un.</strong>
                {c.model ? ` · ${c.model}` : ''}
                {c.condition ? ` · ${c.condition}` : ''}
                {c.serial_number ? ` · PAT: ${c.serial_number}` : ''}
              </p>
            ))}
            {order.warehouse_checked_by && <p className="mt-0.5 text-teal-700">Conferente: {order.warehouse_checked_by}</p>}
            {order.warehouse_divergence && (
              <p className="mt-1 text-orange-700 bg-orange-50 border border-orange-200 rounded px-2 py-1">⚠️ {order.warehouse_divergence_details}</p>
            )}
          </div>
        )}

        {/* Ocorrência do motorista */}
        {isOccurrence && order.occurrence_reason && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-800">
            <p className="font-semibold">{order.occurrence_reason}</p>
            {order.occurrence_details && <p>{order.occurrence_details}</p>}
          </div>
        )}

        {/* Botão conferir */}
        {!readOnly && !conferindo && order.status !== 'Conferido' && (
          <Button className="w-full" onClick={() => setConferindo(true)}>
            <CheckCircle2 className="w-4 h-4 mr-2" /> Iniciar Conferência
          </Button>
        )}

        {conferindo && (
          <FormConferencia
            order={order}
            assetTypes={assetTypes}
            onCancel={() => setConferindo(false)}
            onSaved={() => { setConferindo(false); onSaved?.(); }}
          />
        )}
      </div>
    </div>
  );
}

function FormConferencia({ order, assetTypes, onCancel, onSaved }) {
  const { getSession } = useAccess();
  const session = getSession('warehouse');
  const operatorName = session?.operatorName || 'Conferente';

  const typeNames = assetTypes.map(a => a.name);

  // Obtém modelos (brands) do tipo selecionado, igual ao AdminCreateOrderForm
  const getBrands = (asset_type) => {
    const found = assetTypes.find(t => t.name === asset_type);
    return (found?.brands?.length > 0) ? found.brands : DEFAULT_BRANDS;
  };

  const [items, setItems] = useState(() => {
    const base = order.driver_collected_assets?.length > 0
      ? order.driver_collected_assets.map(a => ({ asset_type: a.asset_type, quantity: a.qty_collected, model: '', condition: 'Bom', serial_number: '' }))
      : (order.assets?.length > 0
          ? order.assets.map(a => ({ asset_type: a.asset_type, quantity: a.quantity || 1, model: '', condition: 'Bom', serial_number: '' }))
          : [{ asset_type: order.asset_type || '', quantity: order.quantity || 1, model: '', condition: 'Bom', serial_number: '' }]
        );
    return base;
  });

  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const addItem = () => setItems(prev => [...prev, { asset_type: '', quantity: 1, model: '', condition: 'Bom', serial_number: '' }]);
  const removeItem = (i) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i, field, value) => setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const detectDivergence = () => {
    const declared = order.driver_collected_assets || [];
    if (declared.length === 0) return { has: false, details: '' };
    const divergences = [];
    declared.forEach(d => {
      const found = items.find(c => c.asset_type === d.asset_type);
      const qtyFound = found ? Number(found.quantity) : 0;
      if (qtyFound !== d.qty_collected) {
        divergences.push(`${d.asset_type}: declarado ${d.qty_collected}, conferido ${qtyFound}`);
      }
    });
    items.forEach(c => {
      if (!declared.find(d => d.asset_type === c.asset_type)) {
        divergences.push(`${c.asset_type}: não declarado pelo motorista, encontrado ${c.quantity}`);
      }
    });
    return { has: divergences.length > 0, details: divergences.join('; ') };
  };

  const handleSave = async () => {
    if (items.some(i => !i.asset_type)) { toast.error('Preencha o tipo de todos os ativos'); return; }
    // Valida patrimônio obrigatório para refrigeradores/chopeiras
    for (const item of items) {
      if (needsPatrimonio(item.asset_type) && !item.serial_number?.trim()) {
        toast.error(`Patrimônio é obrigatório para: ${item.asset_type}`);
        return;
      }
    }
    setSaving(true);
    const divergence = detectDivergence();
    await base44.entities.ServiceOrder.update(order.id, {
      status: 'Conferido',
      warehouse_checklist: items,
      warehouse_checked_by: operatorName,
      warehouse_check_date: new Date().toISOString(),
      warehouse_divergence: divergence.has,
      warehouse_divergence_details: divergence.has ? divergence.details : '',
      warehouse_notes: notes,
    });
    toast.success('Conferência registrada! OS marcada como Conferida.');
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="border-t pt-3 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Materiais Conferidos</p>

      {items.map((item, i) => {
      const requiresPatrimonio = needsPatrimonio(item.asset_type);
      // Detecta divergência de quantidade vs motorista
      const declared = order.driver_collected_assets?.find(d => d.asset_type === item.asset_type);
      const qtyDivergent = declared && Number(item.quantity) !== declared.qty_collected;
      // Detecta divergência de patrimônio
      const declaredPatrimonio = (order.assets || []).find(a => a.asset_type === item.asset_type)?.asset_patrimonio;
      const patrimonioDivergent = requiresPatrimonio && declaredPatrimonio && item.serial_number && item.serial_number.trim() !== declaredPatrimonio.trim();
      return (
        <div key={i} className={`border rounded-lg p-3 space-y-2 ${qtyDivergent || patrimonioDivergent ? 'bg-orange-50 border-orange-300' : 'bg-muted/20'}`}>
            {/* Tipo de ativo */}
            <div className="flex items-center gap-2">
              <select
                className="flex-1 h-9 rounded-md border border-input bg-white px-3 text-sm"
                value={item.asset_type}
                onChange={e => updateItem(i, 'asset_type', e.target.value)}
              >
                <option value="">Tipo de ativo</option>
                {typeNames.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => removeItem(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            {/* Marca */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Marca</label>
              <select
                className="w-full h-8 rounded-md border border-input bg-white px-2 text-sm"
                value={item.model}
                onChange={e => updateItem(i, 'model', e.target.value)}
              >
                <option value="">Selecione</option>
                {getBrands(item.asset_type).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            {/* Qtd + Condição + Patrimônio */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Qtd</label>
                <Input type="number" min={0} value={item.quantity} onChange={e => updateItem(i, 'quantity', Number(e.target.value))} className="h-8 text-sm" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Condição</label>
                <select
                  className="w-full h-8 rounded-md border border-input bg-white px-2 text-sm"
                  value={item.condition}
                  onChange={e => updateItem(i, 'condition', e.target.value)}
                >
                  <option>Bom</option>
                  <option>Danificado</option>
                  <option>Sucata</option>
                  <option>Pendente teste</option>
                </select>
              </div>
              {requiresPatrimonio && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Patrimônio <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={item.serial_number}
                    onChange={e => updateItem(i, 'serial_number', e.target.value)}
                    className={`h-8 text-sm ${!item.serial_number?.trim() ? 'border-red-300 focus-visible:ring-red-400' : patrimonioDivergent ? 'border-orange-400' : ''}`}
                    placeholder="Obrigatório"
                  />
                </div>
              )}
            </div>
            {/* Alertas de divergência */}
            {qtyDivergent && (
              <p className="text-xs text-orange-700 bg-orange-100 border border-orange-200 rounded px-2 py-1">
                ⚠️ Quantidade divergente — motorista declarou <strong>{declared.qty_collected}</strong> un.
              </p>
            )}
            {patrimonioDivergent && (
              <p className="text-xs text-orange-700 bg-orange-100 border border-orange-200 rounded px-2 py-1">
                ⚠️ Patrimônio divergente — OS indica <strong>{declaredPatrimonio}</strong>
              </p>
            )}
          </div>
        );
      })}

      <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="w-4 h-4 mr-1" /> Adicionar ativo
      </Button>

      <div>
        <label className="text-xs text-muted-foreground mb-1 block">Observações (opcional)</label>
        <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ex: dois refrigeradores com porta amassada" className="h-9" />
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>Cancelar</Button>
        <Button className="flex-1 bg-teal-600 hover:bg-teal-700 text-white" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando...' : 'Confirmar Conferência'}
        </Button>
      </div>
    </div>
  );
}
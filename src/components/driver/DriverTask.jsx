import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, ActionBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { MapPin, CheckCircle2, AlertTriangle, Camera, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import AssetsList from '@/components/AssetsList';
import CollectedAssetsList from '@/components/driver/CollectedAssetsList';

const OCCURRENCE_REASONS = ['PDV Fechado', 'Vasilhame Cheio', 'Ativo não Encontrado', 'Recolha Cancelada', 'Responsável Ausente', 'Não deu tempo'];

export default function DriverTask({ order, onUpdated }) {
  const { getSession } = useAccess();
  const session = getSession('driver');
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(order.driver_notes || '');
  const [occurrenceReason, setOccurrenceReason] = useState(order.occurrence_reason || '');
  const [occurrenceDetails, setOccurrenceDetails] = useState(order.occurrence_details || '');
  const [uploading, setUploading] = useState(false);
  const [collectedAssets, setCollectedAssets] = useState({});

  const logAction = async (action, details) => {
    await base44.entities.ActivityLog.create({
      action, panel: 'driver',
      operator_name: session?.operatorName || '',
      access_code: session?.code || '',
      os_number: order.os_number, details,
    });
  };

  const updateStatus = async (newStatus, extra = {}) => {
    setLoading(true);
    const data = { status: newStatus, driver_notes: notes, ...extra };
    if (newStatus === 'No Cliente') data.driver_checkin_time = new Date().toISOString();
    if (newStatus === 'Concluído' || newStatus === 'Concluído com Ocorrência') data.driver_checkout_time = new Date().toISOString();
    data.driver_status = newStatus === 'Em Rota' ? 'A Caminho' : newStatus === 'No Cliente' ? 'No Local' : newStatus === 'Concluído' ? 'Concluído' : newStatus === 'Concluído com Ocorrência' ? 'Não Realizado' : order.driver_status;
    await base44.entities.ServiceOrder.update(order.id, data);
    await logAction(`Status → ${newStatus}`, notes);
    toast.success(`Atualizado para: ${newStatus}`);
    setLoading(false);
    onUpdated?.();
  };

  const handleOccurrence = async () => {
    if (!occurrenceReason) { toast.error('Selecione o motivo'); return; }
    if (occurrenceReason === 'Não deu tempo') {
      // Volta para Aguardando para nova atribuição pelo supervisor de logística
      setLoading(true);
      await base44.entities.ServiceOrder.update(order.id, {
        status: 'Aguardando',
        assigned_driver: '',
        assigned_vehicle: '',
        assigned_date: '',
        route_date: '',
        driver_notes: notes,
        occurrence_reason: occurrenceReason,
        occurrence_details: occurrenceDetails || 'OS não realizada por falta de tempo. Necessária nova tentativa.',
        driver_checkout_time: new Date().toISOString(),
        driver_status: 'Não Realizado',
      });
      await logAction('Ocorrência: Não deu tempo', 'OS devolvida para fila de atribuição');
      toast.success('OS registrada como "Não deu tempo" e devolvida para a logística');
      setLoading(false);
      onUpdated?.();
      return;
    }
    await updateStatus('Concluído com Ocorrência', { occurrence_reason: occurrenceReason, occurrence_details: occurrenceDetails });
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const currentPhotos = order.photo_urls || [];
    await base44.entities.ServiceOrder.update(order.id, { photo_urls: [...currentPhotos, file_url] });
    await logAction('Upload foto', file_url);
    toast.success('Foto enviada!');
    setUploading(false);
    onUpdated?.();
  };

  const handleConcluir = async () => {
    const hasAnyChecked = Object.values(collectedAssets).some(a => a.checked);
    if (!hasAnyChecked) {
      toast.error('Marque ao menos um material recolhido');
      return;
    }

    const orderAssets = order.assets?.length > 0 ? order.assets : [{ asset_type: order.asset_type, asset_brand: order.asset_brand, quantity: order.quantity || 1, asset_patrimonio: order.asset_patrimonio || order.asset_serial }];
    
    const collectedAssetsData = Object.entries(collectedAssets)
      .filter(([, v]) => v.checked)
      .map(([key, v]) => {
        const parts = key.split('-');
        const idx = parseInt(parts[parts.length - 1]);
        const assetType = parts.slice(0, -1).join('-');
        const sourceAsset = orderAssets[idx] || {};
        const expectedPatrimonio = sourceAsset.asset_patrimonio || sourceAsset.asset_serial || '';
        return {
          asset_type: assetType,
          asset_brand: sourceAsset.asset_brand || '',
          qty_collected: v.qty || 0,
          plaqueta: v.plaqueta || '',
          patrimonio: v.plaqueta || '',
          expected_patrimonio: expectedPatrimonio,
          patrimonio_divergence: !!(v.plaqueta && expectedPatrimonio && v.plaqueta !== expectedPatrimonio),
          damage_description: v.damageDescription || '',
          damage_qty: v.damageQty || 0,
        };
      });

    const collectedSummary = collectedAssetsData.map(a => {
      let s = `${a.asset_type}: ${a.qty_collected} un.`;
      if (a.plaqueta) s += ` [Patrimônio: ${a.plaqueta}]`;
      if (a.damage_description) s += ` | DANO/FALTA: ${a.damage_description}${a.damage_qty ? ` (${a.damage_qty} un.)` : ''}`;
      return s;
    }).join('; ');

    await updateStatus('Concluído', {
      driver_collected_assets: collectedAssetsData,
      driver_notes: `${notes ? notes + ' | ' : ''}Recolhido: ${collectedSummary}`,
    });
  };

  const isActive = ['Atribuído', 'No Cliente', 'Em Rota'].includes(order.status);

  return (
    <Card className={`relative overflow-hidden transition-all ${isActive ? 'border-primary/30 shadow-sm' : 'opacity-70'}`}>
      {order.priority === 'Urgente' && (
        <span className="absolute right-3 top-3 z-10 rounded-md bg-red-600 px-2.5 py-1 text-[11px] font-black tracking-wide text-white shadow-sm">
          URGENTE
        </span>
      )}
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={order.status} />
            </div>
            <h4 className="font-semibold">{order.client_name}</h4>
            {order.client_address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{order.client_address}</p>}
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex gap-1 ${order.priority === 'Urgente' ? 'pr-20' : ''}`}>
              <ActionBadge action={order.action_type} />
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        <AssetsList order={order} />
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          {isActive && <Textarea placeholder="Observações..." value={notes} onChange={e => setNotes(e.target.value)} className="text-sm" rows={2} />}

          {isActive && (
            <div className="space-y-3">
              {/* Checklist de materiais recolhidos */}
              <CollectedAssetsList
                  assets={order.assets?.length > 0 ? order.assets : (order.asset_type ? [{ asset_type: order.asset_type, asset_brand: order.asset_brand, quantity: order.quantity || 1 }] : [])}
                  collectedAssets={collectedAssets}
                  onChange={setCollectedAssets}
                />

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" onClick={handleConcluir} disabled={loading} className="gap-1.5 bg-green-600 hover:bg-green-700 flex-1">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Concluir Coleta
                </Button>
                <label className="inline-flex">
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
                  <Button size="sm" variant="outline" className="gap-1.5 cursor-pointer" disabled={uploading} asChild>
                    <span>{uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />} Foto</span>
                  </Button>
                </label>
              </div>
            </div>
          )}

          {isActive && (
            <div className="bg-destructive/5 rounded-xl p-3 space-y-2 border border-destructive/10">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Registrar Ocorrência</p>
              <Select value={occurrenceReason} onValueChange={setOccurrenceReason}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Motivo..." /></SelectTrigger>
                <SelectContent>
                  {OCCURRENCE_REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Textarea placeholder="Detalhes..." value={occurrenceDetails} onChange={e => setOccurrenceDetails(e.target.value)} className="text-xs" rows={2} />
              <Button size="sm" variant="destructive" onClick={handleOccurrence} disabled={loading} className="gap-1.5 w-full">
                <AlertTriangle className="w-3 h-3" /> Registrar Ocorrência
              </Button>
            </div>
          )}

          {order.photo_urls?.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-1">
              {order.photo_urls.map((url, i) => (
                <img key={i} src={url} alt={`Foto ${i + 1}`} className="w-16 h-16 rounded-lg object-cover border shrink-0" />
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

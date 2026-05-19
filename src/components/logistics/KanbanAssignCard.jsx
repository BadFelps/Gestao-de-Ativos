import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PriorityBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { UserPlus, MapPin, Loader2, MessageSquare, ChevronDown, ChevronUp, Package, Calendar } from 'lucide-react';
import AssetsList from '@/components/AssetsList';

const PRIORITY_BORDER = {
  'Urgente': 'border-t-red-500',
  'Alta': 'border-t-orange-400',
  'Média': 'border-t-blue-400',
  'Baixa': 'border-t-slate-300',
};

export default function KanbanAssignCard({ order, onUpdated }) {
  const { getSession } = useAccess();
  const session = getSession('logistics');
  const [showForm, setShowForm] = useState(false);
  const [driver, setDriver] = useState(order.assigned_driver || '');
  const [vehicle, setVehicle] = useState(order.assigned_vehicle || '');
  const [routeDate, setRouteDate] = useState(order.route_date || order.retry_suggested_date || '');
  const [loading, setLoading] = useState(false);

  const revenda = session?.revenda || null;

  const { data: driverCodes = [] } = useQuery({
    queryKey: ['driver-access-codes', revenda],
    queryFn: () => revenda
      ? base44.entities.AccessCode.filter({ role: 'driver', revenda })
      : base44.entities.AccessCode.filter({ role: 'driver' }),
    staleTime: 60000,
  });

  const handleAssign = async (e) => {
    e.stopPropagation();
    if (!driver || !routeDate) {
      toast.error('Informe motorista e data da rota');
      return;
    }
    // Block date before retry_confirmed_date
    if (order.retry_confirmed_date && routeDate < order.retry_confirmed_date) {
      toast.error(`Data não pode ser anterior a ${order.retry_confirmed_date} (data confirmada para retentativa)`);
      return;
    }
    setLoading(true);
    const updateData = {
      assigned_driver: driver,
      assigned_vehicle: vehicle,
      route_date: routeDate,
      assigned_date: new Date().toISOString().split('T')[0],
      status: 'Atribuído',
    };
    // Se era "Não deu tempo", limpa ocorrência para nova tentativa
    if (order.occurrence_reason === 'Não deu tempo') {
      updateData.occurrence_reason = '';
      updateData.occurrence_details = '';
    }
    await base44.entities.ServiceOrder.update(order.id, updateData);
    await base44.entities.ActivityLog.create({
      action: 'Atribuiu motorista',
      panel: 'logistics',
      operator_name: session?.operatorName || '',
      access_code: session?.code || '',
      os_number: order.os_number,
      details: `Motorista: ${driver}, Veículo: ${vehicle}, Rota: ${routeDate}`,
    });
    toast.success('Motorista atribuído!');
    setLoading(false);
    onUpdated?.();
  };

  const borderColor = PRIORITY_BORDER[order.priority] || PRIORITY_BORDER['Média'];
  const hasRetryDate = !!order.retry_confirmed_date;

  return (
    <div className={`bg-card rounded-xl border border-t-4 ${borderColor} shadow-sm hover:shadow-md transition-shadow`}>
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {order.retry_count > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded-full border border-orange-200">
                  #{order.retry_count} tent.
                </span>
              )}
            </div>
            <p className="font-semibold text-sm leading-tight mt-0.5 truncate">{order.client_name}</p>
          </div>
          <PriorityBadge priority={order.priority} />
        </div>

        {/* Address */}
        {order.client_address && (
          <p className="text-xs text-muted-foreground flex items-start gap-1 leading-tight">
            <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
            <span className="line-clamp-2">{order.client_address}</span>
          </p>
        )}

        {/* Assets compact */}
        <div className="text-xs text-muted-foreground space-y-1">
          {(order.assets?.length > 0 ? order.assets : (order.asset_type ? [{ asset_type: order.asset_type, asset_brand: order.asset_brand, asset_serial: order.asset_serial, quantity: order.quantity }] : []))
            .filter(a => a.asset_type)
            .map((a, i) => (
              <div key={i} className="bg-muted/60 rounded px-2 py-1 flex flex-wrap gap-x-2 items-center">
                <span className="font-semibold text-foreground">{a.asset_type}</span>
                {a.asset_brand && <span className="text-muted-foreground">{a.asset_brand}</span>}
                {a.asset_serial && <span className="font-mono text-blue-600">CEV: {a.asset_serial}</span>}
                {a.quantity > 1 && <span className="bg-primary/10 text-primary font-bold px-1 rounded">Qtd: {a.quantity}</span>}
              </div>
            ))}
        </div>

        {/* Data indicada para recolha */}
        {order.retry_suggested_date && !hasRetryDate && (
          <div className="flex items-center gap-1.5 text-xs bg-blue-50 border border-blue-200 rounded-lg px-2 py-1.5 text-blue-800 font-semibold">
            <Calendar className="w-3 h-3 text-blue-600" />
            Data indicada: <span className="underline">{order.retry_suggested_date}</span>
          </div>
        )}

        {/* Retry date highlight */}
        {hasRetryDate && (
          <div className="flex items-center gap-1.5 text-xs bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5 text-amber-800 font-semibold">
            <Calendar className="w-3 h-3 text-amber-600" />
            Data mínima de rota: <span className="underline">{order.retry_confirmed_date}</span>
          </div>
        )}

        {/* Commercial comment */}
        {order.commercial_comment && (
          <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg px-2 py-1.5 text-blue-800 flex items-start gap-1">
            <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-blue-500" />
            <span className="line-clamp-2"><strong>{order.commercial_comment_by}:</strong> {order.commercial_comment}</span>
          </div>
        )}

        {/* Assign button */}
        <Button
          size="sm"
          variant={showForm ? 'secondary' : 'default'}
          className="w-full h-7 text-xs gap-1"
          onClick={() => setShowForm(!showForm)}
        >
          <UserPlus className="w-3 h-3" />
          {showForm ? 'Cancelar' : 'Atribuir Motorista'}
          {showForm ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
        </Button>

        {/* Form */}
        {showForm && (
          <div className="space-y-1.5 pt-1 border-t">
            <Select value={driver} onValueChange={setDriver}>
              <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecionar motorista..." /></SelectTrigger>
              <SelectContent>
                {driverCodes.map(d => (
                  <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} className="h-7 text-xs w-full" />
            <Button size="sm" onClick={handleAssign} disabled={loading} className="w-full h-7 text-xs gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserPlus className="w-3 h-3" /> Confirmar Atribuição</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
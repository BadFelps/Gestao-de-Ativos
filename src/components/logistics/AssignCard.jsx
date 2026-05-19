import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAccess } from '@/lib/accessContext.jsx';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge, ActionBadge } from '@/components/StatusBadge';
import { toast } from 'sonner';
import { UserPlus, MapPin, Loader2, ChevronDown, ChevronUp, Phone, Package, MessageSquare } from 'lucide-react';
import AssetsList from '@/components/AssetsList';

export default function AssignCard({ order, onUpdated }) {
  const { getSession } = useAccess();
  const session = getSession('logistics');
  const [expanded, setExpanded] = useState(false);
  const [driver, setDriver] = useState(order.assigned_driver || '');
  const [vehicle, setVehicle] = useState(order.assigned_vehicle || '');
  const [routeDate, setRouteDate] = useState(order.route_date || order.retry_suggested_date || '');
  const [loading, setLoading] = useState(false);

  const { data: driverCodes = [] } = useQuery({
    queryKey: ['driver-access-codes'],
    queryFn: () => base44.entities.AccessCode.filter({ panel: 'driver', is_active: true }),
    staleTime: 60000,
  });

  const handleAssign = async () => {
    if (!driver || !routeDate) {
      toast.error('Informe motorista e data da rota');
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

  return (
    <Card className="overflow-hidden">
      <div className="p-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {order.retry_count > 0 && (
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full border border-orange-200">
                  Retentativa #{order.retry_count}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-sm mt-0.5">{order.client_name}</h4>
            {order.client_address && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{order.client_address}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 flex-wrap justify-end">
              <ActionBadge action={order.action_type} />
              <PriorityBadge priority={order.priority} />
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
          </div>
        </div>
        <div className="mt-1"><AssetsList order={order} /></div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t pt-3 space-y-3">
          {/* Extra details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            {order.client_phone && (
              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {order.client_phone}</span>
            )}
            {order.asset_description && (
              <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {order.asset_description}</span>
            )}
            {order.region && <span>📍 Região: {order.region}</span>}
            <span className="flex items-center gap-1"><StatusBadge status={order.status} /></span>
          </div>

          {order.commercial_comment && (
            <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2 text-blue-800 flex items-start gap-1.5">
              <MessageSquare className="w-3 h-3 shrink-0 mt-0.5 text-blue-500" />
              <span><strong>{order.commercial_comment_by}:</strong> {order.commercial_comment}</span>
            </div>
          )}

          {/* Assignment form */}
          <div className="flex gap-2 items-end flex-wrap">
            <div className="flex-1 min-w-[140px]">
              <Select value={driver} onValueChange={setDriver}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecionar motorista..." /></SelectTrigger>
                <SelectContent>
                  {driverCodes.map(d => (
                    <SelectItem key={d.id} value={d.owner_name}>{d.owner_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-36">
              <Input type="date" value={routeDate} onChange={e => setRouteDate(e.target.value)} className="h-8 text-xs" />
            </div>
            <Button size="sm" onClick={handleAssign} disabled={loading} className="h-8 gap-1">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><UserPlus className="w-3 h-3" /> Atribuir</>}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
import { Trash2, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DeletedOrders({ orders }) {
  const deleted = orders.filter(o => o.status === 'Excluído');

  if (deleted.length === 0) {
    return (
      <div className="bg-card rounded-2xl border p-12 text-center">
        <Trash2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-muted-foreground">Nenhuma OS excluída</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <Trash2 className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm text-muted-foreground">
          {deleted.length} OS{deleted.length > 1 ? 's' : ''} excluída{deleted.length > 1 ? 's' : ''}
        </h3>
      </div>
      {deleted.map(order => (
        <div key={order.id} className="bg-card border rounded-xl p-4 space-y-2 opacity-80">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="font-mono text-xs font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{order.os_number}</span>
              <p className="font-semibold text-sm mt-1">{order.client_name}</p>
              {order.client_code && <p className="text-xs text-muted-foreground">PDV: {order.client_code}</p>}
            </div>
            <div className="text-right text-xs text-muted-foreground">
              {order.deleted_at && (
                <p className="flex items-center gap-1 justify-end">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(order.deleted_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                </p>
              )}
              {order.deleted_by && (
                <p className="flex items-center gap-1 justify-end mt-0.5">
                  <User className="w-3 h-3" />
                  {order.deleted_by}
                </p>
              )}
            </div>
          </div>

          {order.deletion_reason && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700 flex items-start gap-1.5">
                <FileText className="w-3 h-3 shrink-0 mt-0.5" />
                <span><strong>Motivo:</strong> {order.deletion_reason}</span>
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {order.action_type && <span className="bg-muted rounded px-1.5 py-0.5">{order.action_type}</span>}
            {order.assigned_driver && <span>🚛 {order.assigned_driver}</span>}
            {order.route_date && <span>📅 {format(new Date(order.route_date), "dd/MM/yyyy", { locale: ptBR })}</span>}
            {order.created_by_name && <span>Criado por: {order.created_by_name}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
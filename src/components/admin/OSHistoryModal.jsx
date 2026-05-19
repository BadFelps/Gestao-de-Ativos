import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, Clock, Truck, User, Package, AlertTriangle, CheckCircle2, MapPin, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

function fmt(dateStr) {
  if (!dateStr) return null;
  try { return format(new Date(dateStr), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); }
  catch { return dateStr; }
}

function fmtDate(dateStr) {
  if (!dateStr) return null;
  try { return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR }); }
  catch { return dateStr; }
}

function TimelineItem({ icon: Icon, iconBg, title, subtitle, date, children }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="w-0.5 bg-border flex-1 mt-1" />
      </div>
      <div className="pb-5 flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        {date && <p className="text-xs text-muted-foreground mt-0.5">🕒 {date}</p>}
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}

export default function OSHistoryModal({ order, onClose }) {
  const retryCount = order.retry_count || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-2xl border shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <h2 className="font-bold text-base">Histórico da OS</h2>
            <p className="text-xs text-muted-foreground">{order.os_number} · {order.client_name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-0">

          {/* 1. Criação */}
          <TimelineItem
            icon={Clock}
            iconBg="bg-blue-500"
            title="OS Criada"
            subtitle={order.created_by_name ? `Por: ${order.created_by_name}` : null}
            date={fmt(order.created_date)}
          >
            <div className="bg-muted/40 rounded-lg px-3 py-2 text-xs space-y-0.5">
              {order.client_address && <p className="text-muted-foreground flex items-start gap-1"><MapPin className="w-3 h-3 shrink-0 mt-0.5" />{order.client_address}</p>}
              {(order.assets?.length > 0 || order.asset_type) && (
                <div>
                  <p className="font-semibold text-foreground mb-0.5">Ativos para recolha:</p>
                  {order.assets?.length > 0
                    ? order.assets.map((a, i) => <p key={i}>{a.asset_type}: {a.quantity} un.{a.asset_patrimonio ? ` · PAT: ${a.asset_patrimonio}` : ''}</p>)
                    : <p>{order.asset_type}: {order.quantity || 1} un.</p>
                  }
                </div>
              )}
            </div>
          </TimelineItem>

          {/* 2. Atribuição ao motorista */}
          {order.assigned_driver && (
            <TimelineItem
              icon={Truck}
              iconBg="bg-indigo-500"
              title="Atribuída ao Motorista"
              subtitle={`Motorista: ${order.assigned_driver}${order.assigned_vehicle ? ` · ${order.assigned_vehicle}` : ''}`}
              date={order.route_date ? `Rota: ${fmtDate(order.route_date)}` : (order.assigned_date ? fmtDate(order.assigned_date) : null)}
            />
          )}

          {/* 3. Histórico de retentativas — cada uma separada */}
          {order.retry_history?.length > 0 && order.retry_history.map((attempt, idx) => (
            <TimelineItem
              key={idx}
              icon={RotateCcw}
              iconBg="bg-orange-500"
              title={`Retentativa #${idx + 1} autorizada`}
              subtitle={attempt.authorized_by ? `Autorizado por: ${attempt.authorized_by}` : null}
              date={attempt.authorized_date ? fmt(attempt.authorized_date) : null}
            >
              <div className="space-y-1">
                {attempt.occurrence_reason && (
                  <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1.5">
                    ⚠️ Ocorrência anterior: <strong>{attempt.occurrence_reason}</strong>
                    {attempt.occurrence_details && `: ${attempt.occurrence_details}`}
                  </p>
                )}
                {attempt.driver && (
                  <p className="text-xs text-muted-foreground">🚛 Motorista anterior: {attempt.driver}</p>
                )}
                {attempt.route_date && (
                  <p className="text-xs text-muted-foreground">📅 Data da rota anterior: {fmtDate(attempt.route_date)}</p>
                )}
                {attempt.commercial_comment && (
                  <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5">
                    💬 Tratativa comercial: {attempt.commercial_comment}
                    {attempt.commercial_comment_by && <span className="text-muted-foreground"> — {attempt.commercial_comment_by}</span>}
                  </p>
                )}
              </div>
            </TimelineItem>
          ))}
          {/* Fallback para OSs antigas sem retry_history */}
          {retryCount > 0 && !order.retry_history?.length && (
            <TimelineItem
              icon={RotateCcw}
              iconBg="bg-orange-500"
              title={`${retryCount} retentativa${retryCount > 1 ? 's' : ''} autorizada${retryCount > 1 ? 's' : ''}`}
              subtitle={order.retry_authorized_by ? `Último autorizado por: ${order.retry_authorized_by}` : null}
            >
              {order.retry_suggested_date && (
                <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5">
                  📅 Data sugerida: {fmtDate(order.retry_suggested_date)}
                  {order.retry_confirmed_date ? ` · Confirmada: ${fmtDate(order.retry_confirmed_date)}` : ''}
                </p>
              )}
            </TimelineItem>
          )}

          {/* 4. Check-in do motorista */}
          {order.driver_checkin_time && (
            <TimelineItem
              icon={MapPin}
              iconBg="bg-purple-500"
              title="Motorista Chegou ao Cliente"
              date={fmt(order.driver_checkin_time)}
            />
          )}

          {/* 5. Ocorrência (se houver) */}
          {order.occurrence_reason && (
            <TimelineItem
              icon={AlertTriangle}
              iconBg="bg-red-500"
              title="Ocorrência Registrada"
              date={order.driver_checkout_time ? fmt(order.driver_checkout_time) : null}
            >
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-800">
                <p className="font-semibold">{order.occurrence_reason}</p>
                {order.occurrence_details && <p className="mt-0.5">{order.occurrence_details}</p>}
              </div>
            </TimelineItem>
          )}

          {/* 6. O que o motorista coletou */}
          {order.driver_collected_assets?.length > 0 && (
            <TimelineItem
              icon={Package}
              iconBg="bg-green-500"
              title="Motorista Concluiu a Coleta"
              date={order.driver_checkout_time ? fmt(order.driver_checkout_time) : null}
            >
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 space-y-0.5">
                <p className="font-semibold">Declarado pelo motorista:</p>
                {order.driver_collected_assets.map((a, i) => (
                  <p key={i}>{a.asset_type}: {a.qty_collected} un.{a.plaqueta ? ` · Plaqueta: ${a.plaqueta}` : ''}{a.patrimonio ? ` · PAT: ${a.patrimonio}` : ''}</p>
                ))}
              </div>
              {order.driver_notes && (
                <p className="mt-1.5 bg-muted/40 rounded-lg px-3 py-2 text-xs text-muted-foreground">📝 {order.driver_notes}</p>
              )}
            </TimelineItem>
          )}

          {/* 7. Conferência do armazém */}
          {order.warehouse_checklist?.length > 0 && (
            <TimelineItem
              icon={CheckCircle2}
              iconBg="bg-teal-500"
              title="Conferido pelo Armazém"
              subtitle={order.warehouse_checked_by ? `Conferente: ${order.warehouse_checked_by}` : null}
              date={order.warehouse_check_date ? fmt(order.warehouse_check_date) : null}
            >
              <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-800 space-y-0.5">
                {order.warehouse_checklist.map((c, i) => (
                  <p key={i}>{c.asset_type}: {c.quantity} un.{c.model ? ` (${c.model})` : ''}{c.condition ? ` · ${c.condition}` : ''}{c.serial_number ? ` · PAT: ${c.serial_number}` : ''}</p>
                ))}
              </div>
              {order.warehouse_divergence && (
                <p className="mt-1.5 bg-orange-50 border border-orange-200 rounded-lg px-2.5 py-1.5 text-xs text-orange-700">
                  ⚠️ Divergência: {order.warehouse_divergence_details}
                </p>
              )}
              {order.warehouse_notes && (
                <p className="mt-1.5 bg-muted/40 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground">📝 {order.warehouse_notes}</p>
              )}
            </TimelineItem>
          )}

          {/* 8. Comentário comercial */}
          {order.commercial_comment && (
            <TimelineItem
              icon={MessageSquare}
              iconBg="bg-blue-400"
              title="Comentário Comercial"
              subtitle={order.commercial_comment_by ? `Por: ${order.commercial_comment_by}` : null}
              date={order.commercial_comment_date ? fmt(order.commercial_comment_date) : null}
            >
              <p className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-800">{order.commercial_comment}</p>
            </TimelineItem>
          )}

          {/* 9. Fechamento */}
          {order.status === 'Fechado' && (
            <TimelineItem
              icon={CheckCircle2}
              iconBg="bg-gray-500"
              title="OS Fechada"
              date={order.updated_date ? fmt(order.updated_date) : null}
            />
          )}

          {/* Spacer no final */}
          <div className="h-2" />
        </div>

        {/* Status atual */}
        <div className="px-5 py-3 border-t bg-muted/30 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status atual</span>
            <span className="text-xs font-bold text-foreground">{order.status}</span>
          </div>
          {order.setor && <p className="text-xs text-muted-foreground mt-0.5">Setor: {order.setor}</p>}
        </div>
      </div>
    </div>
  );
}
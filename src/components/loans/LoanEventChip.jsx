import { ArrowDownToLine, ArrowUpFromLine, Clock, CheckCircle2, XCircle, Truck, RotateCcw, Ban } from 'lucide-react';

// Cores conforme solicitado
const STATUS_STYLE = {
  pendente_aprovacao_comercial: { bg: '#FFE8D0', text: '#7A2200', border: '#FF4500', label: 'Ag. Comercial' },
  aprovado_comercial:           { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD', label: 'Ap. Comercial' },
  negado_comercial:             { bg: '#FFE4E4', text: '#7F0000', border: '#FF0000', label: 'Negado' },
  pendente_aprovacao_analista:  { bg: '#F3E8FF', text: '#5B0F91', border: '#A020F0', label: 'Ag. Analista' },
  aprovado_analista:            { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7', label: 'Aprovado' },
  negado_analista:              { bg: '#FFE4E4', text: '#7F0000', border: '#FF0000', label: 'Negado' },
  pendente:                     { bg: '#E6FFF8', text: '#1A5C47', border: '#7FFFD4', label: 'Ag. Entrega' },
  entregue:                     { bg: '#CCFFE0', text: '#005A1A', border: '#00FF00', label: 'Entregue' },
  recolhido:                    { bg: '#E0F2FE', text: '#0C4A6E', border: '#38BDF8', label: 'Recolhido' },
  cancelado:                    { bg: '#F3F4F6', text: '#6B7280', border: '#9CA3AF', label: 'Cancelado' },
};

const STATUS_ICON = {
  pendente_aprovacao_comercial: Clock,
  aprovado_comercial:           CheckCircle2,
  negado_comercial:             XCircle,
  pendente_aprovacao_analista:  Clock,
  aprovado_analista:            CheckCircle2,
  negado_analista:              XCircle,
  pendente:                     Truck,
  entregue:                     CheckCircle2,
  recolhido:                    RotateCcw,
  cancelado:                    Ban,
};

// Tipo label compacto
const TYPE_LABEL = { Fixo: 'Fixo', Evento: 'Evento', Recolha: 'Recolha' };

// Cor especial para cards de recolha (return_date coincidindo com dateStr)
const RETURN_DATE_STYLE = { bg: '#FFF5CC', text: '#7A5800', border: '#FFD700' };
const CANCELLED_STYLE = STATUS_STYLE.cancelado;

export default function LoanEventChip({ request, dateStr, onClick }) {
  const isReturn = request.return_date === dateStr && request.loan_date !== dateStr;
  const isCancelled = request.status === 'cancelado';
  const baseStyle = STATUS_STYLE[request.status] || STATUS_STYLE.pendente;
  // Cancelado sobrepõe tudo; retorno sobrepõe apenas se não cancelado
  const style = isCancelled ? CANCELLED_STYLE : isReturn ? RETURN_DATE_STYLE : baseStyle;
  const StatusIcon = STATUS_ICON[request.status] || Clock;
  const isRecolha = request.request_type === 'Recolha';
  const TypeIcon = isRecolha ? ArrowUpFromLine : ArrowDownToLine;

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-lg px-2 py-1.5 text-xs border transition-all hover:brightness-95 active:scale-95 shadow-sm"
      style={{ backgroundColor: style.bg, borderColor: style.border, color: style.text }}
    >
      {/* Linha 1: ícone tipo + tipo label + PDV */}
      <div className="flex items-center gap-1 min-w-0">
        <TypeIcon className="w-3 h-3 shrink-0" strokeWidth={2.5} />
        <span className="font-bold text-[10px] shrink-0 opacity-70">{TYPE_LABEL[request.request_type] || ''}</span>
        <span className="font-bold truncate text-[11px]">{request.pdv_code}</span>
        {isReturn && <span className="text-[9px] font-bold ml-auto shrink-0 opacity-70">↩retorno</span>}
      </div>

      {/* Linha 2: materiais e cidade */}
      <div className="truncate text-[10px] mt-0.5 opacity-80 leading-tight">
        {(() => {
          let mat = `${request.asset_type || ''}${request.quantity > 1 ? ` ×${request.quantity}` : ''}`;
          if (request.extra_items) {
            try {
              const extras = JSON.parse(request.extra_items);
              mat = extras.map(it => `${it.asset_type}${it.quantity > 1 ? ` ×${it.quantity}` : ''}`).join(', ');
            } catch {}
          }
          return mat;
        })()}
        {request.cidade ? ` · ${request.cidade}` : ''}
      </div>

      {/* Linha 3: status com ícone */}
      <div className="flex items-center gap-1 mt-1">
        <StatusIcon className="w-2.5 h-2.5 shrink-0" strokeWidth={2.5} />
        <span className="text-[10px] font-semibold truncate">{style.label}</span>
      </div>
    </button>
  );
}
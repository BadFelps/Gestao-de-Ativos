import { useState, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LoanEventChip from './LoanEventChip';
import LoanFormModal from './LoanFormModal';
import LoanDetailModal from './LoanDetailModal';

const DAY_NAMES_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

function canCreateRequest(session) {
  return session.role === 'comercial' || session.role === 'vendedor';
}

// Mobile: show 3 days centred on "focus" day
// Desktop: show full 7-day week
export default function LoanCalendar({ session }) {
  const queryClient = useQueryClient();
  const [dayOffset, setDayOffset] = useState(0); // for mobile 3-day view
  const [weekOffset, setWeekOffset] = useState(0); // for desktop 7-day view
  const [showForm, setShowForm] = useState(false);
  const [formDate, setFormDate] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Touch swipe
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diffX = touchStartX.current - e.changedTouches[0].clientX;
    const diffY = touchStartY.current - e.changedTouches[0].clientY;
    // Só navega se o gesto for mais horizontal do que vertical
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 40) {
      if (diffX > 0) {
        setDayOffset(o => o + 3);
        setWeekOffset(o => o + 1);
      } else {
        setDayOffset(o => o - 3);
        setWeekOffset(o => o - 1);
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const today = new Date();

  // Desktop week dates
  const weekBase = new Date(today);
  weekBase.setDate(today.getDate() + weekOffset * 7);
  const weekDay = weekBase.getDay();
  const weekSunday = new Date(weekBase);
  weekSunday.setDate(weekBase.getDate() - weekDay);
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekSunday);
    d.setDate(weekSunday.getDate() + i);
    return d;
  });

  // Mobile: 3 days centred on today + dayOffset
  const mobileCentre = new Date(today);
  mobileCentre.setDate(today.getDate() + dayOffset);
  const mobileDates = [-1, 0, 1].map(offset => {
    const d = new Date(mobileCentre);
    d.setDate(mobileCentre.getDate() + offset);
    return d;
  });

  const weekStart = isoDate(weekDates[0]);
  const weekEnd = isoDate(weekDates[6]);

  const { data: requests = [], isFetching, refetch } = useQuery({
    queryKey: ['loan-requests', session.revenda, weekStart],
    queryFn: () => base44.entities.LoanRequest.filter({ revenda: session.revenda }),
    staleTime: 30000,
  });

  // Filter requests visible in current week
  const weekRequests = requests.filter((r) => {
    const ld = r.loan_date;
    const rd = r.return_date;
    return (ld >= weekStart && ld <= weekEnd) || (rd && rd >= weekStart && rd <= weekEnd);
  });

  const getEventsForDay = useCallback((dateStr) => {
    return weekRequests.filter((r) => r.loan_date === dateStr || r.return_date === dateStr);
  }, [weekRequests]);

  const handleDayClick = (date) => {
    if (!canCreateRequest(session)) return;
    setFormDate(isoDate(date));
    setShowForm(true);
  };

  const handleEventClick = (e, req) => {
    e.stopPropagation();
    setSelectedRequest(req);
  };

  const monthLabel = (() => {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    const first = weekDates[0];
    const last = weekDates[6];
    if (first.getMonth() === last.getMonth()) return `${months[first.getMonth()]} ${first.getFullYear()}`;
    return `${months[first.getMonth()]}/${months[last.getMonth()]} ${first.getFullYear()}`;
  })();

  const mobileDateLabel = (() => {
    const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    return `${months[mobileCentre.getMonth()]} ${mobileCentre.getFullYear()}`;
  })();

  const DayColumn = ({ date, compact = false }) => {
    const dateStr = isoDate(date);
    const events = getEventsForDay(dateStr);
    const isToday = dateStr === isoDate(today);
    const isPast = date < today && !isToday;
    const clickable = canCreateRequest(session) && !isPast;

    return (
      <div
        onClick={() => clickable && handleDayClick(date)}
        onTouchStart={e => e.stopPropagation()}
        onTouchEnd={e => e.stopPropagation()}
        className={`border-r last:border-r-0 border-gray-100 p-1.5 transition-colors
          ${isToday ? 'bg-orange-50/50' : 'bg-white'}
          ${clickable ? 'cursor-pointer active:bg-gray-50' : ''}
          ${isPast ? 'opacity-60' : ''}
          ${compact ? 'min-h-[200px]' : 'min-h-[140px]'}
        `}
      >
        <div className="space-y-1">
          {events.map((req) => (
            <LoanEventChip
              key={req.id}
              request={req}
              dateStr={dateStr}
              onClick={(e) => handleEventClick(e, req)}
            />
          ))}
          {canCreateRequest(session) && !isPast && events.length === 0 && (
            <div className="h-6 rounded border-dashed border border-gray-200 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <Plus className="w-3 h-3 text-gray-400" />
            </div>
          )}
        </div>
      </div>
    );
  };

  const DayHeader = ({ date }) => {
    const isToday = isoDate(date) === isoDate(today);
    const dayIdx = date.getDay();
    return (
      <div className={`p-2 text-center border-r last:border-r-0 border-gray-100 ${isToday ? 'bg-orange-50' : ''}`}>
        <p className="text-xs font-medium text-gray-500">{DAY_NAMES_SHORT[dayIdx]}</p>
        <p className={`text-lg font-bold mt-0.5 ${isToday ? 'text-orange-500' : 'text-gray-800'}`}>{date.getDate()}</p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Desktop nav */}
          <button onClick={() => setWeekOffset(w => w - 1)} className="hidden sm:flex p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          {/* Mobile nav */}
          <button onClick={() => { setDayOffset(o => o - 3); setWeekOffset(o => o - 1); }} className="flex sm:hidden p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50">
            <ChevronLeft className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => { setWeekOffset(0); setDayOffset(0); }} className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Hoje
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="hidden sm:flex p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <button onClick={() => { setDayOffset(o => o + 3); setWeekOffset(o => o + 1); }} className="flex sm:hidden p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50">
            <ChevronRight className="w-4 h-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-700 ml-1">
            <span className="hidden sm:inline">{monthLabel}</span>
            <span className="inline sm:hidden">{mobileDateLabel}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()} className={`p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50 ${isFetching ? 'opacity-50' : ''}`}>
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isFetching ? 'animate-spin' : ''}`} />
          </button>
          {canCreateRequest(session) && (
            <Button size="sm" onClick={() => { setFormDate(isoDate(today)); setShowForm(true); }}
              className="gap-2 bg-orange-500 hover:bg-orange-600 text-white shadow-sm">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nova Solicitação</span>
              <span className="inline sm:hidden">Nova</span>
            </Button>
          )}
        </div>
      </div>

      {/* DESKTOP: 7-day grid */}
      <div className="hidden sm:block bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDates.map((date, i) => <DayHeader key={i} date={date} />)}
        </div>
        <div className="grid grid-cols-7 min-h-[400px]">
          {weekDates.map((date, i) => <DayColumn key={i} date={date} />)}
        </div>
      </div>

      {/* MOBILE: 3-day swipeable view */}
      <div
        className="sm:hidden bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="grid grid-cols-3 border-b border-gray-200">
          {mobileDates.map((date, i) => <DayHeader key={i} date={date} />)}
        </div>
        <div className="grid grid-cols-3 min-h-[280px]">
          {mobileDates.map((date, i) => <DayColumn key={i} date={date} compact />)}
        </div>
      </div>
      <p className="sm:hidden text-center text-xs text-gray-400">← Deslize para navegar →</p>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {[
          { color: '#FF4500', label: 'Ag. Comercial' },
          { color: '#A020F0', label: 'Ag. Analista' },
          { color: '#93C5FD', label: 'Ap. Comercial' },
          { color: '#6EE7B7', label: 'Ap. Analista' },
          { color: '#7FFFD4', label: 'Ag. Entrega' },
          { color: '#00FF00', label: 'Entregue' },
          { color: '#38BDF8', label: 'Recolhido' },
          { color: '#FF0000', label: 'Negado' },
          { color: '#FFD700', label: 'Data de Recolha' },
          { color: '#9CA3AF', label: 'Cancelado' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-black/10" style={{ backgroundColor: color }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>

      {showForm && (
        <LoanFormModal
          session={session}
          initialDate={formDate}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['loan-requests'] }); }}
        />
      )}
      {selectedRequest && (
        <LoanDetailModal
          request={selectedRequest}
          session={session}
          onClose={() => setSelectedRequest(null)}
          onUpdated={() => { setSelectedRequest(null); queryClient.invalidateQueries({ queryKey: ['loan-requests'] }); }}
        />
      )}
    </div>
  );
}
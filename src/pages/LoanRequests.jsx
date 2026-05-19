import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, ClipboardList, LogOut, RefreshCw } from 'lucide-react';
import LoanCalendar from '@/components/loans/LoanCalendar';
import LoanRequestsList from '@/components/loans/LoanRequestsList';

const LOAN_SESSION_KEY = 'loan_session';

export function getLoanSession() {
  try {
    const s = localStorage.getItem(LOAN_SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

export function setLoanSession(data) {
  localStorage.setItem(LOAN_SESSION_KEY, JSON.stringify(data));
}

export function clearLoanSession() {
  localStorage.removeItem(LOAN_SESSION_KEY);
}

export default function LoanRequests() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('calendar');

  useEffect(() => {
    const s = getLoanSession();
    if (!s) {
      navigate('/loans/login', { replace: true });
    } else {
      setSession(s);
    }
  }, [navigate]);

  const handleLogout = () => {
    clearLoanSession();
    navigate('/loans/login', { replace: true });
  };

  if (!session) return null;

  const roleLabel = {
    comercial: 'Comercial',
    analista: 'Analista',
    vendedor: 'Vendedor',
    armazem: 'Armazém',
    logistica: 'Logística',
  }[session.role] || session.role;

  const revendaShort = session.revenda === 'MS Paulo Afonso' ? 'MS PA' : 'MS Delmiro';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-tight">Solicitações de Ativos</h1>
              <p className="text-xs text-gray-500">{revendaShort} · {roleLabel}{session.setor ? ` · Setor ${session.setor}` : ''}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-50">
            <LogOut className="w-3.5 h-3.5" />
            Sair
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-0 border-t border-gray-100">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'calendar' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <CalendarDays className="w-4 h-4" />
            Calendário
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === 'list' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ClipboardList className="w-4 h-4" />
            Lista
          </button>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-2 sm:px-4 py-4">
        {activeTab === 'calendar' ? (
          <LoanCalendar session={session} />
        ) : (
          <LoanRequestsList session={session} />
        )}
      </div>
    </div>
  );
}
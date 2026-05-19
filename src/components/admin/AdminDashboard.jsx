import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, CartesianGrid, Legend, AreaChart, Area
} from 'recharts';
import {
  CheckCircle2, AlertTriangle, Clock, Truck, TrendingUp, Package,
  Users, Activity, XCircle, RotateCcw, ChevronUp, ChevronDown, Award, Target
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  'Aguardando': '#eab308',
  'Atribuído': '#3b82f6',
  'No Cliente': '#a855f7',
  'Concluído': '#22c55e',
  'Concluído com Ocorrência': '#f97316',
  'Conferido': '#14b8a6',
  'Fechado': '#6b7280',
};

const PIE_COLORS = ['#22c55e', '#f97316', '#3b82f6', '#eab308', '#8b5cf6'];

function StatCard({ icon: Icon, label, value, sub, color, trend }) {
  return (
    <div className="bg-card border rounded-2xl p-4 flex items-start gap-3 hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xl font-extrabold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground leading-snug">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5 opacity-70">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`text-xs font-bold flex items-center gap-0.5 ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function ProgressBar({ value, color = 'bg-green-500', label, sublabel }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{sublabel}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2">
        <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard({ orders }) {
  const [driverSort, setDriverSort] = useState('total');

  const stats = useMemo(() => {
    const active = orders.filter(o => o.status !== 'Excluído');
    const total = active.length;
    const concluded = active.filter(o => ['Concluído', 'Concluído com Ocorrência', 'Conferido', 'Fechado'].includes(o.status)).length;
    const withOccurrence = active.filter(o => o.status === 'Concluído com Ocorrência').length;
    const pending = active.filter(o => ['Aguardando', 'Atribuído'].includes(o.status)).length;
    const successRate = concluded > 0 ? Math.round(((concluded - withOccurrence) / concluded) * 100) : 0;
    const partials = active.filter(o => o.has_pending_assets).length;
    const assigned = active.filter(o => o.assigned_driver).length;
    const retries = active.filter(o => o.retry_count > 0).length;
    const inRoute = 0;
    const waiting = active.filter(o => o.status === 'Aguardando').length;
    const drivers = new Set(active.filter(o => o.assigned_driver).map(o => o.assigned_driver)).size;
    return { total, concluded, withOccurrence, pending, successRate, partials, assigned, retries, inRoute, waiting, drivers };
  }, [orders]);

  // Volume by status
  const statusData = useMemo(() => {
    const counts = {};
    orders.filter(o => o.status !== 'Excluído').forEach(o => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts)
      .map(([status, count]) => ({ status: status.replace('Concluído com Ocorrência', 'C/ Ocorrência'), full: status, count, color: STATUS_COLORS[status] || '#ccc' }))
      .sort((a, b) => b.count - a.count);
  }, [orders]);

  // Pie data
  const pieData = useMemo(() => {
    const active = orders.filter(o => o.status !== 'Excluído');
    const groups = {
      'Concluídas': active.filter(o => ['Concluído', 'Conferido', 'Fechado'].includes(o.status)).length,
      'C/ Ocorrência': active.filter(o => o.status === 'Concluído com Ocorrência').length,
      'Em Andamento': active.filter(o => o.status === 'Atribuído').length,
      'Aguardando': active.filter(o => o.status === 'Aguardando').length,
      'Parcial': active.filter(o => o.has_pending_assets).length,
    };
    return Object.entries(groups).filter(([, v]) => v > 0).map(([name, value]) => ({ name, value }));
  }, [orders]);

  // Last 7 days trend
  const trendData = useMemo(() => {
    const activeOrders = orders.filter(o => o.status !== 'Excluído');
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      const key = format(d, 'yyyy-MM-dd');
      const label = format(d, 'dd/MM');
      const dayOrders = activeOrders.filter(o => {
        const date = o.route_date || (o.created_date ? o.created_date.split('T')[0] : null);
        return date === key;
      });
      return {
        label,
        Criadas: dayOrders.length,
        Concluídas: dayOrders.filter(o => ['Concluído', 'Conferido', 'Fechado'].includes(o.status)).length,
        Ocorrências: dayOrders.filter(o => o.status === 'Concluído com Ocorrência').length,
      };
    });
    return days;
  }, [orders]);

  // Occurrence reasons breakdown
  const occurrenceData = useMemo(() => {
    const counts = {};
    orders.filter(o => o.status !== 'Excluído' && o.occurrence_reason).forEach(o => {
      counts[o.occurrence_reason] = (counts[o.occurrence_reason] || 0) + 1;
    });
    return Object.entries(counts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count);
  }, [orders]);

  // Asset types
  const assetData = useMemo(() => {
    const counts = {};
    orders.filter(o => o.status !== 'Excluído').forEach(o => {
      const assets = o.assets?.length > 0 ? o.assets : (o.asset_type ? [{ asset_type: o.asset_type }] : []);
      assets.forEach(a => {
        if (a.asset_type) counts[a.asset_type] = (counts[a.asset_type] || 0) + 1;
      });
    });
    return Object.entries(counts).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [orders]);

  // Driver performance
  const driverData = useMemo(() => {
    const map = {};
    orders.filter(o => o.status !== 'Excluído' && o.assigned_driver).forEach(o => {
      const d = o.assigned_driver;
      if (!map[d]) map[d] = { driver: d, total: 0, done: 0, occurrence: 0, pending: 0 };
      map[d].total++;
      if (['Concluído', 'Conferido', 'Fechado'].includes(o.status)) map[d].done++;
      if (o.status === 'Concluído com Ocorrência') map[d].occurrence++;
      if (o.has_pending_assets) map[d].pending++;
    });
    const sorted = Object.values(map).sort((a, b) => {
      if (driverSort === 'rate') {
        const ra = a.total > 0 ? a.done / a.total : 0;
        const rb = b.total > 0 ? b.done / b.total : 0;
        return rb - ra;
      }
      return b[driverSort] - a[driverSort];
    });
    return sorted;
  }, [orders, driverSort]);

  const topDriver = driverData[0];

  const customTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border rounded-xl p-3 shadow-lg text-xs space-y-1">
        <p className="font-bold">{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color }}>{p.name}: {p.value}</p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">

      {/* KPI Row 1 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <StatCard icon={Package} label="Total OS" value={stats.total} color="bg-slate-500" />
        <StatCard icon={Clock} label="Aguardando" value={stats.waiting} color="bg-yellow-500" />
        <StatCard icon={CheckCircle2} label="Concluídas" value={stats.concluded} color="bg-green-500" />
        <StatCard icon={AlertTriangle} label="Ocorrências" value={stats.withOccurrence} color="bg-orange-500" />
        <StatCard icon={TrendingUp} label="Taxa Sucesso" value={`${stats.successRate}%`} sub="das concluídas" color="bg-teal-500" />
        <StatCard icon={RotateCcw} label="Retentativas" value={stats.retries} color="bg-rose-500" />
        <StatCard icon={Users} label="Motoristas" value={stats.drivers} color="bg-purple-500" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 7-day trend */}
        <div className="lg:col-span-2 bg-card border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Tendência — Últimos 7 dias</h3>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={trendData} margin={{ left: -20, right: 4 }}>
              <defs>
                <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="go" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip content={customTooltip} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Criadas" stroke="#3b82f6" fill="none" strokeWidth={2} dot={{ r: 3 }} />
              <Area type="monotone" dataKey="Concluídas" stroke="#22c55e" fill="url(#gc)" strokeWidth={2} dot={{ r: 3 }} />
              <Area type="monotone" dataKey="Ocorrências" stroke="#f97316" fill="url(#go)" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie */}
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-4">Distribuição de Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip content={customTooltip} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-1 gap-1 mt-2">
            {pieData.map((p, i) => (
              <div key={p.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span>{p.name}</span>
                </div>
                <span className="font-bold">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Volume by status + Occurrence reasons + Asset types */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Volume por status */}
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-4">Volume por Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData} layout="vertical" margin={{ left: 4, right: 20 }}>
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="status" tick={{ fontSize: 10 }} width={90} />
              <Tooltip content={customTooltip} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {statusData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Motivos de Ocorrência */}
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-4">Motivos de Ocorrência</h3>
          {occurrenceData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Sem ocorrências</div>
          ) : (
            <div className="space-y-2.5">
              {occurrenceData.map((o, i) => (
                <ProgressBar
                  key={o.reason}
                  label={o.reason}
                  sublabel={`${o.count} OS`}
                  value={(o.count / occurrenceData[0].count) * 100}
                  color={i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-400' : 'bg-yellow-400'}
                />
              ))}
            </div>
          )}
        </div>

        {/* Tipos de Ativo */}
        <div className="bg-card border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-4">Tipos de Ativo Recolhidos</h3>
          {assetData.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Sem dados</div>
          ) : (
            <div className="space-y-2.5">
              {assetData.map((a, i) => (
                <ProgressBar
                  key={a.type}
                  label={a.type}
                  sublabel={`${a.count}`}
                  value={(a.count / assetData[0].count) * 100}
                  color={['bg-blue-500','bg-indigo-500','bg-violet-500','bg-purple-500','bg-fuchsia-500','bg-pink-500'][i] || 'bg-slate-400'}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Driver performance table */}
      {driverData.length > 0 && (
        <div className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Desempenho por Motorista</h3>
            </div>
            {topDriver && (
              <div className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-200 rounded-full px-3 py-1 text-xs text-yellow-800">
                <Award className="w-3.5 h-3.5 text-yellow-500" />
                Destaque: <strong>{topDriver.driver}</strong>
              </div>
            )}
            <div className="flex gap-1 flex-wrap">
              {[['total','Total'],['done','Concluídas'],['rate','Taxa'],['occurrence','Ocorrências']].map(([k, l]) => (
                <button key={k} onClick={() => setDriverSort(k)} className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${driverSort === k ? 'bg-primary text-white border-primary' : 'bg-background text-muted-foreground border-border hover:bg-muted'}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/20 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="text-left px-4 py-2.5">#</th>
                  <th className="text-left px-4 py-2.5">Motorista</th>
                  <th className="text-center px-4 py-2.5">Total</th>
                  <th className="text-center px-4 py-2.5">Concluídas</th>
                  <th className="text-center px-4 py-2.5">Ocorrências</th>
                  <th className="text-center px-4 py-2.5">Parciais</th>
                  <th className="text-center px-4 py-2.5 min-w-[140px]">Taxa Sucesso</th>
                </tr>
              </thead>
              <tbody>
                {driverData.map((d, idx) => {
                  const rate = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
                  const rateColor = rate >= 80 ? 'bg-green-500' : rate >= 50 ? 'bg-yellow-400' : 'bg-red-500';
                  const rateText = rate >= 80 ? 'text-green-600' : rate >= 50 ? 'text-yellow-600' : 'text-red-600';
                  return (
                    <tr key={d.driver} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-2.5 text-muted-foreground text-xs">{idx + 1}</td>
                      <td className="px-4 py-2.5 font-semibold">{d.driver}</td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant="outline" className="text-xs">{d.total}</Badge>
                      </td>
                      <td className="px-4 py-2.5 text-center text-green-700 font-bold">{d.done}</td>
                      <td className="px-4 py-2.5 text-center">
                        {d.occurrence > 0 ? <span className="text-orange-600 font-semibold">{d.occurrence}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {d.pending > 0 ? <span className="text-violet-600 font-semibold">{d.pending}</span> : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-20 bg-muted rounded-full h-2">
                            <div className={`h-2 rounded-full ${rateColor} transition-all`} style={{ width: `${rate}%` }} />
                          </div>
                          <span className={`text-xs font-bold w-8 text-right ${rateText}`}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
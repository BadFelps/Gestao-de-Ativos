import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, TrendingUp, MapPin, Package, CheckCircle2, Clock } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];

export default function CommercialDashboard({ orders }) {
  const stats = useMemo(() => {
    const occurrences = orders.filter(o => o.status === 'Concluído com Ocorrência');
    const active = orders.filter(o => !['Fechado', 'Excluído'].includes(o.status));
    const closed = orders.filter(o => o.status === 'Fechado');
    const pending = orders.filter(o => o.status === 'Aguardando');

    // Setores com mais ocorrências em aberto
    const setorMap = {};
    occurrences.forEach(o => {
      const s = o.setor || 'Sem Setor';
      setorMap[s] = (setorMap[s] || 0) + 1;
    });
    const setorData = Object.entries(setorMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Motivos de ocorrência
    const motivoMap = {};
    occurrences.forEach(o => {
      const m = o.occurrence_reason || 'Não informado';
      motivoMap[m] = (motivoMap[m] || 0) + 1;
    });
    const motivoData = Object.entries(motivoMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Revendas com mais ocorrências
    const revendaMap = {};
    occurrences.forEach(o => {
      const r = o.revenda || 'Sem Revenda';
      revendaMap[r] = (revendaMap[r] || 0) + 1;
    });
    const revendaData = Object.entries(revendaMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    return { occurrences, active, closed, pending, setorData, motivoData, revendaData };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} label="Ocorrências Abertas" value={stats.occurrences.length} color="text-orange-600" />
        <KpiCard icon={<Clock className="w-5 h-5 text-yellow-500" />} label="OS Aguardando" value={stats.pending.length} color="text-yellow-600" />
        <KpiCard icon={<TrendingUp className="w-5 h-5 text-blue-500" />} label="OS Ativas" value={stats.active.length} color="text-blue-600" />
        <KpiCard icon={<CheckCircle2 className="w-5 h-5 text-green-500" />} label="OS Fechadas" value={stats.closed.length} color="text-green-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setores com mais ocorrências */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-orange-500" />
            Setores com Mais Ocorrências Abertas
          </h3>
          {stats.setorData.length === 0 ? (
            <EmptyState text="Nenhuma ocorrência no momento 🎉" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.setorData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Motivos de Ocorrência */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            Principais Motivos de Ocorrência
          </h3>
          {stats.motivoData.length === 0 ? (
            <EmptyState text="Nenhuma ocorrência no momento 🎉" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.motivoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {stats.motivoData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revendas com mais ocorrências */}
        <div className="bg-card rounded-2xl border p-5 lg:col-span-2">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-500" />
            Revendas com Mais Ocorrências
          </h3>
          {stats.revendaData.length === 0 ? (
            <EmptyState text="Nenhuma ocorrência por revenda" />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.revendaData} margin={{ top: 4, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Lista de ocorrências em aberto */}
      {stats.occurrences.length > 0 && (
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Ocorrências Abertas ({stats.occurrences.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {stats.occurrences.map(o => (
              <div key={o.id} className="flex items-start gap-3 text-xs bg-orange-50 border border-orange-100 rounded-lg px-3 py-2">
                <div className="flex-1">
                  <span className="font-mono font-bold text-primary">{o.os_number}</span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="font-semibold">{o.client_name}</span>
                  {o.setor && <span className="ml-2 text-violet-700 bg-violet-100 rounded-full px-1.5 py-0.5">{o.setor}</span>}
                </div>
                <span className="text-orange-700 font-semibold shrink-0">{o.occurrence_reason || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, color }) {
  return (
    <div className="bg-card rounded-2xl border p-4 flex items-center gap-3">
      <div className="bg-muted rounded-xl p-2.5 shrink-0">{icon}</div>
      <div>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-xs text-muted-foreground leading-tight">{label}</p>
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex items-center justify-center h-[180px] text-muted-foreground text-sm">{text}</div>
  );
}
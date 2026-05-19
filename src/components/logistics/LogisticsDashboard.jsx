import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AlertTriangle, Clock, User, TrendingDown } from 'lucide-react';

const TRACKED_REASONS = ['Não deu tempo', 'Ativo não encontrado', 'Porta Fechada', 'Responsável ausente'];
const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ec4899', '#06b6d4'];

export default function LogisticsDashboard({ orders }) {
  const stats = useMemo(() => {
    const occurrences = orders.filter(o =>
      o.status === 'Concluído com Ocorrência' &&
      TRACKED_REASONS.includes(o.occurrence_reason)
    );

    // Por motivo
    const motivoMap = {};
    occurrences.forEach(o => {
      const m = o.occurrence_reason || 'Outro';
      motivoMap[m] = (motivoMap[m] || 0) + 1;
    });
    const motivoData = Object.entries(motivoMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    // Por motorista
    const motoristaMap = {};
    occurrences.forEach(o => {
      const m = o.assigned_driver || 'Não atribuído';
      if (!motoristaMap[m]) motoristaMap[m] = { total: 0, reasons: {} };
      motoristaMap[m].total++;
      const r = o.occurrence_reason || 'Outro';
      motoristaMap[m].reasons[r] = (motoristaMap[m].reasons[r] || 0) + 1;
    });
    const motoristaData = Object.entries(motoristaMap)
      .map(([name, data]) => ({ name, value: data.total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Por setor
    const setorMap = {};
    occurrences.forEach(o => {
      const s = o.setor || 'Sem Setor';
      setorMap[s] = (setorMap[s] || 0) + 1;
    });
    const setorData = Object.entries(setorMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // KPIs individuais
    const naoDeuTempo = occurrences.filter(o => o.occurrence_reason === 'Não deu tempo').length;
    const ativoNaoEncontrado = occurrences.filter(o => o.occurrence_reason === 'Ativo não encontrado').length;
    const portaFechada = occurrences.filter(o => o.occurrence_reason === 'Porta Fechada').length;
    const responsavelAusente = occurrences.filter(o => o.occurrence_reason === 'Responsável ausente').length;

    return { occurrences, motivoData, motoristaData, setorData, naoDeuTempo, ativoNaoEncontrado, portaFechada, responsavelAusente };
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard icon={<Clock className="w-5 h-5 text-red-500" />} label="Não deu tempo" value={stats.naoDeuTempo} color="text-red-600" />
        <KpiCard icon={<AlertTriangle className="w-5 h-5 text-orange-500" />} label="Ativo não encontrado" value={stats.ativoNaoEncontrado} color="text-orange-600" />
        <KpiCard icon={<TrendingDown className="w-5 h-5 text-yellow-500" />} label="Porta Fechada" value={stats.portaFechada} color="text-yellow-600" />
        <KpiCard icon={<User className="w-5 h-5 text-blue-500" />} label="Responsável ausente" value={stats.responsavelAusente} color="text-blue-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Motivos */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Ocorrências por Motivo
          </h3>
          {stats.motivoData.length === 0 ? (
            <EmptyState text="Nenhuma ocorrência registrada 🎉" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={stats.motivoData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                  {stats.motivoData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking de setores */}
        <div className="bg-card rounded-2xl border p-5">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            Setores com Mais Ocorrências
          </h3>
          {stats.setorData.length === 0 ? (
            <EmptyState text="Nenhuma ocorrência por setor" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.setorData} layout="vertical" margin={{ left: 8, right: 24 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Ranking de motoristas */}
        <div className="bg-card rounded-2xl border p-5 lg:col-span-2">
          <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-blue-500" />
            Ranking de Ocorrências por Motorista
          </h3>
          {stats.motoristaData.length === 0 ? (
            <EmptyState text="Nenhuma ocorrência por motorista" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.motoristaData} margin={{ top: 4, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 11 }} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
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
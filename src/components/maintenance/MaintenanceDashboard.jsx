import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { CheckCircle2, Wrench, TrendingUp, DollarSign, Users, AlertTriangle } from 'lucide-react';

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#a855f7', '#ef4444', '#eab308'];

const fmt = (v) => `R$ ${Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

export default function MaintenanceDashboard({ requests }) {
  const concluded = useMemo(() => requests.filter(r => r.status === 'concluido'), [requests]);
  const cancelled = useMemo(() => requests.filter(r => r.status === 'cancelado'), [requests]);
  const active = useMemo(() => requests.filter(r => !['concluido', 'cancelado'].includes(r.status)), [requests]);

  // Valor total orçado (apenas concluídos)
  const totalValue = useMemo(() =>
    concluded.reduce((sum, r) => sum + (r.quote_value || 0), 0),
    [concluded]
  );

  // Valor médio por serviço
  const avgValue = concluded.length > 0 ? totalValue / concluded.length : 0;

  // Clientes com mais recorrências
  const clientRecurrences = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      const key = r.pdv_code || r.razao_social;
      if (!map[key]) map[key] = { name: r.fantasia || r.razao_social, pdv: r.pdv_code, count: 0, total: 0 };
      map[key].count += 1;
      map[key].total += r.quote_value || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [requests]);

  // Tipos de problema mais comuns (primeiras palavras)
  const problemTypes = useMemo(() => {
    const map = {};
    requests.forEach(r => {
      const key = (r.problem_description || 'Não informado').substring(0, 40);
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [requests]);

  // Técnicos e quantidade de serviços concluídos
  const technicianStats = useMemo(() => {
    const map = {};
    concluded.forEach(r => {
      const tech = r.technician_name || 'Não atribuído';
      if (!map[tech]) map[tech] = { name: tech, count: 0, total: 0 };
      map[tech].count += 1;
      map[tech].total += r.quote_value || 0;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [concluded]);

  // Peças/serviços mais utilizados
  const topParts = useMemo(() => {
    const map = {};
    concluded.forEach(r => {
      (r.quote_items || []).forEach(item => {
        if (!map[item.name]) map[item.name] = { name: item.name, qty: 0, total: 0 };
        map[item.name].qty += item.quantity || 1;
        map[item.name].total += item.total || 0;
      });
    });
    return Object.values(map).sort((a, b) => b.qty - a.qty).slice(0, 8);
  }, [concluded]);

  // Serviços por mês (últimos 6 meses)
  const byMonth = useMemo(() => {
    const map = {};
    concluded.forEach(r => {
      const d = new Date(r.completion_date || r.created_date);
      const key = `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      if (!map[key]) map[key] = { key, label, count: 0, value: 0 };
      map[key].count += 1;
      map[key].value += r.quote_value || 0;
    });
    return Object.values(map).sort((a, b) => a.key.localeCompare(b.key)).slice(-6);
  }, [concluded]);

  const statCards = [
    { label: 'Total de Solicitações', value: requests.length, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Serviços Concluídos', value: concluded.length, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Em Andamento', value: active.length, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Valor Total Executado', value: fmt(totalValue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', wide: true },
    { label: 'Ticket Médio', value: fmt(avgValue), icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50', wide: true },
    { label: 'Cancelamentos', value: cancelled.length, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  if (requests.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Wrench className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p>Nenhum dado disponível ainda.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {statCards.map(s => (
          <Card key={s.label} className={`border ${s.wide ? 'col-span-2 sm:col-span-1' : ''}`}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold ${s.color} truncate`}>{s.value}</p>
                <p className="text-xs text-muted-foreground leading-tight">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Serviços por mês */}
      {byMonth.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Serviços Concluídos por Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip formatter={(v, n) => n === 'value' ? fmt(v) : v} labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="count" name="Serviços" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Valor gasto por mês */}
      {byMonth.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Valor Faturado por Mês (R$)</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byMonth} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} labelStyle={{ fontWeight: 600 }} />
                <Bar dataKey="value" name="Valor (R$)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Técnicos */}
        {technicianStats.length > 0 && (
          <Card className="border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> Serviços por Técnico
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {technicianStats.map((t, i) => (
                <div key={t.name} className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{fmt(t.total)}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs shrink-0">{t.count}x</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Clientes com mais recorrências */}
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" /> Clientes com Mais Recorrências
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-2">
            {clientRecurrences.slice(0, 6).map((c, i) => (
              <div key={c.pdv} className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">PDV: {c.pdv}</p>
                </div>
                <Badge className={`text-xs shrink-0 ${c.count >= 3 ? 'bg-red-100 text-red-800 border-red-200' : 'bg-orange-100 text-orange-800 border-orange-200'}`}>
                  {c.count}x
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Peças mais utilizadas */}
      {topParts.length > 0 && (
        <Card className="border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Peças e Serviços Mais Utilizados</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topParts} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={140} />
                <Tooltip formatter={(v, n) => n === 'total' ? fmt(v) : v} />
                <Bar dataKey="qty" name="Qtd. usada" radius={[0, 4, 4, 0]}>
                  {topParts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Distribuição de status */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Aguard. Triagem', value: requests.filter(r => r.status === 'pendente_triagem').length, color: 'bg-yellow-100 text-yellow-800' },
              { label: 'Em Orçamento', value: requests.filter(r => r.status === 'em_orcamento').length, color: 'bg-blue-100 text-blue-800' },
              { label: 'Aguard. Aprovação', value: requests.filter(r => r.status === 'aguardando_aprovacao').length, color: 'bg-orange-100 text-orange-800' },
              { label: 'Aprovado p/ Exec.', value: requests.filter(r => r.status === 'aprovado_execucao').length, color: 'bg-indigo-100 text-indigo-800' },
              { label: 'Em Execução', value: requests.filter(r => r.status === 'em_execucao').length, color: 'bg-purple-100 text-purple-800' },
              { label: 'Concluído', value: concluded.length, color: 'bg-green-100 text-green-800' },
              { label: 'Cancelado', value: cancelled.length, color: 'bg-red-100 text-red-800' },
            ].map(s => (
              <div key={s.label} className={`flex items-center justify-between px-3 py-2 rounded-lg ${s.color}`}>
                <span className="text-xs font-medium">{s.label}</span>
                <span className="text-sm font-bold">{s.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
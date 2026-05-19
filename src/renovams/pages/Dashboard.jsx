import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';
import ProgressoGeral from '@/renovams/components/dashboard/ProgressoGeral';
import RankingVendedores from '@/renovams/components/dashboard/RankingVendedores';
import RankingRevendas from '@/renovams/components/dashboard/RankingRevendas';
import StatsCard from '@/renovams/components/dashboard/StatsCard';

export default function RenovaDashboard() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Cliente.list('created_date', 2000).then(data => { setClientes(data || []); setLoading(false); });
  }, []);

  const total = clientes.length;
  const validados = clientes.filter(c => c.status_validacao === 'validado').length;
  const divergentes = clientes.filter(c => c.status_validacao === 'divergente').length;
  const pendentes = clientes.filter(c => c.status_validacao === 'pendente').length;

  const revendasMap = {};
  clientes.forEach(c => {
    const key = c.setor_vendedor || 'Sem filial';
    if (!revendasMap[key]) revendasMap[key] = { nome: key, total: 0, validados: 0, divergentes: 0 };
    revendasMap[key].total++;
    if (c.status_validacao === 'validado') revendasMap[key].validados++;
    if (c.status_validacao === 'divergente') revendasMap[key].divergentes++;
  });
  const rankingRevendas = Object.values(revendasMap)
    .map(v => ({ ...v, pct: v.total > 0 ? Math.round(((v.validados + v.divergentes) / v.total) * 100) : 0 }))
    .sort((a, b) => b.pct - a.pct);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Acompanhamento em tempo real da renovação de comodatos</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Total de Clientes" value={total} icon={Users} color="blue" loading={loading} />
        <StatsCard label="Validados" value={validados} icon={CheckCircle2} color="green" loading={loading} />
        <StatsCard label="Com Divergência" value={divergentes} icon={AlertTriangle} color="yellow" loading={loading} />
        <StatsCard label="Pendentes" value={pendentes} icon={Clock} color="gray" loading={loading} />
      </div>
      <ProgressoGeral validados={validados} divergentes={divergentes} total={total} loading={loading} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingRevendas ranking={rankingRevendas} loading={loading} />
        <RankingVendedores clientes={clientes} loading={loading} />
      </div>
    </div>
  );
}
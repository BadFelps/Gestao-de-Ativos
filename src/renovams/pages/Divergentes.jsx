import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { AlertTriangle, User, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function RenovaDivergentes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSetor, setFilterSetor] = useState('todos');
  const navigate = useNavigate();

  useEffect(() => {
    base44.entities.Cliente.list('created_date', 2000).then(data => {
      setClientes((data || []).filter(c => c.status_validacao === 'divergente'));
      setLoading(false);
    });
  }, []);

  const setores = [...new Set(clientes.map(c => c.setor_vendedor).filter(Boolean))];
  const filtrados = filterSetor === 'todos' ? clientes : clientes.filter(c => c.setor_vendedor === filterSetor);
  const rankingVendedor = Object.values(
    filtrados.reduce((acc, c) => {
      const cod = c.codigo_vendedor || 'N/A';
      if (!acc[cod]) acc[cod] = { codigo: cod, total: 0 };
      acc[cod].total++;
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Divergentes</h1>
          <p className="text-muted-foreground text-sm mt-1">Clientes com materiais em divergência registrada pelo vendedor</p>
        </div>
        <Select value={filterSetor} onValueChange={setFilterSetor}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500" /><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ranking — Divergentes por Vendedor</CardTitle></div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && [1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
            {!loading && rankingVendedor.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">Nenhum divergente{filterSetor !== 'todos' ? ' neste setor' : ''}.</p>}
            {!loading && rankingVendedor.map((v, i) => (
              <div key={v.codigo} className="flex items-center gap-3">
                <span className={`text-xs font-bold w-6 text-center rounded-full py-0.5 ${i === 0 ? 'bg-yellow-200 text-yellow-800' : i === 1 ? 'bg-gray-200 text-gray-700' : i === 2 ? 'bg-orange-100 text-orange-700' : 'text-muted-foreground'}`}>{i + 1}</span>
                <div className="flex items-center gap-1.5 w-24 shrink-0"><User className="w-3 h-3 text-muted-foreground" /><span className="text-sm font-medium">Vend. {v.codigo}</span></div>
                <div className="flex-1 bg-muted rounded-full h-2"><div className="h-2 rounded-full bg-yellow-400 transition-all" style={{ width: `${(v.total / (rankingVendedor[0]?.total || 1)) * 100}%` }} /></div>
                <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50 shrink-0">{v.total}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border shadow-sm">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Clientes Divergentes ({filtrados.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[480px] overflow-y-auto">
            {loading && [1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
            {!loading && filtrados.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">Nenhum cliente divergente{filterSetor !== 'todos' ? ' neste setor' : ''}.</p>}
            {!loading && filtrados.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-yellow-200 bg-yellow-50 cursor-pointer hover:bg-yellow-100 transition-colors" onClick={() => navigate(`/renovams/clientes/${c.id}`)}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{c.fantasia || c.razao_social}</p>
                  <p className="text-xs text-muted-foreground">Vend. {c.codigo_vendedor || '—'} · {c.setor_vendedor || '—'}</p>
                  {c.data_validacao && <p className="text-xs text-muted-foreground">Validado em {new Date(c.data_validacao).toLocaleDateString('pt-BR')}</p>}
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0"><Eye className="w-4 h-4" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
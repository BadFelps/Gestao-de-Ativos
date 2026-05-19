import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, CheckCircle2, AlertTriangle, Clock, ChevronRight, Calendar, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statusConfig = {
  pendente: { label: 'Pendente', icon: Clock, className: 'bg-gray-100 text-gray-600 border-gray-200' },
  validado: { label: 'Validado', icon: CheckCircle2, className: 'bg-green-100 text-green-700 border-green-200' },
  divergente: { label: 'Divergente', icon: AlertTriangle, className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
};

export default function RenovaClientes() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos');
  const [filterSetor, setFilterSetor] = useState('todos');
  const [filterDataDe, setFilterDataDe] = useState('');
  const [filterDataAte, setFilterDataAte] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const carregar = async () => {
      let todos = [], pg = 0;
      while (true) {
        const lote = await base44.entities.Cliente.list('created_date', 200, pg * 200);
        if (!lote || lote.length === 0) break;
        todos = todos.concat(lote);
        if (lote.length < 200) break;
        pg++;
      }
      setClientes(todos);
      setLoading(false);
    };
    carregar();
  }, []);

  const setores = [...new Set(clientes.map(c => c.setor_vendedor).filter(Boolean))].sort();
  const filtered = clientes.filter(c => {
    const matchSearch = !search || c.razao_social?.toLowerCase().includes(search.toLowerCase()) || c.fantasia?.toLowerCase().includes(search.toLowerCase()) || c.codigo_cliente?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'todos' || 
      (filterStatus === 'concluido' ? c.documento_renovado : c.status_validacao === filterStatus);
    const matchSetor = filterSetor === 'todos' || c.setor_vendedor === filterSetor;
    const dataVal = c.data_validacao ? new Date(c.data_validacao) : null;
    const matchDataDe = !filterDataDe || (dataVal && dataVal >= new Date(filterDataDe));
    const matchDataAte = !filterDataAte || (dataVal && dataVal <= new Date(filterDataAte + 'T23:59:59'));
    return matchSearch && matchStatus && matchSetor && matchDataDe && matchDataAte;
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
        <p className="text-muted-foreground text-sm mt-1">Todos os clientes da base — {clientes.length} registros</p>
      </div>
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9 h-9 text-sm" placeholder="Buscar por nome, fantasia ou código..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Select value={filterSetor} onValueChange={setFilterSetor}>
            <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os setores</SelectItem>
              {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full h-9 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="validado">Validado</SelectItem>
              <SelectItem value="divergente">Divergente</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground shrink-0">De</span>
          <Input type="date" className="h-7 text-xs border-0 bg-transparent shadow-none px-1 w-full focus-visible:ring-0" value={filterDataDe} onChange={e => setFilterDataDe(e.target.value)} />
          <span className="text-xs text-muted-foreground shrink-0">Até</span>
          <Input type="date" className="h-7 text-xs border-0 bg-transparent shadow-none px-1 w-full focus-visible:ring-0" value={filterDataAte} onChange={e => setFilterDataAte(e.target.value)} />
        </div>
      </div>
      <div className="space-y-2">
        {loading ? Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        : filtered.map(c => {
            const st = statusConfig[c.status_validacao] || statusConfig.pendente;
            const Icon = st.icon;
            return (
              <div key={c.id} onClick={() => navigate(`/renovams/clientes/${c.id}`)} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-md transition-all cursor-pointer group">
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center border shrink-0', st.className)}><Icon className="w-4 h-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-foreground truncate">{c.fantasia || c.razao_social}</p>
                    {c.documento_renovado && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs flex items-center gap-1"><FileText className="w-3 h-3" />Concluído</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{c.razao_social}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {c.setor_vendedor && <p className="text-xs text-muted-foreground">{c.setor_vendedor}</p>}
                    {c.codigo_vendedor && <p className="text-xs text-muted-foreground">Vendedor: {c.codigo_vendedor}</p>}
                    {c.data_validacao && <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(c.data_validacao).toLocaleDateString('pt-BR')}</p>}
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
              </div>
            );
          })}
        {!loading && filtered.length === 0 && <p className="text-center text-muted-foreground py-12">Nenhum cliente encontrado.</p>}
      </div>
    </div>
  );
}
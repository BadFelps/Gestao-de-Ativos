import { useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Loader2, ChevronDown, ChevronUp, Building2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

async function withRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('Rate limit') || String(err).includes('429');
      if (is429 && attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s, 8s, 16s
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
}

function determinarFilial(codigoCliente) {
  const num = parseInt(String(codigoCliente || '').trim(), 10);
  if (isNaN(num)) return '';
  return num >= 200 ? 'MS Delmiro Gouveia' : 'MS Paulo Afonso';
}

function lerExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      const headerRowIndex = rows.findIndex(r => r.some(cell => String(cell).trim() !== ''));
      if (headerRowIndex === -1) { reject(new Error('Planilha vazia')); return; }
      const headers = rows[headerRowIndex].map(h => String(h).trim().toLowerCase());
      const dataRows = rows.slice(headerRowIndex + 1);
      const colMap = {
        codigo_cliente: headers.findIndex(h => (h.includes('código') || h.includes('codigo')) && h.includes('cliente')),
        fantasia: headers.findIndex(h => h.includes('fantasia')),
        razao_social: headers.findIndex(h => h.includes('razão') || h.includes('razao') || h.includes('social')),
        endereco: headers.findIndex(h => h.includes('endereço') || h.includes('endereco')),
        telefone1: headers.findIndex(h => (h.includes('telefone') || h.includes('fone')) && (h.includes('1') || h === 'telefone' || h === 'fone')),
        telefone2: headers.findIndex(h => (h.includes('telefone') || h.includes('fone')) && h.includes('2')),
        telefone3: headers.findIndex(h => (h.includes('telefone') || h.includes('fone')) && h.includes('3')),
        codigo_vendedor: headers.findIndex(h => h.includes('vendedor')),
        cev: headers.findIndex(h => h.includes('cev')),
        dia_visita: headers.findIndex(h => h.includes('dia') || h.includes('visita')),
        descricao_material: headers.findIndex(h => h.includes('descrição') || h.includes('descricao') || h.includes('material')),
        quantidade_material: headers.findIndex(h => h.includes('quant') || h.includes('qtd') || h.includes('quantidade')),
      };
      const getCol = (key, fallback) => colMap[key] !== -1 ? colMap[key] : fallback;
      const linhas = dataRows.filter(row => row.some(cell => String(cell).trim() !== '')).map(row => ({
        codigo_cliente: String(row[getCol('codigo_cliente', 0)] || '').trim(),
        fantasia: String(row[getCol('fantasia', 1)] || '').trim(),
        razao_social: String(row[getCol('razao_social', 2)] || '').trim(),
        endereco: String(row[getCol('endereco', 3)] || '').trim(),
        telefone: [String(row[getCol('telefone1', 4)] || '').trim(), String(row[getCol('telefone2', 5)] || '').trim(), String(row[getCol('telefone3', 6)] || '').trim()].filter(Boolean).join(' / '),
        codigo_vendedor: String(row[getCol('codigo_vendedor', 7)] || '').trim(),
        cev: String(row[getCol('cev', 8)] || '').trim(),
        dia_visita: String(row[getCol('dia_visita', 9)] || '').trim(),
        descricao_material: String(row[getCol('descricao_material', 10)] || '').trim(),
        quantidade_material: Number(row[getCol('quantidade_material', 11)]) || 1,
      }));
      resolve(linhas);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function agruparClientes(linhas) {
  const mapa = {};
  linhas.forEach(linha => {
    const chave = linha.codigo_cliente || linha.razao_social || linha.fantasia;
    if (!chave) return;
    if (!mapa[chave]) {
      mapa[chave] = { codigo_cliente: linha.codigo_cliente, fantasia: linha.fantasia, razao_social: linha.razao_social, endereco: linha.endereco, telefone: linha.telefone, codigo_vendedor: linha.codigo_vendedor, setor_vendedor: determinarFilial(linha.codigo_cliente), cev: linha.cev, dia_visita: linha.dia_visita, materiais: [], status_validacao: 'pendente' };
    }
    if (!mapa[chave].telefone && linha.telefone) mapa[chave].telefone = linha.telefone;
    if (linha.cev && !mapa[chave].cev) mapa[chave].cev = linha.cev;
    if (linha.descricao_material) mapa[chave].materiais.push({ codigo: linha.cev || '', descricao: linha.descricao_material, quantidade: linha.quantidade_material || 1 });
  });
  return Object.values(mapa);
}

export default function RenovaImportar() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('idle');
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [imported, setImported] = useState(0);
  const [limpando, setLimpando] = useState(false);
  const [progressoLimpeza, setProgressoLimpeza] = useState({ atual: 0, total: 0 });
  const [progresso, setProgresso] = useState({ atual: 0, total: 0 });

  const handleLimparBase = async () => {
    if (!window.confirm('Tem certeza que deseja APAGAR TODOS os clientes? Esta ação não pode ser desfeita.')) return;
    setLimpando(true);
    try {
      // Buscar todos os IDs primeiro
      let todos = [], offset = 0;
      const pageSize = 100;
      while (true) {
        const lote = await withRetry(() => base44.entities.Cliente.list('created_date', pageSize, offset));
        if (!lote || lote.length === 0) break;
        todos = todos.concat(lote.map(c => c.id));
        offset += lote.length;
        await new Promise(r => setTimeout(r, 200));
        if (lote.length < pageSize) break;
      }
      if (todos.length === 0) { toast.success('A base já está vazia.'); setLimpando(false); return; }
      setProgressoLimpeza({ atual: 0, total: todos.length });

      // Deletar um por vez com retry para evitar rate limit
      let removidos = 0;
      for (const id of todos) {
        await withRetry(() => base44.entities.Cliente.delete(id));
        removidos++;
        setProgressoLimpeza({ atual: removidos, total: todos.length });
        await new Promise(r => setTimeout(r, 150));
      }
      toast.success(`${removidos} clientes removidos com sucesso!`);
    } catch (err) {
      toast.error(`Erro ao apagar: ${err?.message || 'desconhecido'}`);
    } finally {
      setLimpando(false);
      setProgressoLimpeza({ atual: 0, total: 0 });
    }
  };

  const handleProcessar = async () => {
    if (!file) { toast.error('Selecione um arquivo.'); return; }
    setStep('parsing'); setErrors([]); setPreview([]);
    let linhas;
    try { linhas = await lerExcel(file); } catch (err) { toast.error('Erro ao ler o arquivo: ' + (err?.message || 'formato inválido')); setStep('idle'); return; }
    if (linhas.length === 0) { toast.error('Nenhuma linha encontrada na planilha.'); setStep('idle'); return; }
    const agrupados = agruparClientes(linhas);
    const errs = [];
    const valid = agrupados.filter((c, i) => { if (!c.razao_social && !c.fantasia && !c.codigo_cliente) { errs.push(`Registro ${i + 1}: sem identificação`); return false; } return true; });
    setErrors(errs); setPreview(valid); setStep('preview');
    toast.success(`${valid.length} clientes identificados na planilha.`);
  };

  const handleImportar = async () => {
    if (preview.length === 0) return;
    setStep('importing'); setProgresso({ atual: 0, total: preview.length });
    let existentes = [], offset = 0;
    const pageSize = 100;
    while (true) {
      const lote = await withRetry(() => base44.entities.Cliente.list('created_date', pageSize, offset));
      if (!lote || lote.length === 0) break;
      existentes = existentes.concat(lote);
      offset += lote.length;
      await new Promise(r => setTimeout(r, 200));
      if (lote.length < pageSize) break;
    }
    const mapaExistentes = {};
    existentes.forEach(e => { const chave = e.codigo_cliente || e.razao_social; if (chave) mapaExistentes[chave] = e; });
    const paraAtualizar = [], paraCriar = [];
    for (const c of preview) {
      const chave = c.codigo_cliente || c.razao_social;
      const existente = mapaExistentes[chave];
      if (existente) paraAtualizar.push({ id: existente.id, ...c, status_validacao: existente.status_validacao, data_validacao: existente.data_validacao, observacao_divergencia: existente.observacao_divergencia, materiais_validados: existente.materiais_validados });
      else paraCriar.push({ ...c, status_validacao: 'pendente' });
    }
    let processados = 0;
    const BATCH = 5;
    for (let i = 0; i < paraCriar.length; i += BATCH) {
      await withRetry(() => base44.entities.Cliente.bulkCreate(paraCriar.slice(i, i + BATCH)));
      processados += Math.min(BATCH, paraCriar.length - i);
      setProgresso({ atual: processados, total: preview.length });
      await new Promise(r => setTimeout(r, 300));
    }
    for (let i = 0; i < paraAtualizar.length; i += BATCH) {
      const slice = paraAtualizar.slice(i, i + BATCH);
      for (const c of slice) {
        await withRetry(() => base44.entities.Cliente.update(c.id, c));
        processados++;
        setProgresso({ atual: processados, total: preview.length });
        await new Promise(r => setTimeout(r, 150));
      }
    }
    setImported(preview.length); setStep('done');
    toast.success(`${paraCriar.length} criados, ${paraAtualizar.length} atualizados!`);
  };

  const reset = () => { setFile(null); setStep('idle'); setPreview([]); setErrors([]); setImported(0); setProgresso({ atual: 0, total: 0 }); };
  const isLoading = ['parsing', 'importing'].includes(step);
  const statsFilial = preview.reduce((acc, c) => { const f = c.setor_vendedor || 'Sem filial'; acc[f] = (acc[f] || 0) + 1; return acc; }, {});

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div><h1 className="text-2xl font-bold text-foreground">Importar Base de Clientes</h1><p className="text-muted-foreground text-sm mt-1">Faça upload do relatório Excel (.xlsx / .xls)</p></div>
        <div className="flex flex-col items-end gap-1">
          <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={handleLimparBase} disabled={limpando}>
            {limpando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            {limpando ? `Removendo ${progressoLimpeza.atual}/${progressoLimpeza.total}...` : 'Limpar toda a base'}
          </Button>
          {limpando && progressoLimpeza.total > 0 && <div className="w-48"><Progress value={(progressoLimpeza.atual / progressoLimpeza.total) * 100} className="h-1.5" /></div>}
        </div>
      </div>
      {step === 'done' ? (
        <Card className="border shadow-sm text-center py-12">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"><CheckCircle2 className="w-8 h-8 text-green-600" /></div>
            <h2 className="text-xl font-bold">{imported} clientes importados!</h2>
            <p className="text-muted-foreground text-sm">Os clientes já estão disponíveis para os vendedores.</p>
            <Button onClick={reset}>Fazer nova importação</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border shadow-sm">
            <CardHeader><CardTitle className="text-base">1. Selecione o arquivo Excel</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <label className={cn('flex flex-col items-center gap-3 p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors', file ? 'border-green-500 bg-green-50' : 'border-border hover:border-green-400 hover:bg-muted/30')}>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files[0]; if (f) { setFile(f); setStep('idle'); setPreview([]); setErrors([]); } }} disabled={isLoading} />
                {file ? (<><FileSpreadsheet className="w-10 h-10 text-green-600" /><p className="font-medium text-foreground">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p></>)
                : (<><Upload className="w-10 h-10 text-muted-foreground" /><p className="font-medium text-muted-foreground">Arraste ou clique para selecionar</p><p className="text-xs text-muted-foreground">.xlsx ou .xls</p></>)}
              </label>
              <Button className="w-full" style={{background:'hsl(122,55%,28%)'}} onClick={handleProcessar} disabled={!file || isLoading}>
                {isLoading && step === 'parsing' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processando planilha...</> : <><FileSpreadsheet className="w-4 h-4 mr-2" />Processar arquivo</>}
              </Button>
            </CardContent>
          </Card>
          {errors.length > 0 && (
            <Card className="border border-yellow-200 bg-yellow-50 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-yellow-700 font-medium mb-2"><AlertCircle className="w-4 h-4" />{errors.length} linha{errors.length > 1 ? 's' : ''} ignorada{errors.length > 1 ? 's' : ''}</div>
                {errors.slice(0, 3).map((e, i) => <p key={i} className="text-xs text-yellow-600">{e}</p>)}
                {errors.length > 3 && <p className="text-xs text-yellow-500 mt-1">+ {errors.length - 3} outros...</p>}
              </CardContent>
            </Card>
          )}
          {(step === 'preview' || step === 'importing') && preview.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base">2. Confirmar importação</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Badge className="bg-green-100 text-green-700 border-green-200">{preview.length} clientes</Badge>
                    {Object.entries(statsFilial).map(([filial, count]) => <Badge key={filial} variant="outline" className="flex items-center gap-1"><Building2 className="w-3 h-3" />{filial}: {count}</Badge>)}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        <th className="text-left px-3 py-2 text-muted-foreground font-semibold">Cliente</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-semibold hidden sm:table-cell">Filial / CEV</th>
                        <th className="text-left px-3 py-2 text-muted-foreground font-semibold hidden md:table-cell">Materiais</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAll ? preview : preview.slice(0, 10)).map((c, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2"><p className="font-medium">{c.fantasia || c.razao_social || c.codigo_cliente}</p>{c.codigo_cliente && <p className="text-xs text-muted-foreground">Cód: {c.codigo_cliente}</p>}</td>
                          <td className="px-3 py-2 hidden sm:table-cell text-muted-foreground text-xs"><p>{c.setor_vendedor || '—'}</p>{c.cev && <p>CEV: {c.cev}</p>}</td>
                          <td className="px-3 py-2 hidden md:table-cell text-muted-foreground text-xs">{c.materiais?.length > 0 ? <ul>{c.materiais.slice(0,3).map((m,mi) => <li key={mi}>• {m.descricao} (x{m.quantidade})</li>)}{c.materiais.length > 3 && <li>+{c.materiais.length - 3} mais</li>}</ul> : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.length > 10 && <button className="flex items-center gap-1 text-xs hover:underline" style={{color:'hsl(122,55%,28%)'}} onClick={() => setShowAll(!showAll)}>{showAll ? <><ChevronUp className="w-3 h-3" />Mostrar menos</> : <><ChevronDown className="w-3 h-3" />Ver todos ({preview.length})</>}</button>}
                {step === 'importing' && <div className="space-y-2"><div className="flex justify-between text-sm text-muted-foreground"><span>Importando...</span><span>{progresso.atual} / {progresso.total}</span></div><Progress value={progresso.total > 0 ? (progresso.atual / progresso.total) * 100 : 0} className="h-2" /></div>}
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={handleImportar} disabled={isLoading}>
                  {step === 'importing' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando {progresso.atual}/{progresso.total}...</> : <><CheckCircle2 className="w-4 h-4 mr-2" />Importar {preview.length} clientes</>}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
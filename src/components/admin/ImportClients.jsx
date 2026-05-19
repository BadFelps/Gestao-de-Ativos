import { useState } from 'react';
import * as XLSX from 'xlsx';
import { base44 } from '@/api/base44Client';

async function withRetry(fn, maxRetries = 5) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 || err?.message?.includes('Rate limit') || String(err).includes('429');
      if (is429 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
      } else {
        throw err;
      }
    }
  }
}
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, CheckCircle2, Loader2, AlertCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

function lerExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export default function ImportClients() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setLoading(true);
    setResult(null);
    setError('');
    setProgress({ current: 0, total: 0, label: 'Lendo planilha...' });

    let rows;
    try {
      rows = await lerExcel(file);
    } catch (err) {
      setError('Erro ao ler o arquivo: ' + (err?.message || 'formato inválido'));
      setLoading(false);
      return;
    }

    const clients = rows
      .map(row => ({
        pdv_code: String(row['Cód. PDV'] || '').trim(),
        razao_social: String(row['Razão Social'] || '').trim(),
        fantasia: String(row['Fantasia'] || '').trim(),
        address: String(row['End Cli Completo'] || '').trim(),
        bairro: String(row['Bairro'] || '').trim(),
        cidade: String(row['Cidade'] || '').trim(),
        cep: String(row['End Cli CEP'] || '').trim(),
        cnpj: String(row['CNPJ Cli'] || '').trim(),
        setor: String(row['POSSÍVEL SETOR'] || row['SEGMENTAÇÃO SETOR ATUAL'] || '').trim(),
        latitude: String(row['Latitude'] || '').trim(),
        longitude: String(row['Longitude'] || '').trim(),
        vendedor: String(row['VD'] || '').trim(),
        canal: String(row['Canal'] || '').trim(),
        revenda: String(row['Revenda'] || row['REVENDA'] || '').trim(),
      }))
      .filter(c => c.pdv_code && c.pdv_code !== 'undefined');

    if (clients.length === 0) {
      setError('Nenhum registro válido encontrado. Verifique se a coluna "Cód. PDV" existe na planilha.');
      setLoading(false);
      return;
    }

    setProgress({ current: 0, total: clients.length, label: 'Importando clientes...' });

    let created = 0;
    const batchSize = 5;
    for (let i = 0; i < clients.length; i += batchSize) {
      await withRetry(() => base44.entities.ClientBase.bulkCreate(clients.slice(i, i + batchSize)));
      created += Math.min(batchSize, clients.length - i);
      setProgress({ current: created, total: clients.length, label: 'Importando clientes...' });
      await new Promise(r => setTimeout(r, 300));
    }

    setResult({ created, total: rows.length });
    setProgress({ current: created, total: clients.length, label: 'Concluído!' });
    toast.success(`${created} clientes importados com sucesso!`);
    setLoading(false);
  };

  const progressPct = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="bg-card rounded-2xl border p-6 space-y-5">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-bold text-lg">Importar Base de Clientes</h3>
          <p className="text-sm text-muted-foreground">Faça upload da planilha Excel com os dados dos clientes</p>
        </div>
      </div>

      <div className="bg-muted/50 rounded-xl p-4 text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Formato esperado (colunas da planilha):</p>
        <p>• <strong>Cód. PDV</strong> — chave de busca no formulário</p>
        <p>• Razão Social, Fantasia, End Cli Completo, Bairro, Cidade, End Cli CEP, CNPJ Cli</p>
        <p>• POSSÍVEL SETOR, Latitude, Longitude, VD, Canal, Revenda</p>
      </div>

      <label className="block">
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={loading} />
        <Button className="w-full h-12 font-semibold gap-2 cursor-pointer" disabled={loading} asChild>
          <span>
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> {progress.label || 'Processando...'}</>
            ) : (
              <><Upload className="w-5 h-5" /> Selecionar arquivo Excel</>
            )}
          </span>
        </Button>
      </label>

      {(loading || result) && progress.total > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{progress.label}</span>
            <span>{progress.current} / {progress.total}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      )}

      {result && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="font-semibold text-green-800">Importação concluída!</p>
            <p className="text-sm text-green-700">{result.created} clientes importados de {result.total} registros</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
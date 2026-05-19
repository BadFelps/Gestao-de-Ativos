import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Trash2, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function ClearDatabaseModal({ onCleared, onClose }) {
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClear = async () => {
    if (confirmText !== 'LIMPAR') return;
    setLoading(true);
    try {
      // Busca em lotes e deleta com delay para evitar rate limit
      let total = 0;
      let hasMore = true;
      while (hasMore) {
        const batch = await base44.entities.ServiceOrder.list('-created_date', 50);
        if (batch.length === 0) { hasMore = false; break; }
        for (const os of batch) {
          await base44.entities.ServiceOrder.delete(os.id);
          await new Promise(r => setTimeout(r, 50)); // 50ms entre cada delete
        }
        total += batch.length;
        if (batch.length < 50) hasMore = false;
      }
      toast.success(`${total} OS removidas com sucesso.`);
      onCleared?.();
      onClose?.();
    } catch (e) {
      toast.error('Erro ao limpar: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Limpar Base de OS</h2>
              <p className="text-xs text-gray-500">Esta ação é irreversível</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-red-800">⚠️ Atenção: ação irreversível!</p>
          <p className="text-sm text-red-700">
            Todas as Ordens de Serviço (abertas e fechadas) serão <b>permanentemente deletadas</b>.
            Os dados não podem ser recuperados após esta operação.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Digite <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-red-600">LIMPAR</span> para confirmar:
          </label>
          <Input
            placeholder="LIMPAR"
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="font-mono"
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            disabled={confirmText !== 'LIMPAR' || loading}
            onClick={handleClear}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            {loading ? 'Limpando...' : 'Limpar Tudo'}
          </Button>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'Administrativo' },
  { value: 'logistics', label: 'Logística' },
  { value: 'driver', label: 'Motorista' },
  { value: 'warehouse', label: 'Armazém' },
  { value: 'commercial', label: 'Comercial' },
  { value: 'maintenance_commercial', label: 'Manutenção — Comercial' },
  { value: 'maintenance_admin', label: 'Manutenção — Administrativo' },
  { value: 'maintenance_technician', label: 'Manutenção — Técnico' },
  { value: 'gerenciais', label: 'Gerenciais' },
  { value: 'renovams', label: 'RenovaMS — Gestor (123)' },
  { value: 'renovams_vendor', label: 'RenovaMS — Setor Vendedor (101-506)' },
  { value: 'loan_comercial', label: 'Materiais PDV — Comercial' },
  { value: 'loan_analista', label: 'Materiais PDV — Analista' },
  { value: 'loan_vendedor', label: 'Materiais PDV — Vendedor' },
  { value: 'loan_armazem', label: 'Materiais PDV — Armazém' },
  { value: 'loan_logistica', label: 'Materiais PDV — Logística' },
];

// Módulos que usam revenda (multi-revenda)
const REVENDA_ROLES = ['admin', 'logistics', 'driver', 'warehouse', 'commercial'];
const REVENDAS = ['MS Paulo Afonso', 'MS Delmiro Gouveia'];

export default function AccessCodeManager() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [role, setRole] = useState('admin');
  const [revenda, setRevenda] = useState('');
  const [editingId, setEditingId] = useState(null);

  const { data: codes = [] } = useQuery({
    queryKey: ['access-codes'],
    queryFn: () => base44.entities.AccessCode.list('-created_date', 100),
  });

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      alert('Preencha todos os campos');
      return;
    }

    try {
      const data = { name, code, role, revenda: REVENDA_ROLES.includes(role) ? (revenda || '') : '' };
      if (editingId) {
        await base44.entities.AccessCode.update(editingId, data);
        setEditingId(null);
      } else {
        await base44.entities.AccessCode.create(data);
      }
      setName('');
      setCode('');
      setRole('admin');
      setRevenda('');
      queryClient.invalidateQueries({ queryKey: ['access-codes'] });
    } catch (err) {
      alert('Erro ao salvar código de acesso');
    }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setName(item.name);
    setCode(item.code);
    setRole(item.role);
    setRevenda(item.revenda || '');
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja deletar este código?')) return;
    try {
      await base44.entities.AccessCode.delete(id);
      queryClient.invalidateQueries({ queryKey: ['access-codes'] });
    } catch (err) {
      alert('Erro ao deletar código de acesso');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setName('');
    setCode('');
    setRole('admin');
    setRevenda('');
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">
            {editingId ? 'Editar Código' : 'Novo Código de Acesso'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nome do Operador
              </label>
              <Input
                placeholder="Digite o nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Código de Acesso
              </label>
              <Input
                placeholder="Digite o código"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Cargo
              </label>
              <select
                value={role}
                onChange={(e) => { setRole(e.target.value); setRevenda(''); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {REVENDA_ROLES.includes(role) && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Revenda <span className="text-gray-400 font-normal">(vazio = acesso a todas)</span>
                </label>
                <select
                  value={revenda}
                  onChange={(e) => setRevenda(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Todas as revendas</option>
                  {REVENDAS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={handleSave}>
                <Plus className="w-4 h-4 mr-2" />
                {editingId ? 'Atualizar' : 'Criar'}
              </Button>
              {editingId && (
                <Button variant="outline" className="flex-1" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Lista */}
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4">Códigos Cadastrados</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {codes.length === 0 ? (
              <p className="text-sm text-gray-500">Nenhum código cadastrado</p>
            ) : (
              codes.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{item.name}</p>
                    <div className="flex flex-wrap gap-1.5 text-xs text-gray-500 mt-1">
                      <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {ROLES.find((r) => r.value === item.role)?.label || item.role}
                      </span>
                      {item.revenda && (
                        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                          {item.revenda}
                        </span>
                      )}
                      <span className="font-mono">{item.code}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
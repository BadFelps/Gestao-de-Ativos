import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Trash2, Save, Plus } from 'lucide-react';

const AVAILABLE_PANELS = [
  { key: 'admin', label: 'Administrativo' },
  { key: 'logistics', label: 'Logística' },
  { key: 'driver', label: 'Motorista' },
  { key: 'warehouse', label: 'Armazém' },
  { key: 'commercial', label: 'Comercial' },
  { key: 'renovams', label: 'RenovaMS' },
  { key: 'maintenance', label: 'Manutenção' },
  { key: 'gerenciais', label: 'Gerenciais' }
];

export default function UserAccessManager() {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await base44.auth.me();
        setCurrentUser(me);
        
        const allUsers = await base44.entities.User.list();
        setUsers(allUsers);
      } catch (error) {
        toast.error('Erro ao carregar usuários');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const togglePanel = (userEmail, panelKey) => {
    setUsers(users.map(u => {
      if (u.email === userEmail) {
        const allowed = u.allowed_panels || [];
        const updated = allowed.includes(panelKey)
          ? allowed.filter(p => p !== panelKey)
          : [...allowed, panelKey];
        return { ...u, allowed_panels: updated };
      }
      return u;
    }));
  };

  const saveUserChanges = async (userEmail) => {
    try {
      const user = users.find(u => u.email === userEmail);
      await base44.entities.User.update(user.id, { allowed_panels: user.allowed_panels || [] });
      toast.success('Acessos atualizados com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar acessos');
    }
  };

  const inviteNewUser = async () => {
    if (!newUserEmail) {
      toast.error('Digite um email');
      return;
    }
    try {
      await base44.users.inviteUser(newUserEmail, newUserRole);
      toast.success(`Usuário ${newUserEmail} convidado com sucesso`);
      setNewUserEmail('');
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      toast.error('Erro ao convidar usuário');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Convidar Novo Usuário</CardTitle>
          <CardDescription>Adicione um novo usuário ao sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="usuario@email.com"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </div>
            <div>
              <Label>Papel</Label>
              <select className="w-full px-3 py-2 border rounded-md">
                <option value="user">Usuário</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={inviteNewUser} className="w-full gap-2">
                <Plus className="w-4 h-4" />
                Convidar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-bold">Gerenciar Acessos de Usuários</h2>
        
        {users.map(user => (
          <Card key={user.email}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{user.full_name}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-200 text-slate-800">
                  {user.role === 'admin' ? 'Admin' : 'Usuário'}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AVAILABLE_PANELS.map(panel => (
                  <div key={panel.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`${user.email}-${panel.key}`}
                      checked={(user.allowed_panels || []).includes(panel.key)}
                      onCheckedChange={() => togglePanel(user.email, panel.key)}
                    />
                    <Label htmlFor={`${user.email}-${panel.key}`} className="cursor-pointer">
                      {panel.label}
                    </Label>
                  </div>
                ))}
              </div>
              
              <Button 
                onClick={() => saveUserChanges(user.email)}
                className="w-full gap-2"
              >
                <Save className="w-4 h-4" />
                Salvar Acessos
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
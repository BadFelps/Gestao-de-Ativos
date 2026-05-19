import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mail, User, Shield } from 'lucide-react';
import { POSITIONS, getPanelsForPosition } from '@/lib/positionToPanels';

export default function UserPositionManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await base44.entities.User.list();
      setUsers(allUsers);
    } catch (error) {
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const updateUserPosition = async (userId, newPosition) => {
    try {
      const panels = getPanelsForPosition(newPosition);
      
      await base44.entities.User.update(userId, {
        position: newPosition,
        allowed_panels: panels
      });

      toast.success('Posição atualizada com sucesso');
      loadUsers();
    } catch (error) {
      toast.error('Erro ao atualizar posição');
    }
  };

  const getPositionLabel = (position) => {
    return POSITIONS.find(p => p.key === position)?.label || position || 'Sem posição';
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Carregando usuários...</div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Usuários do Sistema</CardTitle>
          <CardDescription>Atribua posições aos usuários para definir seus acessos automáticamente</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground">Nenhum usuário registrado</p>
          ) : (
            <div className="space-y-3">
              {users.map(user => {
                const position = user.position;
                const panels = getPanelsForPosition(position);
                
                return (
                  <div key={user.id} className="p-4 bg-slate-50 rounded-lg border space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <p className="font-semibold">{user.full_name}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </div>
                      </div>
                      {user.role === 'admin' && (
                        <Badge variant="default" className="gap-1">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground">Posição</label>
                      <Select value={position || ''} onValueChange={(value) => updateUserPosition(user.id, value)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Selecione uma posição" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>Sem posição</SelectItem>
                          {POSITIONS.map(pos => (
                            <SelectItem key={pos.key} value={pos.key}>
                              {pos.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {panels.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Módulos acessíveis</p>
                        <div className="flex flex-wrap gap-2">
                          {panels.map(panel => (
                            <Badge key={panel} variant="outline" className="bg-white">
                              {panel}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
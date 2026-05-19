import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { UserPlus, Users, Shield, User, Bell, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const roleConfig = {
  admin: { label: 'Admin', className: 'bg-purple-100 text-purple-700 border-purple-200', icon: Shield },
  gestor: { label: 'Gestor', className: 'bg-blue-100 text-blue-700 border-blue-200', icon: Users },
  vendedor: { label: 'Vendedor', className: 'bg-green-100 text-green-700 border-green-200', icon: User },
};

export default function RenovaUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('vendedor');
  const [inviting, setInviting] = useState(false);
  const [emailNotif, setEmailNotif] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);
  const [emailsNotif, setEmailsNotif] = useState([]);

  const load = () => { base44.entities.User.list().then(data => { setUsers(data); setLoading(false); }); };
  const loadNotifications = () => { base44.entities.Notification.filter({ panel: 'renovams' }).then(res => setEmailsNotif(res || [])); };

  useEffect(() => { load(); loadNotifications(); }, []);

  const handleSaveNotif = async () => {
    if (!emailNotif.trim()) { toast.error('Informe um e-mail.'); return; }
    if (emailsNotif.some(e => e.user_email === emailNotif.trim())) { toast.error('Este e-mail já está cadastrado.'); return; }
    setSavingNotif(true);
    try {
      const notificationUsers = emailsNotif.map(n => n.user_email);
      if (!notificationUsers.includes(emailNotif.trim())) {
        notificationUsers.push(emailNotif.trim());
      }
      await base44.auth.updateMe({ notification_users: notificationUsers });
      toast.success('E-mail cadastrado com sucesso!');
      setEmailNotif('');
      await loadNotifications();
    } finally {
      setSavingNotif(false);
    }
  };

  const handleRemoveNotif = async (id) => { 
    const updated = emailsNotif.filter(n => n.id !== id).map(n => n.user_email);
    await base44.auth.updateMe({ notification_users: updated }); 
    await loadNotifications(); 
    toast.success('E-mail removido.'); 
  };

  const handleInvite = async () => {
    if (!email.trim()) { toast.error('Informe o e-mail.'); return; }
    setInviting(true);
    await base44.users.inviteUser(email.trim(), role);
    toast.success(`Convite enviado para ${email}`);
    setEmail(''); setRole('vendedor'); setOpen(false); setInviting(false);
    load();
  };

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-foreground">Usuários</h1><p className="text-muted-foreground text-sm mt-1">Gerencie vendedores, gestores e admins</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><UserPlus className="w-4 h-4 mr-2" />Convidar</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" placeholder="usuario@empresa.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Perfil</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="gestor">Gestor</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleInvite} disabled={inviting}>{inviting ? 'Enviando...' : 'Enviar convite'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Card className="border shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Bell className="w-4 h-4" style={{color:'hsl(122,55%,28%)'}} />E-mail de notificação</CardTitle>
          <p className="text-xs text-muted-foreground">Receba um aviso sempre que um vendedor validar um cliente.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input type="email" placeholder="gestor@empresa.com" value={emailNotif} onChange={e => setEmailNotif(e.target.value)} className="flex-1" onKeyDown={e => e.key === 'Enter' && handleSaveNotif()} />
            <Button onClick={handleSaveNotif} disabled={savingNotif}><Save className="w-4 h-4 mr-2" />{savingNotif ? 'Salvando...' : 'Cadastrar'}</Button>
          </div>
          {emailsNotif.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">E-mails cadastrados</p>
              {emailsNotif.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/40 border border-border rounded-lg">
                  <span className="text-sm text-foreground">{item.user_email}</span>
                  <button onClick={() => handleRemoveNotif(item.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <div className="space-y-2">
        {loading ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
        : users.map(u => {
            const r = roleConfig[u.role] || roleConfig.vendedor;
            const Icon = r.icon;
            return (
              <div key={u.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-semibold text-sm shrink-0">{u.full_name?.[0]?.toUpperCase() || u.email?.[0]?.toUpperCase() || 'U'}</div>
                <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{u.full_name || 'Sem nome'}</p><p className="text-xs text-muted-foreground truncate">{u.email}</p></div>
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', r.className)}><Icon className="w-3 h-3" />{r.label}</span>
              </div>
            );
          })}
      </div>
    </div>
  );
}
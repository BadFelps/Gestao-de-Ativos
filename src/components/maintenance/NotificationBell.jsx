import { useState, useRef, useEffect } from 'react';
import { Bell, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const typeConfig = {
  info: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '📢' },
  success: { color: 'bg-green-100 text-green-800 border-green-200', icon: '✅' },
  warning: { color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⚠️' },
  error: { color: 'bg-red-100 text-red-800 border-red-200', icon: '❌' },
};

export default function NotificationBell({ notifications, unreadCount, onMarkAsRead, onDelete }) {
  const [isOpen, setIsOpen] = useState(false);
  const bellRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!bellRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-96 max-h-96 bg-card border rounded-lg shadow-lg z-50 overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-sm">Notificações</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Nenhuma notificação</p>
              </div>
            ) : (
              <div className="space-y-2 p-2">
                {notifications.map(notif => {
                  const config = typeConfig[notif.type] || typeConfig.info;
                  return (
                    <Card
                      key={notif.id}
                      className={`border ${config.color} ${!notif.is_read ? 'font-medium' : 'opacity-75'}`}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-lg shrink-0">{config.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold">{notif.title}</p>
                            <p className="text-xs mt-0.5 line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] mt-1 opacity-70">
                              {new Date(notif.created_date).toLocaleString('pt-BR')}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {!notif.is_read && (
                              <button
                                onClick={() => onMarkAsRead(notif.id)}
                                className="p-1 hover:bg-white/50 rounded transition-colors"
                                title="Marcar como lida"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => onDelete(notif.id)}
                              className="p-1 hover:bg-white/50 rounded transition-colors"
                              title="Deletar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
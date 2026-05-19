import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AppHeader({ operatorName, onLogout }) {
  return (
    <div className="w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">
            Bem-vindo, <span className="font-semibold text-gray-900">{operatorName}</span>
          </span>
          {onLogout && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="gap-2 text-gray-600 hover:text-red-600"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
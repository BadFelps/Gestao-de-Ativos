import { useAccess } from '@/lib/accessContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PanelTop({ panel, title }) {
   const { getSession, logout } = useAccess();
   const navigate = useNavigate();
   const session = getSession(panel);

   const handleLogout = () => {
     logout(panel);
     navigate('/', { replace: true });
   };

   return (
     <div className="bg-white border-b px-6 py-4 flex items-center justify-between">
       <div>
         <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
         {session && (
           <p className="text-sm text-gray-600">
             Operador: {session.operatorName}
             {session.revenda && (
               <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                 {session.revenda}
               </span>
             )}
           </p>
         )}
       </div>
       <div className="flex items-center gap-2">
         {session && (
           <Button variant="destructive" size="sm" onClick={handleLogout}>
             <LogOut className="w-4 h-4" /> Sair
           </Button>
         )}
       </div>
     </div>
   );
}
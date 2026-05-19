import { useLocalAuth, LocalAuthProvider } from '@/lib/LocalAuthContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import TelaLogin from '@/renovams/components/TelaLogin';
import RenovaLayout from '@/renovams/components/Layout';
import RenovaDashboard from '@/renovams/pages/Dashboard';
import RenovaClientes from '@/renovams/pages/Clientes';
import RenovaDetalheCliente from '@/renovams/pages/DetalheCliente';
import RenovaMinhaCarteira from '@/renovams/pages/MinhaCarteira';
import RenovaUsuarios from '@/renovams/pages/Usuarios';
import RenovaProtocolos from '@/renovams/pages/Protocolos';
import RenovaDivergentes from '@/renovams/pages/Divergentes';

function RenovaApp() {
  const { perfil } = useLocalAuth();

  if (!perfil) {
    return <TelaLogin />;
  }
   return (
     <Routes>
       <Route element={<RenovaLayout />}>
        <Route path="dashboard" element={<RenovaDashboard />} />
        <Route path="clientes" element={<RenovaClientes />} />
        <Route path="clientes/:id" element={<RenovaDetalheCliente />} />
        <Route path="minha-carteira" element={<RenovaMinhaCarteira />} />
        <Route path="usuarios" element={<RenovaUsuarios />} />
        <Route path="protocolos" element={<RenovaProtocolos />} />
        <Route path="divergentes" element={<RenovaDivergentes />} />
        <Route index element={<Navigate to={perfil === 'gestor' ? 'dashboard' : 'minha-carteira'} replace />} />
      </Route>
    </Routes>
  );
}

export default function RenovaMS() {
  return (
    <LocalAuthProvider>
      <div className="min-h-screen bg-background">
        <RenovaApp />
      </div>
    </LocalAuthProvider>
  );
}
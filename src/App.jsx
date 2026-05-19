import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AccessProvider } from '@/lib/accessContext.jsx';

import Home from '@/pages/Home';
import AccessPage from '@/pages/AccessPage';
import Admin from '@/pages/Admin';
import Logistics from '@/pages/Logistics';
import Driver from '@/pages/Driver';
import Warehouse from '@/pages/Warehouse';
import Commercial from '@/pages/Commercial.jsx';
import RenovaMS from '@/pages/RenovaMS';
import Maintenance from '@/pages/Maintenance';
import Gerenciais from '@/pages/Gerenciais';
import MaintenanceCommercial from '@/pages/MaintenanceCommercial';
import MaintenanceAdmin from '@/pages/MaintenanceAdmin';
import MaintenanceTechnician from '@/pages/MaintenanceTechnician';
import LoanRequests from '@/pages/LoanRequests';
import LoanLogin from '@/pages/LoanLogin';

function App() {
  return (
    <AccessProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/access/:module" element={<AccessPage />} />
            <Route path="/Admin" element={<Admin />} />
            <Route path="/Logistics" element={<Logistics />} />
            <Route path="/Driver" element={<Driver />} />
            <Route path="/Warehouse" element={<Warehouse />} />
            <Route path="/Commercial" element={<Commercial />} />
            <Route path="/RenovaMS/*" element={<RenovaMS />} />
            <Route path="/Maintenance" element={<Maintenance />} />
            <Route path="/Maintenance/Commercial" element={<MaintenanceCommercial />} />
            <Route path="/Maintenance/Admin" element={<MaintenanceAdmin />} />
            <Route path="/Maintenance/Technician" element={<MaintenanceTechnician />} />
            <Route path="/Gerenciais" element={<Gerenciais />} />
            <Route path="/loans" element={<LoanRequests />} />
            <Route path="/loans/login" element={<LoanLogin />} />
            <Route path="/RenovaMS/*" element={<RenovaMS />} />
            <Route path="*" element={<PageNotFound />} />
          </Routes>
        </Router>
        <Toaster />
        <SonnerToaster position="top-center" richColors />
      </QueryClientProvider>
    </AccessProvider>
  )
}

export default App
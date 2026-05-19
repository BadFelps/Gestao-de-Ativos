import { useState } from 'react';
import { Upload, Database, Lock } from 'lucide-react';
import PanelAccessGate from '@/components/PanelAccessGate';
import PanelTop from '@/components/PanelTop';
import ImportClients from '@/components/admin/ImportClients';
import RenovaImportar from '@/renovams/pages/Importar';
import AccessCodeManager from '@/components/gerenciais/AccessCodeManager';

const TABS = [
  { id: 'access-codes', label: 'Códigos de Acesso', icon: Lock, description: 'Gerencie os códigos de acesso para os módulos do sistema' },
  { id: 'import-clients', label: 'Importar Clientes', icon: Upload, description: 'Importa base de clientes para o Painel Administrativo (Recolhas)' },
  { id: 'import-renova', label: 'Importar Base RenovaMS', icon: Database, description: 'Importa base de clientes para o módulo RenovaMS' },
];

export default function Gerenciais() {
  return (
    <PanelAccessGate panel="gerenciais">
      <GerenciaisContent />
    </PanelAccessGate>
  );
}

function GerenciaisContent() {
   const [activeTab, setActiveTab] = useState('access-codes');
   const active = TABS.find(t => t.id === activeTab);

   return (
     <div className="h-screen bg-background flex flex-col overflow-hidden">
       <PanelTop panel="gerenciais" title="Gerenciais — Acessos e Importação" />

      {/* Tabs */}
      <div className="border-b bg-card px-4 sm:px-6 shrink-0">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-all ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'access-codes' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <AccessCodeManager />
          </div>
        )}
        {activeTab === 'import-clients' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
            <ImportClients />
          </div>
        )}
        {activeTab === 'import-renova' && (
          <RenovaImportar />
        )}
      </div>
    </div>
  );
}
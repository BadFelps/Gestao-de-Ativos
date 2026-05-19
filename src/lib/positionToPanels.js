// Mapeamento de posições para módulos acessíveis
export const POSITION_TO_PANELS = {
  supervisor_logistica: ['logistics', 'Home'],
  motorista: ['driver', 'Home'],
  operador_armazem: ['warehouse', 'Home'],
  admin_recolhas: ['admin', 'Home'],
  operador_comercial: ['commercial', 'Home'],
  admin_geral: ['admin', 'logistics', 'driver', 'warehouse', 'commercial', 'gerenciais', 'Home'],
  tecnico_manutencao: ['maintenance', 'Home'],
  supervisor_manutencao: ['maintenance', 'Home'],
  admin_manutencao: ['maintenance', 'Home']
};

export const POSITIONS = [
  { key: 'supervisor_logistica', label: 'Supervisor Logística' },
  { key: 'motorista', label: 'Motorista' },
  { key: 'operador_armazem', label: 'Operador de Armazém' },
  { key: 'admin_recolhas', label: 'Administrativo (Recolhas)' },
  { key: 'operador_comercial', label: 'Operador Comercial' },
  { key: 'admin_geral', label: 'Administrador Geral' },
  { key: 'tecnico_manutencao', label: 'Técnico de Manutenção' },
  { key: 'supervisor_manutencao', label: 'Supervisor de Manutenção' },
  { key: 'admin_manutencao', label: 'Admin de Manutenção' }
];

export const getPanelsForPosition = (position) => {
  return POSITION_TO_PANELS[position] || [];
};
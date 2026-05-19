import { BookOpen, Info } from 'lucide-react';

function Section({ title, icon, children }) {
  return (
    <div className="bg-card rounded-2xl border p-5 space-y-3">
      <div className="flex items-center gap-2 border-b pb-3">
        <span className="text-lg">{icon}</span>
        <h3 className="font-bold text-foreground text-base">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Item({ label, desc, badge, badgeColor = 'bg-slate-100 text-slate-700' }) {
  return (
    <div className="flex items-start gap-3">
      {badge && (
        <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full border mt-0.5 ${badgeColor}`}>
          {badge}
        </span>
      )}
      <div>
        {label && <p className="text-sm font-semibold text-foreground">{label}</p>}
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

const MANUALS = {
  admin: {
    title: 'Manual — Painel Administrativo',
    sections: [
      {
        title: 'Visão Geral', icon: '📋',
        items: [
          { desc: 'O Painel Administrativo é o ponto de entrada do processo. Aqui você cria as Ordens de Serviço (OS) que serão executadas pela logística, motoristas e armazém.' },
        ],
      },
      {
        title: 'Abas do Painel', icon: '🗂️',
        items: [
          { label: 'Nova OS', desc: 'Crie uma nova Ordem de Serviço preenchendo os dados do cliente e dos ativos a serem recolhidos. O número da OS é gerado automaticamente.' },
          { label: 'Todas as OS', desc: 'Visão Kanban com todas as OS organizadas por status. Permite editar, acompanhar e fechar ordens.' },
          { label: 'Dashboard', desc: 'Métricas e gráficos de desempenho: total de OS, ocorrências, performance por motorista e distribuição de status.' },
          { label: 'Importar Clientes', desc: 'Importe uma planilha Excel com dados de clientes para a base de dados do sistema.' },
          { label: 'Tipos de Ativo', desc: 'Cadastre e gerencie os tipos de ativos e suas marcas disponíveis para seleção nos formulários.' },
          { label: 'Acessos', desc: 'Gerencie os códigos de acesso para cada painel (Logística, Motorista, Armazém, Comercial).' },
        ],
      },
      {
        title: 'Ocorrências Pendentes', icon: '⚠️',
        items: [
          { desc: 'Aparecem no topo como um painel laranja recolhível. Indicam OS que foram concluídas com problemas (porta fechada, cliente recusou, etc.) e precisam de tratativa.' },
          { label: 'Autorizar Retentativa', desc: 'Clique em "Autorizar Retentativa" para reagendar a coleta. Escolha quais ativos serão incluídos na nova tentativa.' },
        ],
      },
      {
        title: 'Divergências no Armazém', icon: '🚨',
        items: [
          { desc: 'Aparecem no topo como painel vermelho recolhível. Indicam ativos recebidos em condição diferente de "Bom" (Danificado ou Sucata) que precisam de registro de tratativa administrativa.' },
        ],
      },
      {
        title: 'Status das OS (Kanban)', icon: '📌',
        items: [
          { badge: 'Aguardando', badgeColor: 'bg-yellow-100 text-yellow-800 border-yellow-200', desc: 'OS criada, aguardando atribuição de motorista pela Logística.' },
          { badge: 'Atribuído', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'Motorista definido, rota programada.' },
          { badge: 'Em Rota', badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200', desc: 'Motorista a caminho do cliente.' },
          { badge: 'No Cliente', badgeColor: 'bg-purple-100 text-purple-800 border-purple-200', desc: 'Motorista chegou ao local.' },
          { badge: 'Concluído', badgeColor: 'bg-green-100 text-green-800 border-green-200', desc: 'Coleta realizada com sucesso, aguardando conferência no armazém.' },
          { badge: 'Com Ocorrência', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Coleta não realizada por algum motivo. Requer tratativa.' },
          { badge: 'Conferido', badgeColor: 'bg-teal-100 text-teal-800 border-teal-200', desc: 'Material conferido no armazém. Pronto para fechar.' },
          { badge: 'Fechado', badgeColor: 'bg-gray-100 text-gray-800 border-gray-200', desc: 'OS encerrada. Processo finalizado.' },
        ],
      },
    ],
  },

  logistics: {
    title: 'Manual — Painel de Logística',
    sections: [
      {
        title: 'Visão Geral', icon: '🚛',
        items: [
          { desc: 'A Torre de Controle é responsável por atribuir motoristas e veículos às OS pendentes, organizar as rotas do dia e acompanhar o andamento das entregas em tempo real.' },
        ],
      },
      {
        title: 'Abas do Painel', icon: '🗂️',
        items: [
          { label: 'Atribuir', desc: 'Lista todas as OS com status "Aguardando". Para cada OS, defina o motorista, veículo e data da rota. Confirme para mudar o status para "Atribuído".' },
          { label: 'Resumo da Rota', desc: 'Visão consolidada por motorista e data: quais OS estão no roteiro, endereços e status de cada parada.' },
          { label: 'Visão Geral', desc: 'Funil completo de todas as OS com filtro por status e busca por cliente, OS ou motorista.' },
        ],
      },
      {
        title: 'Como Atribuir uma OS', icon: '✏️',
        items: [
          { label: 'Passo 1', desc: 'Na aba "Atribuir", localize a OS desejada.' },
          { label: 'Passo 2', desc: 'Preencha o nome do motorista, placa/veículo e a data prevista da rota.' },
          { label: 'Passo 3', desc: 'Clique em "Salvar". A OS passará para status "Atribuído" e aparecerá na rota do motorista.' },
        ],
      },
      {
        title: 'Ocorrências na Atribuição', icon: '⚠️',
        items: [
          { desc: 'OS com ocorrências aparecem em destaque laranja no topo da aba "Atribuir". Elas aguardam autorização de retentativa pelo Administrativo antes de serem reagendadas.' },
        ],
      },
      {
        title: 'Atualização Automática', icon: '🔄',
        items: [
          { desc: 'O painel atualiza automaticamente a cada 15 segundos. Use o botão "Atualizar" para forçar uma atualização imediata.' },
        ],
      },
    ],
  },

  driver: {
    title: 'Manual — Painel do Motorista',
    sections: [
      {
        title: 'Visão Geral', icon: '📍',
        items: [
          { desc: 'O Painel do Motorista mostra apenas as OS atribuídas a você. Aqui você realiza o check-in no cliente, registra fotos, assina a conclusão e reporta ocorrências.' },
        ],
      },
      {
        title: 'Resumo de Tarefas', icon: '📊',
        items: [
          { badge: 'Ativas', badgeColor: 'bg-blue-100 text-blue-800 border-blue-200', desc: 'OS atribuídas a você para o dia selecionado, ainda não finalizadas.' },
          { badge: 'Feitas', badgeColor: 'bg-green-100 text-green-800 border-green-200', desc: 'OS que você já concluiu (com ou sem ocorrência).' },
          { badge: 'Ocorrências', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Quantas OS foram registradas com problema.' },
        ],
      },
      {
        title: 'Fluxo de Atendimento', icon: '▶️',
        items: [
          { label: 'A Caminho', desc: 'Toque em "A Caminho" para registrar que você saiu em direção ao cliente. O status muda para "Em Rota".' },
          { label: 'Cheguei no Local', desc: 'Toque ao chegar no endereço. O status muda para "No Cliente".' },
          { label: 'Concluir Coleta', desc: 'Registre as fotos dos ativos, adicione observações e assine digitalmente. O status muda para "Concluído".' },
          { label: 'Registrar Ocorrência', desc: 'Caso a coleta não seja possível, selecione o motivo (Porta Fechada, Cliente Recusou, etc.) e adicione detalhes.' },
        ],
      },
      {
        title: 'Filtro de Data', icon: '📅',
        items: [
          { desc: 'Por padrão, o sistema mostra as tarefas de hoje. Use o seletor de data para visualizar rotas de outros dias.' },
        ],
      },
    ],
  },

  warehouse: {
    title: 'Manual — Painel de Armazém',
    sections: [
      {
        title: 'Visão Geral', icon: '🏭',
        items: [
          { desc: 'O Painel de Armazém é responsável pela conferência cega dos materiais recolhidos pelos motoristas. Aqui você valida quantidade, tipo e condição dos ativos recebidos.' },
        ],
      },
      {
        title: 'Abas do Painel', icon: '🗂️',
        items: [
          { label: 'Pendentes', desc: 'OS com status "Concluído" que ainda não foram conferidas. Organizadas por data de rota e motorista.' },
          { label: 'Conferidos', desc: 'OS já conferidas, com checklist, condições registradas e assinaturas.' },
        ],
      },
      {
        title: 'Como Conferir uma OS', icon: '✅',
        items: [
          { label: 'Passo 1', desc: 'Localize a OS na aba "Pendentes". Clique em "Iniciar Conferência".' },
          { label: 'Passo 2 — Contagem Cega', desc: 'Sem ver a OS original, informe o que foi fisicamente recebido: tipo de ativo, quantidade e condição.' },
          { label: 'Passo 3 — Condição', desc: 'Selecione: Bom (íntegro), Danificado (com avaria) ou Sucata (inservível).' },
          { label: 'Passo 4 — Divergência', desc: 'Se houver diferença entre o que foi recolhido e o que a OS previa, marque a divergência e descreva o problema.' },
          { label: 'Passo 5 — Assinaturas', desc: 'Assine como conferente e solicite a assinatura do motorista. Confirme para finalizar.' },
        ],
      },
      {
        title: 'Condições dos Ativos', icon: '🔍',
        items: [
          { badge: 'Bom', badgeColor: 'bg-green-100 text-green-800 border-green-200', desc: 'Ativo em perfeito estado, pronto para reutilização.' },
          { badge: 'Danificado', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Ativo com avaria, precisa de avaliação ou reparo.' },
          { badge: 'Sucata', badgeColor: 'bg-red-100 text-red-800 border-red-200', desc: 'Ativo inservível, deve ser descartado.' },
        ],
      },
    ],
  },

  commercial: {
    title: 'Manual — Painel Comercial',
    sections: [
      {
        title: 'Visão Geral', icon: '📈',
        items: [
          { desc: 'O Painel Comercial permite ao time comercial acompanhar o progresso das OS dos seus clientes, tratar ocorrências de campo e agendar retentativas de coleta.' },
        ],
      },
      {
        title: 'Abas do Painel', icon: '🗂️',
        items: [
          { label: 'Kanban', desc: 'Visão por colunas de status: Aguardando, Atribuído (inclui Em Rota e No Cliente), Concluído, Conferido e Fechado.' },
          { label: 'Ocorrências', desc: 'Lista exclusiva das OS com problemas de campo e divergências no armazém. Principal área de ação do time comercial.' },
        ],
      },
      {
        title: 'Como Tratar uma Ocorrência', icon: '🤝',
        items: [
          { label: 'Passo 1', desc: 'Acesse a aba "Ocorrências". As OS com problema aparecem em destaque laranja.' },
          { label: 'Passo 2', desc: 'Expanda o card da OS para ver o motivo da ocorrência, detalhes e fotos do motorista.' },
          { label: 'Passo 3', desc: 'Adicione um comentário comercial informando a tratativa realizada com o cliente.' },
          { label: 'Passo 4', desc: 'Sugira uma data para nova tentativa de coleta. O Administrativo irá confirmar e autorizar a retentativa.' },
        ],
      },
      {
        title: 'Alertas Visuais', icon: '🔔',
        items: [
          { badge: 'Banner Laranja', badgeColor: 'bg-orange-100 text-orange-800 border-orange-200', desc: 'Aparece quando há ocorrências de campo aguardando tratativa comercial.' },
          { badge: 'Divergências', badgeColor: 'bg-red-100 text-red-800 border-red-200', desc: 'Ativos recebidos em condição ruim no armazém. Requerem resolução administrativa.' },
        ],
      },
      {
        title: 'Atualização Automática', icon: '🔄',
        items: [
          { desc: 'O painel atualiza automaticamente a cada 20 segundos. Use o botão "Atualizar" para forçar uma atualização imediata.' },
        ],
      },
    ],
  },
};

export default function PanelManual({ panel }) {
  const manual = MANUALS[panel];
  if (!manual) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 pb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-bold text-foreground text-lg">{manual.title}</h2>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Info className="w-3 h-3" /> Guia de uso do painel para operadores</p>
        </div>
      </div>

      {manual.sections.map((section, i) => (
        <Section key={i} title={section.title} icon={section.icon}>
          {section.items.map((item, j) => (
            <Item key={j} {...item} />
          ))}
        </Section>
      ))}
    </div>
  );
}
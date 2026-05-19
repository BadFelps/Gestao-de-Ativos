import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const STATUS_MESSAGES = {
  em_orcamento: {
    targetPanel: 'commercial_maintenance',
    title: '📋 Novo Orçamento Enviado',
    body: (req) => `Solicitação #${req.request_number || req.id?.slice(-6)} - ${req.razao_social || req.fantasia || 'Cliente'} aguarda sua aprovação.`,
  },
  aprovado_execucao: {
    targetPanel: 'technician_maintenance',
    title: '✅ Orçamento Aprovado!',
    body: (req) => `Solicitação #${req.request_number || req.id?.slice(-6)} - ${req.razao_social || req.fantasia || 'Cliente'} foi aprovada. Inicie a execução.`,
  },
  cancelado: {
    targetPanel: 'technician_maintenance',
    title: '❌ Orçamento Recusado',
    body: (req) => `Solicitação #${req.request_number || req.id?.slice(-6)} - ${req.razao_social || req.fantasia || 'Cliente'} foi cancelada pelo comercial.`,
  },
  concluido: {
    targetPanel: 'commercial_maintenance',
    title: '🔧 Serviço Concluído',
    body: (req) => `Solicitação #${req.request_number || req.id?.slice(-6)} - ${req.razao_social || req.fantasia || 'Cliente'} foi concluída pelo técnico.`,
  },
  pendente_triagem: {
    targetPanel: 'technician_maintenance',
    title: '🔔 Nova Solicitação de Manutenção',
    body: (req) => `Nova solicitação #${req.request_number || req.id?.slice(-6)} - ${req.razao_social || req.fantasia || 'Cliente'} aguarda atendimento.`,
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;

    if (!data) {
      return Response.json({ success: true, message: 'No data' });
    }

    const newStatus = data.status;
    const oldStatus = old_data?.status;

    // Só notifica se o status realmente mudou
    if (newStatus === oldStatus) {
      return Response.json({ success: true, message: 'Status unchanged' });
    }

    const config = STATUS_MESSAGES[newStatus];
    if (!config) {
      return Response.json({ success: true, message: `No notification config for status: ${newStatus}` });
    }

    // Buscar tokens do painel alvo
    const tokens = await base44.asServiceRole.entities.PushToken.filter({ panel: config.targetPanel });

    if (!tokens || tokens.length === 0) {
      return Response.json({ success: true, message: 'No tokens for panel', panel: config.targetPanel });
    }

    const tokenList = tokens.map(t => t.token).filter(Boolean);

    if (tokenList.length === 0) {
      return Response.json({ success: true, message: 'No valid tokens' });
    }

    // Enviar notificação
    const result = await base44.asServiceRole.functions.invoke('sendPushNotification', {
      tokens: tokenList,
      title: config.title,
      body: config.body(data),
      data: { request_id: data.id || '', status: newStatus },
    });

    return Response.json({ success: true, result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
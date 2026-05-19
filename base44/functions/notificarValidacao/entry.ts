import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { cliente_id, razao_social, fantasia, data_validacao, codigo_vendedor } = await req.json();
  const configs = await base44.asServiceRole.entities.Configuracao.filter({ chave: 'email_notificacao' });
  const emailDestino = configs?.[0]?.valor;
  if (!emailDestino) return Response.json({ ok: false, motivo: 'Email de notificação não configurado.' });
  const nomeCliente = fantasia || razao_social || 'Cliente desconhecido';
  const dataFormatada = data_validacao ? new Date(data_validacao).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR');
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: emailDestino,
    subject: `✅ Cliente validado: ${nomeCliente}`,
    body: `Olá,\n\nO vendedor ${codigo_vendedor || ''} validou o cliente ${nomeCliente} em ${dataFormatada}.\n\nAvance para o processo de renovação e protocolação.\n\n— RenovaMS`,
  });
  return Response.json({ ok: true });
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  // Buscar todos os clientes da base
  const clients = await base44.asServiceRole.entities.ClientBase.list();
  
  // Buscar todas as OSs sem revenda
  const orders = await base44.asServiceRole.entities.ServiceOrder.list();
  
  let updated = 0;
  const batchSize = 100;
  const ordersToUpdate = [];

  // Mapear clientes por código PDV
  const clientMap = {};
  clients.forEach(c => {
    clientMap[c.pdv_code] = c.revenda;
  });

  // Preparar batch de OSs para atualizar
  for (const order of orders) {
    if (!order.revenda && order.client_code && clientMap[order.client_code]) {
      ordersToUpdate.push({
        id: order.id,
        revenda: clientMap[order.client_code]
      });
    }
  }

  // Atualizar em batches
  for (let i = 0; i < ordersToUpdate.length; i += batchSize) {
    const batch = ordersToUpdate.slice(i, i + batchSize);
    for (const item of batch) {
      await base44.asServiceRole.entities.ServiceOrder.update(item.id, { revenda: item.revenda });
      updated++;
    }
  }

  return Response.json({ success: true, updated, total: ordersToUpdate.length });
});
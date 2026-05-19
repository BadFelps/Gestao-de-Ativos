import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  let todos = [];
  let offset = 0;
  const pageSize = 100;

  while (true) {
    const lote = await base44.asServiceRole.entities.Cliente.list('created_date', pageSize, offset);
    if (!lote || lote.length === 0) break;
    todos = todos.concat(lote);
    offset += lote.length;
    if (lote.length < pageSize) break;
  }

  if (todos.length === 0) {
    return Response.json({ success: true, removidos: 0 });
  }

  let removidos = 0;
  for (let i = 0; i < todos.length; i += 10) {
    const batch = todos.slice(i, i + 10);
    await Promise.all(batch.map(c => base44.asServiceRole.entities.Cliente.delete(c.id)));
    removidos += batch.length;
  }

  return Response.json({ success: true, removidos, total: todos.length });
});
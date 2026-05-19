import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ALL_PANELS = [
  'admin',
  'logistics',
  'driver',
  'warehouse',
  'commercial',
  'renovams',
  'maintenance',
  'gerenciais'
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Apenas processar quando um novo User é criado
    if (event?.type !== 'create') {
      return Response.json({ success: true });
    }

    // Se é admin, atribuir todos os painéis automaticamente
    if (data?.role === 'admin' && (!data?.allowed_panels || data.allowed_panels.length === 0)) {
      await base44.asServiceRole.entities.User.update(data.id, {
        allowed_panels: ALL_PANELS
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
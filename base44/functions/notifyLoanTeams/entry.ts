Deno.serve(async (req) => {
  try {
    const { type, request } = await req.json();

    // Seleciona webhook conforme a revenda
    const secretName = request.revenda === 'MS Delmiro'
      ? 'NotifyEmprestimoRecolhasDEL'
      : 'NotifyEmprestimoRecolhas';
    const webhookUrl = Deno.env.get(secretName);
    if (!webhookUrl) return Response.json({ error: `${secretName} not set` }, { status: 500 });

    const isNegada = type === 'negada_comercial' || type === 'negada_analista';

    // Tipo de solicitação em destaque
    const tipoLabel = request.request_type === 'Recolha' ? '🔁 RECOLHA'
      : request.request_type === 'Evento' ? '🎉 EVENTO'
      : '📦 EMPRÉSTIMO FIXO';
    const titleText = isNegada ? `🚫 Solicitação Negada — ${tipoLabel}` : `📋 Nova Solicitação — ${tipoLabel}`;
    const themeColor = isNegada ? 'FF0000'
      : request.request_type === 'Recolha' ? '0EA5E9'
      : request.request_type === 'Evento' ? 'F59E0B'
      : 'FF4500';

    const dateLabel = request.request_type === 'Recolha' ? 'Data de Recolha' : 'Data de Entrega';
    const dateValue = request.loan_date || '—';

    // Monta lista de materiais completa via extra_items ou campo único
    let materiaisText = `${request.asset_type || '—'}${request.asset_brand ? ' · ' + request.asset_brand : ''} × ${request.quantity || 1}`;
    if (request.extra_items) {
      try {
        const extras = JSON.parse(request.extra_items);
        materiaisText = extras.map(it => `${it.asset_type}${it.asset_brand ? ' · ' + it.asset_brand : ''} × ${it.quantity || 1}`).join(', ');
      } catch {}
    }

    // Voltagem (apenas para Refrigerador/Chopeira)
    const needsVoltage = ['Refrigerador Vertical','Refrigerador Horizontal','Chopeira'].some(t => materiaisText.includes(t));

    // Quem negou
    const deniedBy = type === 'negada_comercial'
      ? (request.commercial_decision_by || '—')
      : (request.analista_decision_by || '—');

    const denialReason = type === 'negada_comercial'
      ? request.commercial_denial_reason
      : request.analista_denial_reason;

    const denialRole = type === 'negada_comercial' ? 'Comercial' : 'Analista';

    const facts = [
      { name: '📌 Tipo de Solicitação', value: tipoLabel },
      { name: 'Código PDV', value: request.pdv_code || '—' },
      { name: 'Razão Social', value: request.razao_social || '—' },
      { name: 'Nome Fantasia', value: request.fantasia || '—' },
      { name: 'Material', value: materiaisText },
      ...(needsVoltage && request.voltage ? [{ name: 'Voltagem', value: request.voltage }] : []),
      ...(request.patrimonio ? [{ name: 'Patrimônio', value: request.patrimonio }] : []),
      ...(request.comodato_type ? [{ name: 'Tipo de Comodato', value: request.comodato_type }] : []),
      { name: 'Bairro', value: request.bairro || '—' },
      { name: 'Cidade', value: request.cidade || '—' },
      { name: dateLabel, value: dateValue },
      ...(request.return_date && request.request_type !== 'Recolha' ? [{ name: 'Data de Recolha', value: request.return_date }] : []),
      ...(isNegada ? [{ name: `Negado por (${denialRole})`, value: deniedBy }] : [{ name: 'Solicitado por', value: request.created_by_name || '—' }]),
      ...(isNegada && request.created_by_setor ? [{ name: 'Setor', value: request.created_by_setor }] : []),
    ];

    const body = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      themeColor,
      summary: titleText,
      sections: [
        {
          activityImage: 'https://media.base44.com/images/public/69b984ecbe7402af99e141a5/99d0614e7_9c5566f29_sd.png',
          activityTitle: `**Gestão de Ativos — Grupo MS** | ${tipoLabel}`,
          activitySubtitle: titleText,
          facts,
          ...(isNegada && denialReason ? { text: `**Motivo:** ${denialReason}` } : {}),
        }
      ],
      potentialAction: [
        {
          '@type': 'OpenUri',
          name: 'Acesse o app para mais informações',
          targets: [{ os: 'default', uri: 'https://app.base44.com' }],
        }
      ]
    };

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Teams error: ${text}` }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const APP_URL = 'https://keg-track-hub.base44.app';
const LOGO_URL = 'https://media.base44.com/images/public/69b984ecbe7402af99e141a5/99d0614e7_9c5566f29_sd.png';

function fmtDateTime(d) {
  if (!d) return new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Suporta chamada direta (frontend: { type, data }) e automação entity ({ data, args: { type } })
    const data = payload.data;
    const type = payload.type || payload.args?.type || 'completion';

    const webhookUrl = Deno.env.get('TEAMS_WEBHOOK_URL');
    if (!webhookUrl) {
      return Response.json({ error: 'TEAMS_WEBHOOK_URL not set' }, { status: 500 });
    }

    const pdvCode = data?.pdv_code || 'N/A';
    const razaoSocial = data?.razao_social || '—';
    const fantasia = data?.fantasia || '—';
    const equipment = data?.equipment_description || '—';
    const assetTag = data?.asset_tag || '—';
    const pdfUrl = data?.pdf_url || null;

    let message;

    if (type === 'quote') {
      // Notificação de orçamento concluído pelo Técnico
      const quoteDate = fmtDateTime(data?.quote_date || new Date());
      const quoteValue = data?.quote_value
        ? `R$ ${Number(data.quote_value).toFixed(2).replace('.', ',')}`
        : '—';

      message = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "1A6FBF",
        "summary": `📋 Orçamento Recebido — PDV ${pdvCode}`,
        "sections": [
          {
            "activityTitle": "## 📋 Orçamento da Manutenção Recebido",
            "activitySubtitle": "Gestão de Ativos · Grupo MS",
            "activityImage": LOGO_URL,
            "activityText": `**Ação necessária:** Acesse o app para **aprovar ou recusar** o orçamento.`,
            "facts": [
              { "name": "🏪  PDV", "value": `**${pdvCode}**` },
              { "name": "🏢  Cliente", "value": razaoSocial },
              { "name": "🪧  Fantasia", "value": fantasia },
              { "name": "❄️  Refrigerador", "value": equipment },
              { "name": "🔖  Plaqueta", "value": assetTag },
              { "name": "💰  Valor do Orçamento", "value": `**${quoteValue}**` },
              { "name": "🕐  Data e Hora", "value": quoteDate }
            ],
            "markdown": true
          }
        ],
        "potentialAction": [
          {
            "@type": "OpenUri",
            "name": "🔗 Abrir App — Gestão de Ativos",
            "targets": [{ "os": "default", "uri": APP_URL }]
          }
        ]
      };

    } else {
      // Notificação de manutenção concluída
      const completionDate = fmtDateTime(data?.completion_date || new Date());

      message = {
        "@type": "MessageCard",
        "@context": "http://schema.org/extensions",
        "themeColor": "00A85A",
        "summary": `✅ Manutenção Concluída — PDV ${pdvCode}`,
        "sections": [
          {
            "activityTitle": "## ✅ Manutenção Concluída",
            "activitySubtitle": "Gestão de Ativos · Grupo MS",
            "activityImage": LOGO_URL,
            "activityText": "O serviço foi finalizado pelo técnico. Acesse o app para verificar os detalhes.",
            "facts": [
              { "name": "🏪  PDV", "value": `**${pdvCode}**` },
              { "name": "🏢  Cliente", "value": razaoSocial },
              { "name": "🪧  Fantasia", "value": fantasia },
              { "name": "❄️  Refrigerador", "value": equipment },
              { "name": "🔖  Plaqueta", "value": assetTag },
              { "name": "🕐  Concluído em", "value": completionDate }
            ],
            "markdown": true
          }
        ],
        "potentialAction": [
          {
            "@type": "OpenUri",
            "name": "🔗 Abrir App — Gestão de Ativos",
            "targets": [{ "os": "default", "uri": APP_URL }]
          }
        ]
      };
    }

    const teamsRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    if (!teamsRes.ok) {
      const errText = await teamsRes.text();
      return Response.json({ error: `Teams webhook failed: ${errText}` }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
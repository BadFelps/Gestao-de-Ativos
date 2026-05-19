import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FOLDER_PATH = "Documentos Grupo MS/MS Paulo Afonso/Banco de Dados - Aplicativos/Manutenção de Ativos";

async function graphRequest(accessToken, path, options = {}) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Graph API error: ${res.status} ${text}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { subfolder } = await req.json();

    if (!subfolder) {
      return Response.json({ error: 'subfolder é obrigatório' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    const baseFolderEncoded = FOLDER_PATH.split('/').map(encodeURIComponent).join('/');
    const subfolderEncoded = subfolder.split('/').map(encodeURIComponent).join('/');
    const fullPath = `${baseFolderEncoded}/${subfolderEncoded}`;

    // Busca o item para obter o ID
    const item = await graphRequest(accessToken, `/me/drive/root:/${fullPath}`);

    // Exclui o item pelo ID
    await graphRequest(accessToken, `/me/drive/items/${item.id}`, { method: 'DELETE' });

    return Response.json({ success: true, deleted: subfolder });
  } catch (error) {
    // Se a pasta não existir (404), considera sucesso silencioso
    if (error.message.includes('404')) {
      return Response.json({ success: true, note: 'Pasta não encontrada no OneDrive' });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
});
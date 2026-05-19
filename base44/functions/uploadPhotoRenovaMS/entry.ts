import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Caminho da pasta base no OneDrive para RenovaMS
const BASE_FOLDER = "Documentos Grupo MS/MS Paulo Afonso/Banco de Dados - Aplicativos/RenovaMS";

async function graphRequest(accessToken, path, options = {}) {
  const res = await fetch(`https://graph.microsoft.com/v1.0${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`Graph API error: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function ensureFolder(accessToken, parentFolderEncoded, folderName) {
  try {
    await graphRequest(accessToken, `/me/drive/root:/${parentFolderEncoded}/${encodeURIComponent(folderName)}`, { method: 'GET' });
  } catch {
    // Pasta não existe, cria
    await graphRequest(accessToken, `/me/drive/root:/${parentFolderEncoded}:/children`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        "@microsoft.graph.conflictBehavior": "rename"
      }),
    });
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Usa asServiceRole para não depender de usuário autenticado
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('one_drive');

    const { file_base64, file_name, mime_type, codigo_cliente } = await req.json();

    if (!file_base64 || !file_name || !codigo_cliente) {
      return Response.json({ error: 'file_base64, file_name e codigo_cliente são obrigatórios' }, { status: 400 });
    }

    // Converte base64 para bytes
    const base64Clean = file_base64.replace(/^data:[^;]+;base64,/, '');
    const binaryStr = atob(base64Clean);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const baseFolderEncoded = BASE_FOLDER.split('/').map(encodeURIComponent).join('/');

    // Garante que a pasta do cliente existe dentro de RenovaMS
    await ensureFolder(accessToken, baseFolderEncoded, String(codigo_cliente));

    const clienteFolderEncoded = `${baseFolderEncoded}/${encodeURIComponent(String(codigo_cliente))}`;

    // Upload do arquivo na pasta do cliente
    const uniqueName = `${Date.now()}_${file_name}`;
    const uploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${clienteFolderEncoded}/${encodeURIComponent(uniqueName)}:/content`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': mime_type || 'image/jpeg',
        },
        body: bytes,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Upload falhou: ${uploadRes.status} ${errText}`);
    }

    const uploadedFile = await uploadRes.json();

    let shareUrl = null;
    try {
      const shareRes = await graphRequest(accessToken, `/me/drive/items/${uploadedFile.id}/createLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view', scope: 'organization' }),
      });
      shareUrl = shareRes?.link?.webUrl || null;
    } catch {
      shareUrl = uploadedFile.webUrl || null;
    }

    return Response.json({
      success: true,
      file_id: uploadedFile.id,
      file_name: uploadedFile.name,
      file_url: shareUrl || uploadedFile.webUrl,
    });

  } catch (error) {
    console.error('uploadPhotoRenovaMS error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
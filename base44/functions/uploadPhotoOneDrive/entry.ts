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
    const errText = await res.text();
    throw new Error(`Graph ${options.method || 'GET'} ${path} → ${res.status}: ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function ensureFolder(accessToken, parentEncodedPath, folderName) {
  const fullPath = `${parentEncodedPath}/${encodeURIComponent(folderName)}`;
  try {
    await graphRequest(accessToken, `/me/drive/root:/${fullPath}`, { method: 'GET' });
  } catch {
    // Pasta não existe, cria
    await graphRequest(accessToken, `/me/drive/root:/${parentEncodedPath}:/children`, {
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

    const { file_base64, file_name, mime_type, subfolder } = await req.json();

    if (!file_base64 || !file_name) {
      return Response.json({ error: 'file_base64 e file_name são obrigatórios' }, { status: 400 });
    }

    // Converte base64 para bytes
    const base64Clean = file_base64.replace(/^data:[^;]+;base64,/, '');
    const binaryStr = atob(base64Clean);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const baseFolderEncoded = FOLDER_PATH.split('/').map(encodeURIComponent).join('/');

    // Garante que a subpasta (número da solicitação) existe
    if (subfolder) {
      await ensureFolder(accessToken, baseFolderEncoded, subfolder);
    }

    const targetFolderEncoded = subfolder
      ? `${baseFolderEncoded}/${encodeURIComponent(subfolder)}`
      : baseFolderEncoded;

    // Upload do arquivo
    const uniqueName = `${Date.now()}_${file_name}`;
    const uploadRes = await fetch(
      `https://graph.microsoft.com/v1.0/me/drive/root:/${targetFolderEncoded}/${encodeURIComponent(uniqueName)}:/content`,
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

    // Gera link de compartilhamento
    let shareUrl = uploadedFile.webUrl || null;
    try {
      const shareRes = await graphRequest(accessToken, `/me/drive/items/${uploadedFile.id}/createLink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'view', scope: 'organization' }),
      });
      shareUrl = shareRes?.link?.webUrl || shareUrl;
    } catch {
      // Ignora erro de link, usa webUrl padrão
    }

    return Response.json({
      success: true,
      file_id: uploadedFile.id,
      file_name: uploadedFile.name,
      file_url: shareUrl,
      download_url: uploadedFile['@microsoft.graph.downloadUrl'] || null,
    });

  } catch (error) {
    console.error('uploadPhotoOneDrive error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
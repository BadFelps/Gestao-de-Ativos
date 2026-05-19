import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import * as XLSX from 'npm:xlsx';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { file_url } = await req.json();

  if (!file_url) return Response.json({ error: 'file_url required' }, { status: 400 });

  const res = await fetch(file_url);
  const buffer = await res.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);

  const clients = rows
    .map(row => ({
      pdv_code: String(row['Cód. PDV'] || '').trim(),
      razao_social: String(row['Razão Social'] || '').trim(),
      fantasia: String(row['Fantasia'] || '').trim(),
      address: String(row['End Cli Completo'] || '').trim(),
      bairro: String(row['Bairro'] || '').trim(),
      cidade: String(row['Cidade'] || '').trim(),
      cep: String(row['End Cli CEP'] || '').trim(),
      cnpj: String(row['CNPJ Cli'] || '').trim(),
      setor: String(row['POSSÍVEL SETOR'] || row['SEGMENTAÇÃO SETOR ATUAL'] || '').trim(),
      latitude: String(row['Latitude'] || '').trim(),
      longitude: String(row['Longitude'] || '').trim(),
      vendedor: String(row['VD'] || '').trim(),
      canal: String(row['Canal'] || '').trim(),
      revenda: String(row['Revenda'] || row['REVENDA'] || '').trim(),
    }))
    .filter(c => c.pdv_code && c.pdv_code !== 'undefined');

  let created = 0;
  for (let i = 0; i < clients.length; i += 50) {
    await base44.asServiceRole.entities.ClientBase.bulkCreate(clients.slice(i, i + 50));
    created += Math.min(50, clients.length - i);
  }

  return Response.json({ success: true, created, total: rows.length });
});
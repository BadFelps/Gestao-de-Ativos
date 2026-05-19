import { useState } from 'react';
import { ArrowLeft, Loader2, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR');
}
function fmtMoney(v) {
  return `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
}

// Sem carregamento de imagens — usamos links no PDF

export default function MaintenanceReportGenerator({ request, onClose }) {
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });
      const W = 210;
      const margin = 15;
      const contentW = W - margin * 2;
      let y = 20;

      const lineH = 6;
      const sectionGap = 8;

      const checkPage = (needed = 10) => {
        if (y + needed > 280) { doc.addPage(); y = 20; }
      };

      const drawRect = (x, ry, w, h, r = 2) => {
        doc.roundedRect(x, ry, w, h, r, r, 'F');
      };

      // ---- HEADER ----
      doc.setFillColor(30, 41, 59);
      drawRect(0, 0, W, 28, 0);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Laudo de Manutenção', margin, 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Gerado em: ${fmtDateTime(new Date())}`, margin, 21);
      if (request.request_number) {
        doc.text(`Nº: ${request.request_number}`, W - margin, 21, { align: 'right' });
      }
      y = 38;

      // ---- STATUS BADGE ----
      const statusLabels = {
        concluido: 'Concluído', em_execucao: 'Em Execução', aprovado_execucao: 'Aprovado p/ Execução',
        aguardando_aprovacao: 'Aguard. Aprovação', em_orcamento: 'Em Orçamento',
        pendente_triagem: 'Aguardando Triagem', cancelado: 'Cancelado',
      };
      doc.setFillColor(220, 252, 231);
      drawRect(margin, y - 5, 60, 8);
      doc.setTextColor(21, 128, 61);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(statusLabels[request.status] || request.status, margin + 2, y + 0.5);
      y += sectionGap + 2;

      // ---- Section helper ----
      const section = (title) => {
        checkPage(12);
        doc.setFillColor(241, 245, 249);
        drawRect(margin, y, contentW, 7);
        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text(title, margin + 3, y + 5);
        y += 9;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
      };

      const row = (label, value) => {
        checkPage(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text(label + ':', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        const lines = doc.splitTextToSize(String(value || '—'), contentW - 40);
        doc.text(lines, margin + 38, y);
        y += Math.max(lineH, lines.length * lineH);
      };

      // Insere link clicável de foto no PDF
      const addPhotoLink = (imageUrl, shareUrl, label) => {
        const linkUrl = shareUrl || imageUrl;
        if (!linkUrl) return;
        checkPage(10);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        doc.textWithLink(`📷 ${label || 'Ver foto no OneDrive'}`, margin + 2, y + 4, { url: linkUrl });
        y += 8;
      };

      // ---- DADOS DO CLIENTE ----
      section('Dados do Cliente');
      row('Razão Social', request.razao_social);
      if (request.fantasia) row('Fantasia', request.fantasia);
      row('PDV', request.pdv_code);
      if (request.address) row('Endereço', request.address);
      if (request.contact) row('Contato', request.contact);
      y += sectionGap;

      // ---- EQUIPAMENTO ----
      section('Equipamento');
      if (request.equipment_description) row('Refrigerador', request.equipment_description);
      if (request.asset_tag) row('Plaqueta', request.asset_tag);
      // Foto inicial da solicitação
      if (request.initial_photo_url) {
        addPhotoLink(request.initial_photo_url, request.initial_photo_url, 'Foto no momento da solicitação');
      }
      y += sectionGap;

      // ---- PROBLEMA ----
      section('Problema Reportado');
      checkPage(20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      const problemLines = doc.splitTextToSize(request.problem_description || '—', contentW);
      doc.text(problemLines, margin, y);
      y += problemLines.length * lineH + sectionGap;

      // ---- DATAS ----
      section('Histórico de Datas');
      row('Solicitado em', fmtDate(request.created_date));
      if (request.admin_action_date) row('Triagem em', fmtDate(request.admin_action_date));
      if (request.admin_action_by) row('Triado por', request.admin_action_by);
      if (request.quote_date) row('Orçamento em', fmtDate(request.quote_date));
      if (request.completion_date) row('Concluído em', fmtDate(request.completion_date));
      if (request.technician_name) row('Técnico', request.technician_name);
      y += sectionGap;

      // ---- ORÇAMENTO ----
      if (request.quote_value || (request.quote_items && request.quote_items.length > 0)) {
        section('Orçamento');
        if (request.quote_description) {
          const descLines = doc.splitTextToSize(request.quote_description, contentW);
          doc.text(descLines, margin, y);
          y += descLines.length * lineH + 4;
        }

        const items = request.quote_items || [];
        if (items.length > 0) {
          checkPage(10 + items.length * 7);
          doc.setFillColor(51, 65, 85);
          drawRect(margin, y, contentW, 7);
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text('Item', margin + 2, y + 5);
          doc.text('Qtd', margin + contentW * 0.55, y + 5);
          doc.text('Unitário', margin + contentW * 0.68, y + 5);
          doc.text('Total', margin + contentW * 0.84, y + 5);
          y += 7;

          items.forEach((item, idx) => {
            checkPage(8);
            doc.setFillColor(idx % 2 === 0 ? 248 : 241, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 252 : 249);
            drawRect(margin, y, contentW, 7);
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            const nameLines = doc.splitTextToSize(item.name, contentW * 0.5);
            doc.text(nameLines[0], margin + 2, y + 5);
            doc.text(String(item.quantity), margin + contentW * 0.55, y + 5);
            doc.text(fmtMoney(item.unit_price), margin + contentW * 0.68, y + 5);
            doc.text(fmtMoney(item.total || item.unit_price * item.quantity), margin + contentW * 0.84, y + 5);
            y += 7;
          });

          doc.setFillColor(220, 252, 231);
          drawRect(margin, y, contentW, 8);
          doc.setTextColor(21, 128, 61);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('TOTAL', margin + 2, y + 5.5);
          doc.text(fmtMoney(request.quote_value), margin + contentW - 2, y + 5.5, { align: 'right' });
          y += 8 + sectionGap;
        } else {
          row('Valor Total', fmtMoney(request.quote_value));
          y += sectionGap;
        }
      }

      // ---- DECISÃO COMERCIAL ----
      if (request.commercial_decision) {
        section('Decisão Comercial');
        row('Decisão', request.commercial_decision === 'aprovado' ? 'Aprovado ✓' : 'Cancelado ✗');
        if (request.commercial_decision_by) row('Por', request.commercial_decision_by);
        if (request.commercial_decision_date) row('Data', fmtDate(request.commercial_decision_date));
        y += sectionGap;
      }

      // ---- EXECUÇÃO (com fotos) ----
      const logs = request.execution_logs || [];
      if (logs.length > 0) {
        section(`Registro de Execução (${logs.length} etapas)`);
        for (let i = 0; i < logs.length; i++) {
          const log = logs[i];
          checkPage(14);
          doc.setFillColor(240, 253, 244);
          drawRect(margin, y, contentW, 7);
          doc.setTextColor(21, 128, 61);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text(`${i + 1}. ${log.step_title}`, margin + 2, y + 5);
          doc.setFontSize(8);
          doc.setTextColor(100, 116, 139);
          doc.text(fmtDateTime(log.timestamp), W - margin - 2, y + 5, { align: 'right' });
          y += 7;

          if (log.description) {
            checkPage(8);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            const descLines = doc.splitTextToSize(log.description, contentW - 4);
            doc.text(descLines, margin + 2, y + 4);
            y += descLines.length * 5 + 2;
          }

          if (log.photo_url || log.share_url) {
            addPhotoLink(log.photo_url, log.share_url, `Foto — ${log.step_title}`);
          }
          y += 3;
        }
      }

      // ---- FOOTER ----
      const pageCount = doc.getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFillColor(241, 245, 249);
        drawRect(0, 287, W, 10, 0);
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Documento gerado automaticamente pelo sistema de Manutenção de Ativos', margin, 293);
        doc.text(`Pág. ${p} / ${pageCount}`, W - margin, 293, { align: 'right' });
      }

      const fname = `Laudo_${request.pdv_code || request.id}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
      doc.save(fname);
      toast.success('Laudo gerado com sucesso!');
    } catch (err) {
      toast.error('Erro ao gerar o laudo: ' + err.message);
    }
    setGenerating(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-2xl border shadow-xl w-full max-w-sm p-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="font-bold text-base">Gerar Laudo PDF</h2>
            <p className="text-xs text-muted-foreground">{request.fantasia || request.razao_social}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border space-y-1.5">
          <p className="text-xs font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4" /> O laudo incluirá:
          </p>
          {[
            'Dados do cliente e PDV',
            'Equipamento e plaqueta',
            'Fotos registradas em cada etapa',
            'Histórico de datas e responsáveis',
            request.quote_items?.length ? 'Orçamento detalhado (peças e serviços)' : 'Valor do orçamento',
            'Decisão comercial',
            `Registro de execução (${(request.execution_logs || []).length} etapas)`,
          ].filter(Boolean).map((item, i) => (
            <p key={i} className="text-xs text-slate-600 flex items-center gap-1.5">
              <span className="text-green-500">✓</span> {item}
            </p>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          A geração pode levar alguns segundos enquanto as fotos são carregadas.
        </p>

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1 bg-slate-800 hover:bg-slate-900 text-white gap-2" onClick={generate} disabled={generating}>
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</> : <><Download className="w-4 h-4" /> Baixar PDF</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
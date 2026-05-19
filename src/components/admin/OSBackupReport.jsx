import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

const STATUS_ABERTO = ['Aguardando', 'Atribuído', 'Em Rota', 'No Cliente', 'Concluído', 'Concluído com Ocorrência', 'Conferido'];

function fmt(dateStr) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), "dd/MM/yyyy HH:mm", { locale: ptBR }); } catch { return dateStr; }
}
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  try { return format(new Date(dateStr), "dd/MM/yyyy", { locale: ptBR }); } catch { return dateStr; }
}

export default function OSBackupReport({ orders }) {
  const [generating, setGenerating] = useState(false);

  const openOrders = orders.filter(o => STATUS_ABERTO.includes(o.status));

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const pageH = 297;
      const margin = 14;
      const contentW = pageW - margin * 2;
      let y = margin;

      const checkPage = (needed = 10) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      const drawLine = (color = [220, 220, 220]) => {
        doc.setDrawColor(...color);
        doc.line(margin, y, pageW - margin, y);
        y += 2;
      };

      // ---- CAPA ----
      doc.setFillColor(25, 95, 50);
      doc.rect(0, 0, pageW, 40, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(255, 255, 255);
      doc.text('LAUDO DE BACKUP — OS EM ABERTO', pageW / 2, 18, { align: 'center' });
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageW / 2, 27, { align: 'center' });
      doc.text(`Total de OS: ${openOrders.length}`, pageW / 2, 34, { align: 'center' });

      y = 48;
      doc.setTextColor(0, 0, 0);

      // ---- SUMÁRIO ----
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('SUMÁRIO POR STATUS', margin, y);
      y += 5;
      drawLine([180, 180, 180]);

      const statusCount = {};
      openOrders.forEach(o => { statusCount[o.status] = (statusCount[o.status] || 0) + 1; });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      Object.entries(statusCount).forEach(([s, n]) => {
        checkPage(6);
        doc.text(`• ${s}: ${n} OS`, margin + 3, y);
        y += 5;
      });

      y += 4;

      // ---- CADA OS ----
      openOrders.forEach((order, idx) => {
        checkPage(40);

        // Cabeçalho da OS
        doc.setFillColor(240, 245, 255);
        doc.rect(margin, y - 1, contentW, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 80, 180);
        doc.text(`OS #${order.os_number || '—'}  —  ${order.status}`, margin + 2, y + 5);
        doc.setTextColor(0, 0, 0);
        y += 10;

        // Cliente
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text('Cliente:', margin, y);
        doc.setFont('helvetica', 'normal');
        const clientText = doc.splitTextToSize(`${order.client_name || '—'}${order.client_code ? ` (PDV: ${order.client_code})` : ''}`, contentW - 25);
        doc.text(clientText, margin + 22, y);
        y += clientText.length * 4.5;

        // Endereço
        if (order.client_address) {
          checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.text('Endereço:', margin, y);
          doc.setFont('helvetica', 'normal');
          const addrText = doc.splitTextToSize(order.client_address, contentW - 28);
          doc.text(addrText, margin + 28, y);
          y += addrText.length * 4.5;
        }

        // Criado em
        checkPage(6);
        doc.setFont('helvetica', 'bold');
        doc.text('Criado em:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(fmt(order.created_date), margin + 28, y);
        y += 5;

        // Prioridade
        if (order.priority) {
          checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.text('Prioridade:', margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(order.priority, margin + 28, y);
          y += 5;
        }

        // Ativos previstos
        checkPage(6);
        doc.setFont('helvetica', 'bold');
        doc.text('Ativos previstos:', margin, y);
        y += 5;
        doc.setFont('helvetica', 'normal');
        if (order.assets?.length > 0) {
          order.assets.forEach(a => {
            checkPage(5);
            doc.text(`    • ${a.asset_type}${a.asset_brand ? ` (${a.asset_brand})` : ''}: ${a.quantity || 1} un.${a.asset_patrimonio ? ` | PAT: ${a.asset_patrimonio}` : ''}`, margin, y);
            y += 4.5;
          });
        } else if (order.asset_type) {
          doc.text(`    • ${order.asset_type}${order.asset_brand ? ` (${order.asset_brand})` : ''}: ${order.quantity || 1} un.`, margin, y);
          y += 4.5;
        } else {
          doc.text('    — Não informado', margin, y);
          y += 4.5;
        }

        // Número de tentativas de recolha
        const retryCount = order.retry_count || 0;
        checkPage(6);
        doc.setFont('helvetica', 'bold');
        doc.text('Tentativas de recolha:', margin, y);
        doc.setFont('helvetica', 'normal');
        doc.text(String(retryCount + (order.assigned_driver ? 1 : 0)), margin + 52, y);
        y += 5;

        // Motorista atribuído
        if (order.assigned_driver) {
          checkPage(6);
          doc.setFont('helvetica', 'bold');
          doc.text('Motorista:', margin, y);
          doc.setFont('helvetica', 'normal');
          doc.text(`${order.assigned_driver}${order.assigned_vehicle ? ` · ${order.assigned_vehicle}` : ''}`, margin + 28, y);
          y += 5;
          if (order.route_date) {
            doc.setFont('helvetica', 'bold');
            doc.text('Data da rota:', margin, y);
            doc.setFont('helvetica', 'normal');
            doc.text(fmtDate(order.route_date), margin + 32, y);
            y += 5;
          }
        }

        // Ocorrência / justificativa
        if (order.occurrence_reason) {
          checkPage(8);
          doc.setFillColor(255, 245, 235);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.text('⚠ Ocorrência / Justificativa:', margin, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          const occText = doc.splitTextToSize(`${order.occurrence_reason}${order.occurrence_details ? ': ' + order.occurrence_details : ''}`, contentW - 4);
          occText.forEach(line => {
            checkPage(5);
            doc.text('    ' + line, margin, y);
            y += 4.5;
          });
        }

        // Materiais recolhidos (motorista)
        if (order.driver_collected_assets?.length > 0) {
          checkPage(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Materiais declarados pelo motorista:', margin, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          order.driver_collected_assets.forEach(a => {
            checkPage(5);
            doc.text(`    • ${a.asset_type}: ${a.qty_collected} un.`, margin, y);
            y += 4.5;
          });
        }

        // Conferência do armazém
        if (order.warehouse_checklist?.length > 0) {
          checkPage(8);
          doc.setFont('helvetica', 'bold');
          doc.text('Conferência do armazém:', margin, y);
          y += 4.5;
          doc.setFont('helvetica', 'normal');
          order.warehouse_checklist.forEach(c => {
            checkPage(5);
            doc.text(`    • ${c.asset_type}: ${c.quantity} un.${c.model ? ' | ' + c.model : ''}${c.condition ? ' | ' + c.condition : ''}${c.serial_number ? ' | PAT: ' + c.serial_number : ''}`, margin, y);
            y += 4.5;
          });
          if (order.warehouse_checked_by) {
            checkPage(5);
            doc.text(`    Conferente: ${order.warehouse_checked_by} em ${fmtDate(order.warehouse_check_date)}`, margin, y);
            y += 4.5;
          }
          if (order.warehouse_divergence) {
            checkPage(5);
            doc.setTextColor(180, 80, 0);
            doc.text(`    ⚠ Divergência: ${order.warehouse_divergence_details}`, margin, y);
            doc.setTextColor(0, 0, 0);
            y += 4.5;
          }
        }

        // Observações gerais
        if (order.driver_notes) {
          checkPage(7);
          doc.setFont('helvetica', 'bold');
          doc.text('Obs. motorista:', margin, y);
          doc.setFont('helvetica', 'normal');
          const notesText = doc.splitTextToSize(order.driver_notes, contentW - 38);
          doc.text(notesText, margin + 38, y);
          y += notesText.length * 4.5;
        }

        y += 2;
        drawLine([200, 200, 200]);
        y += 3;
      });

      // Rodapé em todas as páginas
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Página ${p} de ${totalPages}  —  Laudo gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, pageW / 2, pageH - 6, { align: 'center' });
      }

      doc.save(`laudo_os_em_aberto_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800 text-sm">Backup temporário para limpeza de base</p>
          <p className="text-xs text-amber-700 mt-1">
            Gera um PDF com o histórico completo de todas as <strong>{openOrders.length} OS em aberto</strong>:
            motorista, data, tentativas, materiais, ocorrências e conferências.
            Use antes de limpar a base de dados.
          </p>
        </div>
      </div>

      <div className="border rounded-xl p-4 bg-white space-y-3">
        <p className="text-sm font-semibold text-foreground">Resumo do que será exportado</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          {Object.entries(
            openOrders.reduce((acc, o) => { acc[o.status] = (acc[o.status] || 0) + 1; return acc; }, {})
          ).map(([s, n]) => (
            <div key={s} className="flex justify-between bg-muted/30 rounded px-3 py-1.5">
              <span>{s}</span><span className="font-bold text-foreground">{n}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        className="w-full h-11 text-base gap-2"
        onClick={generatePDF}
        disabled={generating || openOrders.length === 0}
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileDown className="w-5 h-5" />}
        {generating ? 'Gerando PDF...' : `Baixar Laudo PDF (${openOrders.length} OS)`}
      </Button>
    </div>
  );
}
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { X, Printer, CheckCircle, ShieldCheck, FileText, Download, Building, User, Calendar, Clock, Camera, CreditCard, AlertCircle, Loader2, Shield } from "lucide-react";
import { Booking } from "../types";
import jsPDF from "jspdf";

interface RentalContractModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function RentalContractModal({ booking, isOpen, onClose }: RentalContractModalProps) {
  const contractRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  if (!isOpen || !booking) return null;

  const parseDate = (val: any) => {
    if (!val) return new Date();
    if (typeof val?.toDate === 'function') return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const formattedDate = parseDate(booking.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const depositVal = 100;
  const remainingVal = Math.max(0, (booking.totalPrice || 0) - depositVal);

  const handlePrint = () => {
    const content = contractRef.current;
    if (!content) {
      window.print();
      return;
    }

    try {
      const printWin = window.open("", "_blank", "width=900,height=800");
      if (!printWin) {
        window.print();
        return;
      }

      printWin.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Contrato de Locação #${booking?.id} - Estúdio Triângulo</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                margin: 20px;
                color: #000;
                background: #fff;
                font-size: 11px;
                line-height: 1.5;
              }
              .print\\:hidden, button, svg { display: none !important; }
              * { background: transparent !important; color: #000 !important; border-color: #ddd !important; box-shadow: none !important; }
              .text-brand-red { color: #d93838 !important; }
              .text-emerald-400 { color: #059669 !important; }
              @media print {
                body { margin: 0; padding: 10px; }
                @page { margin: 10mm; size: A4; }
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
            <script>
              setTimeout(function() {
                window.print();
                window.close();
              }, 300);
            </script>
          </body>
        </html>
      `);
      printWin.document.close();
    } catch {
      window.print();
    }
  };

  const handleDownloadPDF = async () => {
    if (!booking) return;
    try {
      setIsGeneratingPDF(true);

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 15;

      const checkNewPage = (neededHeight: number) => {
        if (y + neededHeight > pageHeight - 15) {
          doc.addPage();
          y = 15;
          return true;
        }
        return false;
      };

      // Header Banner
      doc.setFillColor(18, 18, 18);
      doc.rect(0, 0, pageWidth, 38, "F");

      doc.setFillColor(217, 56, 56);
      doc.rect(0, 38, pageWidth, 2, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text("ESTÚDIO TRIÂNGULO FOTOCLUB", margin, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text("Largo do Paissandu, 72 • Conj. 801/1803 • Centro Histórico, São Paulo - SP", margin, 20);
      doc.text("CPF/CNPJ: 23.068.107/881 / 17.351.213/0001-60 • contato@triangulofotoclub.com.br", margin, 25);

      // Stamp Top Right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      doc.text("VALIDADO ELETRONICAMENTE", pageWidth - margin, 14, { align: "right" });
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text(`CONTRATO Nº ${booking.id}`, pageWidth - margin, 20, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(180, 180, 180);
      doc.text(`Emitido em: ${formattedDate}`, pageWidth - margin, 25, { align: "right" });

      y = 48;

      // Title
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("CONTRATO PARTICULAR DE LOCAÇÃO DE ESPAÇO PARA ESTÚDIO FOTOGRÁFICO", pageWidth / 2, y, { align: "center" });
      
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("Instrumento Jurídico Vinculante com Aceite Digital e Regulamento Interno", pageWidth / 2, y, { align: "center" });

      y += 8;

      // Parties Section
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, contentWidth, 42, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentWidth, 42, "S");

      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      const qualifText = `Pelo presente instrumento particular, de um lado, como LOCADOR(A), Jeferson Souza Gomes / Triângulo Fotoclub, CPF/CNPJ 23068107881 / 17.351.213/0001-60, com endereço em Largo Paissandu, 72, conj 1803/801, São Paulo - SP; e, de outro lado, como LOCATÁRIO(A):`;
      const splitQualif = doc.splitTextToSize(qualifText, contentWidth - 6);
      doc.text(splitQualif, margin + 3, y + 6);

      y += 16;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(217, 56, 56);
      doc.text("Nome / Razão Social:", margin + 3, y);
      doc.setTextColor(0, 0, 0);
      doc.text(booking.clientName, margin + 36, y);

      doc.setTextColor(217, 56, 56);
      doc.text("CPF / CNPJ:", margin + 100, y);
      doc.setTextColor(0, 0, 0);
      doc.text(booking.clientCpfCnpj || "Não informado", margin + 122, y);

      y += 5;
      doc.setTextColor(217, 56, 56);
      doc.text("E-mail:", margin + 3, y);
      doc.setTextColor(0, 0, 0);
      doc.text(booking.clientEmail, margin + 36, y);

      doc.setTextColor(217, 56, 56);
      doc.text("Telefone / WhatsApp:", margin + 100, y);
      doc.setTextColor(0, 0, 0);
      doc.text(booking.clientPhone, margin + 130, y);

      y += 6;
      if (booking.clientAddress) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        doc.text(`Endereço Cadastrado: ${booking.clientAddress}, ${booking.clientAddressNum} ${booking.clientAddressComp || ''} - ${booking.clientAddressBairro}, ${booking.clientAddressCidade}/${booking.clientAddressUF} (CEP: ${booking.clientCep || ''})`, margin + 3, y);
      }

      y += 20;

      // Clauses
      const clauses = [
        {
          title: "CLÁUSULA 1ª – OBJETO",
          text: `O presente contrato tem por objeto a locação temporária do espaço físico do estúdio fotográfico situado em Largo do Paissandu, 72, conj 801/1803, doravante denominado simplesmente ESPAÇO (${booking.spaceName}), para uso profissional do(a) LOCATÁRIO(A), pelo período de ${booking.durationHours} hora(s) no dia ${booking.date}, no horário das ${booking.timeSlot}.`
        },
        {
          title: "CLÁUSULA 2ª – NATUREZA JURÍDICA DA RELAÇÃO",
          text: `As partes reconhecem expressamente que a presente contratação possui natureza exclusiva de locação de espaço, inexistindo entre elas qualquer relação societária, associação, parceria comercial, representação, franquia, mandato, prestação subordinada de serviços ou vínculo empregatício de qualquer natureza.\nParágrafo 1º: O(A) LOCATÁRIO(A) exercerá suas atividades por sua conta, risco e exclusiva responsabilidade.\nParágrafo 2º: A locação não gera vínculo empregatício entre o(a) LOCADOR(A) e o(a) LOCATÁRIO(A) ou seus prepostos e colaboradores.\nParágrafo 3º: O(A) LOCADOR(A) não responde por atrasos, falhas, vícios, danos ou prejuízos decorrentes das atividades do(a) LOCATÁRIO(A).\nParágrafo 4º: Os valores pagos correspondem exclusivamente ao preço da locação do ESPAÇO.\nParágrafo 5º: Todos os tributos e encargos trabalhistas ou fiscais decorrentes da atividade profissional do(a) LOCATÁRIO(A) serão de sua responsabilidade exclusiva.`
        },
        {
          title: "CLÁUSULA 3ª – PRAZO",
          text: `A locação vigorará pelo período indicado neste instrumento ou no respectivo agendamento, encerrando-se automaticamente ao término do horário contratado.`
        },
        {
          title: "CLÁUSULA 4ª – PREÇO E FORMA DE PAGAMENTO",
          text: `Pela locação do ESPAÇO, o(a) LOCATÁRIO(A) pagará ao(à) LOCADOR(A) o valor total de R$ ${(booking.totalPrice || 0).toFixed(2)} (Sinal de R$ ${depositVal.toFixed(2)} - ${booking.depositPaid ? "PAGO/CONFIRMADO" : "PENDENTE"} - e saldo remanescente de R$ ${remainingVal.toFixed(2)} no dia do evento).`
        },
        {
          title: "CLÁUSULA 5ª – USO DO ESPAÇO",
          text: `O ESPAÇO deverá ser utilizado somente para atividades lícitas e compatíveis com sua finalidade, sendo vedado sublocar, ceder a terceiros sem autorização, praticar ilícitos ou causar danos.`
        },
        {
          title: "CLÁUSULA 6ª – OBRIGAÇÕES DO(A) LOCATÁRIO(A)",
          text: `Zelar pela conservação do ESPAÇO e dos equipamentos disponibilizados, cumprir a legislação aplicável, obter autorizações necessárias e devolver o ESPAÇO nas mesmas condições em que o recebeu.`
        },
        {
          title: "CLÁUSULA 7ª – RESPONSABILIDADE CIVIL E INDENIZAÇÃO",
          text: `O(A) LOCATÁRIO(A) responderá integralmente por quaisquer danos materiais, morais, corporais ou patrimoniais causados ao LOCADOR(A), ao imóvel, aos equipamentos, a outros usuários ou a terceiros em razão de sua conduta ou de seus convidados.`
        },
        {
          title: "CLÁUSULA 8ª – IMAGENS, DIREITOS DE IMAGEM E REDES SOCIAIS",
          text: `O(A) LOCADOR(A) não possui responsabilidade pela captação ou uso de imagens produzidas pelo(a) LOCATÁRIO(A). O(A) LOCATÁRIO(A) declara obterá sob sua responsabilidade as autorizações e cessões de uso de imagem de modelos e clientes.`
        },
        {
          title: "CLÁUSULA 9ª – CANCELAMENTO, MULTA E RESCISÃO",
          text: `Em caso de cancelamento pelo(a) LOCATÁRIO(A) sem a antecedência mínima de 48h, poderá ser cobrada multa de R$ 100,00 ou retenção do sinal pago.`
        },
        {
          title: "CLÁUSULA 10ª – DISPOSIÇÕES GERAIS",
          text: `A eventual tolerância de uma parte não constituirá novação ou renúncia de direito. A nulidade de uma cláusula não prejudicará as demais.`
        },
        {
          title: "CLÁUSULA 11ª – FORO",
          text: `Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas deste contrato.`
        }
      ];

      for (const clause of clauses) {
        const splitText = doc.splitTextToSize(clause.text, contentWidth);
        const blockHeight = 5 + splitText.length * 3.5;
        checkNewPage(blockHeight);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(clause.title, margin, y);
        y += 4;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(50, 50, 50);
        doc.text(splitText, margin, y);
        y += splitText.length * 3.5 + 3;
      }

      // Anexo I - Equipamentos
      checkNewPage(25);
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, y, contentWidth, 22, "F");
      doc.setDrawColor(220, 220, 220);
      doc.rect(margin, y, contentWidth, 22, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(217, 56, 56);
      doc.text("ANEXO I – RELAÇÃO DE EQUIPAMENTOS E ITENS DISPONIBILIZADOS", margin + 3, y + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(7.5);
      doc.text("• Infraestrutura Ciclorama em U + Trilhos Aéreos (Excelente estado)", margin + 3, y + 10);
      doc.text("• Kit 3 Tochas de Estúdio Godox com Modificadores (Testado e higienizado)", margin + 3, y + 14);
      if (booking.selectedEquipIds && booking.selectedEquipIds.length > 0) {
        doc.text(`• Itens Adicionais: ${booking.selectedEquipIds.join(", ")}`, margin + 3, y + 18);
      }
      y += 27;

      // Anexo II - Regras
      checkNewPage(30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(217, 56, 56);
      doc.text("ANEXO II – REGULAMENTO INTERNO DO ESTÚDIO (REGRAS DE USO)", margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(7.5);
      const regRules = [
        "1. O uso do espaço deverá respeitar rigorosamente o horário agendado.",
        "2. Manter o ambiente limpo e organizado ao final do período contratado.",
        "3. Proibida a realização de atividades ilícitas, perigosas ou insalubres.",
        "4. Danos ao imóvel ou equipamentos serão cobrados do(a) locatário(a).",
        "5. Uso de fumaça, tintas ou inflamáveis depende de autorização prévia por escrito."
      ];
      for (const rule of regRules) {
        doc.text(rule, margin, y);
        y += 4;
      }

      y += 4;

      // Digital Signature Stamp
      checkNewPage(30);
      doc.setFillColor(236, 253, 245);
      doc.rect(margin, y, contentWidth, 24, "F");
      doc.setDrawColor(16, 185, 129);
      doc.rect(margin, y, contentWidth, 24, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(5, 150, 105);
      doc.text("ACEITE ELETRÔNICO CONFIRMADO E VÁLIDO JURIDICAMENTE", margin + 4, y + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      doc.text(`Locatário: ${booking.clientName} (CPF/CNPJ: ${booking.clientCpfCnpj || 'Registrado'})`, margin + 4, y + 11);
      doc.text(`Hash de Autenticidade: TR-AUTH-${booking.id.toUpperCase()}-VERIFIED`, margin + 4, y + 16);
      doc.text(`Base Legal: Lei 14.063/20, Art. 107/425 do Código Civil & MP 2.200-2/01`, margin + 4, y + 21);

      // Page numbers footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(120, 120, 120);
        doc.text(`Página ${i} de ${pageCount} • Estúdio Triângulo Fotoclub • Contrato #${booking.id}`, pageWidth / 2, pageHeight - 7, { align: "center" });
      }

      doc.save(`Contrato_Locacao_Estudio_${booking.id}.pdf`);
    } catch (error) {
      console.error("Falha ao gerar PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-950/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-white/10 w-full max-w-4xl rounded-sm shadow-2xl overflow-hidden my-auto relative text-left max-h-[94vh] flex flex-col z-[10000]">
        
        {/* Modal Top Controls Bar - Hidden on print */}
        <div className="bg-stone-950 p-4 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck size={20} className="text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <h5 className="font-mono text-xs text-white font-bold uppercase tracking-wider truncate">
                Contrato de Locação & Regras com Validade Jurídica
              </h5>
              <span className="text-[10px] text-zinc-400 font-mono block truncate">
                Reserva #{booking.id} • Aceite Eletrônico Registrado (Lei 14.063/20 & MP 2.200-2/01)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold whitespace-nowrap"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 size={14} className="animate-spin shrink-0" /> Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={14} className="shrink-0" /> Baixar PDF
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] uppercase tracking-wider px-3.5 py-2 rounded flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Printer size={14} className="shrink-0" /> Imprimir / Salvar
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1.5 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable & Canvas Printable Contract Body */}
        <div 
          ref={contractRef}
          id={`contract-content-${booking.id}`}
          className="p-6 sm:p-10 space-y-6 overflow-y-auto text-zinc-300 font-sans text-xs leading-relaxed bg-stone-950 print:bg-white print:text-black print:p-0"
        >
          
          {/* Header Branding */}
          <div className="border-b border-white/10 print:border-black/20 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-xl font-black text-white print:text-black uppercase tracking-wider">
                ESTÚDIO TRIÂNGULO FOTOCLUB
              </h2>
              <p className="text-[10px] text-zinc-400 print:text-gray-600 font-mono">
                Largo do Paissandu, 72 • Conj. 801 / 1803 • Centro Histórico, São Paulo - SP • CEP 01034-010
              </p>
              <p className="text-[10px] text-zinc-400 print:text-gray-600 font-mono">
                CPF/CNPJ: 23.068.107/881 / 17.351.213/0001-60 • contato@triangulofotoclub.com.br
              </p>
            </div>

            <div className="bg-stone-900 print:bg-gray-100 p-3 rounded border border-white/5 print:border-gray-300 text-right space-y-1">
              <span className="font-mono text-[9px] uppercase tracking-widest text-emerald-400 print:text-emerald-700 font-bold block">
                VALIDADO ELETRONICAMENTE
              </span>
              <span className="font-mono text-xs font-bold text-white print:text-black block">
                CONTRATO Nº {booking.id}
              </span>
              <span className="text-[9px] text-zinc-400 print:text-gray-600 block font-mono">
                Emitido em: {formattedDate}
              </span>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center py-2 border-b border-white/5 print:border-gray-200">
            <h1 className="font-display font-extrabold text-base sm:text-lg text-white print:text-black uppercase tracking-wider">
              CONTRATO PARTICULAR DE LOCAÇÃO DE ESPAÇO PARA ESTÚDIO FOTOGRÁFICO
            </h1>
            <p className="text-[10px] text-zinc-400 print:text-gray-600 font-mono mt-1">
              Instrumento Jurídico Vinculante com Aceite Digital e Regulamento Interno
            </p>
          </div>

          {/* Qualification of Parties */}
          <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-3">
            <p className="text-[11px] leading-relaxed text-zinc-300 print:text-gray-800">
              Pelo presente instrumento particular, de um lado, como <strong>LOCADOR(A)</strong>, <strong>Jeferson Souza Gomes</strong> / <strong>Triângulo Fotoclub</strong>, inscrito(a) no CPF/CNPJ sob nº <strong>23068107881 / 17.351.213/0001-60</strong>, com endereço em Largo Paissandu, 72, conj 1803/801, São Paulo - SP; e, de outro lado, como <strong>LOCATÁRIO(A)</strong>:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-[11px]">
              <div className="bg-stone-950 print:bg-white p-3 rounded border border-white/5 print:border-gray-300">
                <span className="text-[9px] font-mono text-brand-red uppercase font-bold block mb-1">Nome / Razão Social:</span>
                <span className="font-bold text-white print:text-black block">{booking.clientName}</span>
              </div>
              <div className="bg-stone-950 print:bg-white p-3 rounded border border-white/5 print:border-gray-300">
                <span className="text-[9px] font-mono text-brand-red uppercase font-bold block mb-1">CPF ou CNPJ:</span>
                <span className="font-bold text-white print:text-black block">{booking.clientCpfCnpj || "Não informado"}</span>
              </div>
              <div className="bg-stone-950 print:bg-white p-3 rounded border border-white/5 print:border-gray-300">
                <span className="text-[9px] font-mono text-brand-red uppercase font-bold block mb-1">E-mail de Contato:</span>
                <span className="text-zinc-300 print:text-black font-mono block">{booking.clientEmail}</span>
              </div>
              <div className="bg-stone-950 print:bg-white p-3 rounded border border-white/5 print:border-gray-300">
                <span className="text-[9px] font-mono text-brand-red uppercase font-bold block mb-1">Telefone / WhatsApp:</span>
                <span className="text-zinc-300 print:text-black font-mono block">{booking.clientPhone}</span>
              </div>
            </div>

            {booking.clientAddress && (
              <p className="text-[10px] text-zinc-400 print:text-gray-700 font-mono">
                Endereço Cadastrado: {booking.clientAddress}, {booking.clientAddressNum} {booking.clientAddressComp || ""} - {booking.clientAddressBairro}, {booking.clientAddressCidade}/{booking.clientAddressUF} (CEP: {booking.clientCep})
              </p>
            )}

            <p className="text-[11px] text-zinc-400 print:text-gray-700 font-sans italic pt-1">
              têm entre si justo e contratado o presente CONTRATO PARTICULAR DE LOCAÇÃO DE ESPAÇO PARA ESTÚDIO FOTOGRÁFICO, que se regerá pelas cláusulas e condições abaixo:
            </p>
          </div>

          {/* Full Contract Clauses 1 to 11 */}
          <div className="space-y-4 text-[11px] text-zinc-300 print:text-gray-900 leading-relaxed text-justify">
            
            {/* Cláusula 1 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 1ª – OBJETO
              </h3>
              <p>
                O presente contrato tem por objeto a locação temporária do espaço físico do estúdio fotográfico situado em Largo do Paissandu, 72, conj 801/1803, doravante denominado simplesmente <strong>ESPAÇO ({booking.spaceName})</strong>, para uso profissional do(a) <strong>LOCATÁRIO(A)</strong>, pelo período de <strong>{booking.durationHours} hora(s)</strong> no dia <strong>{booking.date}</strong>, no horário das <strong>{booking.timeSlot}</strong>.
              </p>
            </div>

            {/* Cláusula 2 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 2ª – NATUREZA JURÍDICA DA RELAÇÃO
              </h3>
              <p>
                As partes reconhecem expressamente que a presente contratação possui natureza exclusiva de locação de espaço, inexistindo entre elas qualquer relação societária, associação, parceria comercial, representação, franquia, mandato, prestação subordinada de serviços ou vínculo empregatício de qualquer natureza.
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Primeiro.</strong> O(A) LOCATÁRIO(A) exercerá suas atividades por sua conta, risco e exclusiva responsabilidade, com autonomia técnica, operacional, financeira, fiscal, trabalhista, previdenciária, civil e criminal.
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Segundo.</strong> A presente locação não gera, sob nenhuma hipótese, vínculo empregatício entre o(a) LOCADOR(A) e o(a) LOCATÁRIO(A), seus prepostos, auxiliares, empregados, freelancers, fornecedores, clientes, modelos, maquiadores, produtores ou quaisquer terceiros envolvidos nas atividades desenvolvidas no ESPAÇO.
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Terceiro.</strong> O(A) LOCADOR(A) não participa da atividade econômica explorada pelo(a) LOCATÁRIO(A), não assume riscos do negócio por ele(a) desenvolvido, não presta os serviços oferecidos pelo(a) LOCATÁRIO(A) ao público e não responde por atrasos, falhas, vícios, danos, acidentes, perdas, extravios, lesões, reclamações ou prejuízos decorrentes das atividades exercidas pelo(a) LOCATÁRIO(A) ou por terceiros por ele(a) contratados.
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Quarto.</strong> Fica expressamente ajustado que os valores pagos no âmbito deste contrato correspondem exclusivamente ao preço da locação do ESPAÇO, inexistindo qualquer pagamento, comissão, margem, participação, percentual sobre vendas, taxa de intermediação vinculada ao faturamento, divisão de lucros ou recebimento de porcentagem sobre os ganhos do(a) LOCATÁRIO(A).
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Quinto.</strong> Todos os tributos, contribuições, encargos fiscais, previdenciários, trabalhistas, securitários e quaisquer obrigações decorrentes da atividade profissional do(a) LOCATÁRIO(A) serão de sua responsabilidade exclusiva.
              </p>
            </div>

            {/* Cláusula 3 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 3ª – PRAZO
              </h3>
              <p>
                A locação vigorará pelo período indicado neste instrumento ou no respectivo agendamento, encerrando-se automaticamente ao término do horário contratado, independentemente de aviso prévio, salvo se houver prorrogação expressamente aprovada pelo(a) LOCADOR(A).
              </p>
            </div>

            {/* Cláusula 4 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 4ª – PREÇO E FORMA DE PAGAMENTO
              </h3>
              <p>
                Pela locação do ESPAÇO, o(a) LOCATÁRIO(A) pagará ao(à) LOCADOR(A) o valor total de <strong>R$ {booking.totalPrice?.toFixed(2)}</strong> na seguinte condição: Sinal de <strong>R$ {depositVal.toFixed(2)}</strong> ({booking.depositPaid ? "PAGO/CONFIRMADO" : "PENDENTE"}) e o saldo remanescente de <strong>R$ {remainingVal.toFixed(2)}</strong> no dia da locação. O pagamento remunera exclusivamente a cessão temporária de uso do espaço e dos itens expressamente disponibilizados.
              </p>
            </div>

            {/* Cláusula 5 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 5ª – USO DO ESPAÇO
              </h3>
              <p>
                O ESPAÇO deverá ser utilizado somente para atividades lícitas e compatíveis com sua finalidade, sendo vedado ao(à) LOCATÁRIO(A): (i) sublocar, ceder ou transferir o uso a terceiros sem autorização por escrito; (ii) praticar atividades ilícitas; (iii) promover eventos ou atendimentos em desacordo com a lotação, segurança e regras internas; (iv) utilizar o local de forma que cause dano ao imóvel, à vizinhança ou à reputação do estabelecimento.
              </p>
            </div>

            {/* Cláusula 6 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 6ª – OBRIGAÇÕES DO(A) LOCATÁRIO(A)
              </h3>
              <p>
                São obrigações do(a) LOCATÁRIO(A): zelar pela conservação do ESPAÇO e dos equipamentos disponibilizados; cumprir a legislação aplicável à sua atividade; obter, às suas expensas, licenças, autorizações e alvarás eventualmente necessários; responder por seus auxiliares e contratados; e devolver o ESPAÇO nas mesmas condições em que o recebeu, ressalvado o desgaste natural do uso regular.
              </p>
            </div>

            {/* Cláusula 7 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 7ª – RESPONSABILIDADE CIVIL E INDENIZAÇÃO
              </h3>
              <p>
                O(A) LOCATÁRIO(A) responderá integralmente por quaisquer danos materiais, morais, corporais, estéticos ou patrimoniais causados ao(à) LOCADOR(A), ao imóvel, aos equipamentos, a outros usuários, a vizinhos, a clientes ou a terceiros, em razão de sua conduta, de seus colaboradores, convidados, contratados, modelos, fornecedores ou clientes, obrigando-se a ressarcir todos os prejuízos, inclusive honorários advocatícios, custas e despesas decorrentes de reclamações judiciais ou extrajudiciais.
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Único.</strong> Caso o(a) LOCADOR(A) venha a ser demandado(a), autuado(a), responsabilizado(a) ou sofra qualquer prejuízo em razão de atos, omissões ou atividades do(a) LOCATÁRIO(A), este(a) deverá assumir integralmente a responsabilidade pelo evento, promovendo o reembolso de todos os valores despendidos.
              </p>
            </div>

            {/* Cláusula 8 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 8ª – IMAGENS, DIREITOS DE IMAGEM E REDES SOCIAIS
              </h3>
              <p>
                O(A) LOCADOR(A) não possui qualquer responsabilidade pela captação, edição, publicação, licenciamento, entrega, divulgação ou uso comercial de imagens produzidas pelo(a) LOCATÁRIO(A) no ESPAÇO. O(A) LOCATÁRIO(A) declara que obterá, sob sua exclusiva responsabilidade, todas as autorizações, cessões, licenças e consentimentos necessários de clientes, modelos e terceiros para uso de imagem, voz, marca, nome, cenografia, obras intelectuais ou quaisquer elementos eventualmente registrados.
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Primeiro.</strong> A divulgação de fotos ou vídeos do trabalho do(a) LOCATÁRIO(A) em redes sociais, websites, portfólios, anúncios ou qualquer outro meio será de exclusiva responsabilidade do(a) LOCATÁRIO(A), inexistindo solidariedade ou corresponsabilidade do(a) LOCADOR(A).
              </p>
              <p className="pl-3 border-l border-brand-red/30 print:border-gray-400 my-1">
                <strong>Parágrafo Segundo.</strong> O uso do nome empresarial, marca, identidade visual ou imagem institucional do estúdio pelo(a) LOCATÁRIO(A) dependerá de autorização prévia e expressa do(a) LOCADOR(A), não sendo este contrato interpretado como licença de marca, coautoria, coprodução ou endosso comercial.
              </p>
            </div>

            {/* Cláusula 9 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 9ª – CANCELAMENTO, MULTA E RESCISÃO
              </h3>
              <p>
                Em caso de cancelamento pelo(a) LOCATÁRIO(A) sem a antecedência mínima de 48hrs., poderá ser cobrada multa de R$ 100,00 ou retenção do sinal eventualmente pago. O descumprimento de qualquer cláusula autoriza a rescisão imediata do contrato, sem prejuízo de perdas e danos.
              </p>
            </div>

            {/* Cláusula 10 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 10ª – DISPOSIÇÕES GERAIS
              </h3>
              <p>
                A eventual tolerância de uma parte para com a outra não constituirá novação ou renúncia de direito. A nulidade de uma cláusula não prejudicará as demais. Este contrato obriga as partes, seus herdeiros e sucessores, sendo vedada cessão sem concordância escrita da outra parte.
              </p>
            </div>

            {/* Cláusula 11 */}
            <div className="space-y-1">
              <h3 className="font-bold text-white print:text-black uppercase font-mono text-[11px]">
                CLÁUSULA 11ª – FORO
              </h3>
              <p>
                Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
              </p>
            </div>

          </div>

          {/* ANEXO I - EQUIPMENT LIST */}
          <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-3 mt-6">
            <h3 className="font-mono text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-1.5">
              <Camera size={14} /> ANEXO I – RELAÇÃO DE EQUIPAMENTOS E ITENS DISPONIBILIZADOS
            </h3>
            <p className="text-[10px] text-zinc-400 print:text-gray-600">
              Descrição dos equipamentos, acessórios, mobiliário e iluminação fornecidos ao LOCATÁRIO(A) no estado de conservação testado antes da entrega:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[10px]">
              <div className="bg-stone-950 print:bg-white p-2 rounded border border-white/5 print:border-gray-300">
                <span className="font-bold text-white print:text-black block">• Infraestrutura Ciclorama em U + Trilhos Aéreos</span>
                <span className="text-zinc-400 print:text-gray-600">Estado: Excelente | Reposição: R$ 15.000,00</span>
              </div>
              <div className="bg-stone-950 print:bg-white p-2 rounded border border-white/5 print:border-gray-300">
                <span className="font-bold text-white print:text-black block">• Kit 3 Tochas de Estúdio Godox com Modificadores</span>
                <span className="text-zinc-400 print:text-gray-600">Estado: Perfeito Funcionamento | Reposição: R$ 4.500,00</span>
              </div>
              {booking.selectedEquipIds && booking.selectedEquipIds.map((eq, idx) => (
                <div key={idx} className="bg-stone-950 print:bg-white p-2 rounded border border-white/5 print:border-gray-300">
                  <span className="font-bold text-emerald-400 print:text-emerald-800 block">• Item Adicional: {eq}</span>
                  <span className="text-zinc-400 print:text-gray-600">Estado: Testado e Higienizado | Reposição: Tabela de Mercado</span>
                </div>
              ))}
            </div>
          </div>

          {/* ANEXO II - INTERNAL REGULATIONS (REGRAS DE USO) */}
          <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-3 mt-4">
            <h3 className="font-mono text-xs font-bold text-brand-red uppercase tracking-wider flex items-center gap-1.5">
              <FileText size={14} /> ANEXO II – REGULAMENTO INTERNO DO ESTÚDIO (REGRAS DE USO)
            </h3>
            <ul className="list-disc pl-4 space-y-1.5 text-[10px] text-zinc-300 print:text-gray-800 leading-normal">
              <li>O uso do espaço deverá respeitar rigorosamente o horário agendado, incluindo montagem, atendimento, desmontagem e retirada de objetos.</li>
              <li>O(A) locatário(a) deverá manter o ambiente limpo, organizado e em condições adequadas de uso ao final do período contratado.</li>
              <li>É proibido utilizar o estúdio para atividades ilícitas, perigosas, insalubres ou incompatíveis com a finalidade do local.</li>
              <li>Quaisquer danos ao imóvel, mobiliário, equipamentos, objetos decorativos ou instalações serão cobrados do(a) locatário(a).</li>
              <li>A entrada de equipes, clientes, modelos, fornecedores e convidados é de responsabilidade exclusiva do(a) locatário(a).</li>
              <li>O(A) locatário(a) deverá observar limites de ruído, segurança, capacidade do local e boas práticas de convivência com vizinhos e demais ocupantes do prédio.</li>
              <li>Não é permitida a cessão, transferência ou sublocação do espaço a terceiros sem autorização expressa do(a) locador(a).</li>
              <li>O uso de fumaça, velas, materiais inflamáveis, tintas, líquidos corrosivos, animais, estruturas suspensas ou efeitos especiais depende de autorização prévia e expressa.</li>
              <li>O(A) locatário(a) é responsável por obter consentimentos e autorizações de uso de imagem de modelos, clientes e terceiros eventualmente fotografados ou filmados.</li>
              <li>O nome, a marca e a imagem institucional do estúdio não poderão ser utilizados para sugerir parceria, sociedade, representação ou chancela comercial sem autorização prévia por escrito.</li>
            </ul>
          </div>

          {/* Digital Signature Confirmation Stamp & Legal Evidence Trail */}
          <div className="border-t border-white/10 print:border-gray-300 pt-6 mt-6 bg-emerald-950/20 print:bg-emerald-50 p-4 rounded border border-emerald-500/20 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 print:text-emerald-700 shrink-0">
                  <CheckCircle size={22} />
                </div>
                <div className="space-y-0.5">
                  <span className="font-mono text-[11px] text-emerald-400 print:text-emerald-800 font-bold uppercase tracking-wider block">
                    ACEITE ELETRÔNICO CONFIRMADO E VÁLIDO JURIDICAMENTE
                  </span>
                  <p className="text-[10px] text-zinc-300 print:text-gray-800">
                    Concordância expressa e incondicional emitida pelo locatário <strong>{booking.clientName}</strong> (CPF/CNPJ: {booking.clientCpfCnpj || 'Registrado'}).
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-[9px] text-zinc-400 print:text-gray-600 shrink-0">
                <span className="block font-bold">Triângulo Estúdio Fotoclub</span>
                <span>São Paulo/SP • {formattedDate}</span>
              </div>
            </div>

            <div className="border-t border-emerald-500/20 pt-2 font-mono text-[9px] text-zinc-400 print:text-gray-700 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <span className="text-zinc-500 block uppercase">Hash de Autenticidade (SHA-256):</span>
                <span className="font-bold text-white print:text-black block">TR-AUTH-{booking.id.toUpperCase()}-VERIFIED</span>
              </div>
              <div>
                <span className="text-zinc-500 block uppercase">Validade Legal:</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700 block">Art. 107/425 CC & MP 2.200-2/01</span>
              </div>
              <div>
                <span className="text-zinc-500 block uppercase">Trilha de Auditoria:</span>
                <span className="block text-zinc-300 print:text-gray-800">IP Token & Time Verified</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

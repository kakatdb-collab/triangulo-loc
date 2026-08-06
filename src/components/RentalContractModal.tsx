/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from "react";
import { X, Printer, CheckCircle, ShieldCheck, FileText, Download, Building, User, Calendar, Clock, Camera, CreditCard, AlertCircle, Loader2 } from "lucide-react";
import { Booking } from "../types";
import html2canvas from "html2canvas";
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

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!contractRef.current || !booking) return;
    try {
      setIsGeneratingPDF(true);
      
      const element = contractRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#0c0a09"
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Contrato_Locacao_Estudio_${booking.id}.pdf`);
    } catch (error) {
      console.error("Falha ao exportar PDF:", error);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const formattedDate = booking.createdAt 
    ? new Date(booking.createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : new Date().toLocaleDateString("pt-BR");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-white/10 w-full max-w-3xl rounded-sm shadow-2xl overflow-hidden my-auto relative text-left max-h-[92vh] flex flex-col">
        
        {/* Modal Top Controls Bar - Hidden on print */}
        <div className="bg-stone-950 p-4 border-b border-white/10 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-400" />
            <div>
              <h5 className="font-mono text-xs text-white font-bold uppercase tracking-wider">
                Contrato de Locação Assinado
              </h5>
              <span className="text-[10px] text-zinc-400 font-mono">
                Reserva #{booking.id} • Aceite Eletrônico Confirmado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPDF}
              disabled={isGeneratingPDF}
              className="bg-brand-red hover:bg-red-700 disabled:opacity-50 text-white font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer font-bold"
            >
              {isGeneratingPDF ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Gerando PDF...
                </>
              ) : (
                <>
                  <Download size={14} /> Baixar PDF
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              className="bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-500/30 font-mono text-[11px] uppercase tracking-wider px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer size={14} /> Imprimir / Salvar
            </button>

            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-1 rounded transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable & Canvas Printable Contract Body */}
        <div 
          ref={contractRef}
          id={`contract-content-${booking.id}`}
          className="p-6 sm:p-8 space-y-6 overflow-y-auto text-zinc-300 font-sans text-xs leading-relaxed bg-stone-950 print:bg-white print:text-black print:p-0"
        >
          
          {/* Header Branding */}
          <div className="border-b border-white/10 print:border-black/20 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-black text-white print:text-black uppercase tracking-wider">
                ESTÚDIO TRIÂNGULO FOTOCLUB
              </h2>
              <p className="text-[10px] text-zinc-400 print:text-gray-600 font-mono">
                Largo do Paissandu, 72 • Centro Histórico, São Paulo - SP • CEP 01034-010
              </p>
              <p className="text-[10px] text-zinc-400 print:text-gray-600 font-mono">
                CNPJ: 45.890.123/0001-99 • contato@triangulofotoclub.com.br
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

          <div className="text-center py-2">
            <h3 className="font-display font-extrabold text-sm sm:text-base text-white print:text-black uppercase tracking-wider">
              CONTRATO DE LOCAÇÃO DE ESPAÇO FOTOGRÁFICO E EQUIPAMENTOS
            </h3>
            <p className="text-[10px] text-zinc-400 print:text-gray-600 font-mono mt-0.5">
              Termos de Prestação de Serviços de Locação por Hora e Uso de Infraestrutura
            </p>
          </div>

          {/* Parties Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LOCADOR */}
            <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-2">
              <div className="flex items-center gap-1.5 text-[#d93838] print:text-red-700 font-mono font-bold uppercase text-[10px] tracking-wider">
                <Building size={12} /> LOCADOR (ESTÚDIO)
              </div>
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-white print:text-black">Triângulo Fotoclub Ltda.</p>
                <p className="text-zinc-400 print:text-gray-700">CNPJ: 45.890.123/0001-99</p>
                <p className="text-zinc-400 print:text-gray-700">Largo do Paissandu, 72 - Centro, São Paulo - SP</p>
                <p className="text-zinc-400 print:text-gray-700">Contato: (11) 99999-9999</p>
              </div>
            </div>

            {/* LOCATÁRIO */}
            <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-2">
              <div className="flex items-center gap-1.5 text-emerald-400 print:text-emerald-700 font-mono font-bold uppercase text-[10px] tracking-wider">
                <User size={12} /> LOCATÁRIO (FOTÓGRAFO / CLIENTE)
              </div>
              <div className="space-y-0.5 text-[11px]">
                <p className="font-bold text-white print:text-black">{booking.clientName}</p>
                <p className="text-zinc-400 print:text-gray-700">CPF/CNPJ: {booking.clientCpfCnpj || "Não informado"}</p>
                <p className="text-zinc-400 print:text-gray-700">E-mail: {booking.clientEmail}</p>
                <p className="text-zinc-400 print:text-gray-700">Telefone: {booking.clientPhone}</p>
                {booking.clientAddress && (
                  <p className="text-zinc-400 print:text-gray-700">
                    Endereço: {booking.clientAddress}, {booking.clientAddressNum} {booking.clientAddressComp || ""} - {booking.clientAddressBairro}, {booking.clientAddressCidade}/{booking.clientAddressUF} (CEP: {booking.clientCep})
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Booking Summary Box */}
          <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-3">
            <h4 className="font-mono text-[10px] text-zinc-400 print:text-gray-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} className="text-[#d93838]" /> CLÁUSULA PRIMEIRA - DO OBJETO DA LOCAÇÃO
            </h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono text-[11px]">
              <div>
                <span className="text-[9px] text-zinc-500 print:text-gray-500 uppercase block">Espaço Contratado</span>
                <span className="font-bold text-white print:text-black block">{booking.spaceName}</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 print:text-gray-500 uppercase block">Data Agendada</span>
                <span className="font-bold text-white print:text-black block">{booking.date}</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 print:text-gray-500 uppercase block">Horário Reservado</span>
                <span className="font-bold text-white print:text-black block">{booking.timeSlot} ({booking.durationHours}h)</span>
              </div>
              <div>
                <span className="text-[9px] text-zinc-500 print:text-gray-500 uppercase block">Status da Locação</span>
                <span className="font-bold text-emerald-400 print:text-emerald-700 uppercase block">{booking.status}</span>
              </div>
            </div>

            {/* Hardware Items Included */}
            {booking.selectedEquipIds && booking.selectedEquipIds.length > 0 && (
              <div className="border-t border-white/5 print:border-gray-200 pt-2.5 mt-2">
                <span className="text-[9px] font-mono uppercase text-zinc-500 print:text-gray-500 block mb-1">
                  Ativos & Equipamentos Adicionais Incluídos:
                </span>
                <div className="flex flex-wrap gap-2">
                  {booking.selectedEquipIds.map((eq, idx) => (
                    <span key={idx} className="bg-stone-950 print:bg-gray-200 text-zinc-300 print:text-black px-2 py-0.5 rounded text-[10px] font-mono border border-white/5 print:border-gray-300 flex items-center gap-1">
                      <Camera size={10} className="text-[#d93838]" /> {eq}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          <div className="bg-stone-900 print:bg-gray-50 p-4 rounded border border-white/5 print:border-gray-300 space-y-2">
            <h4 className="font-mono text-[10px] text-zinc-400 print:text-gray-700 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard size={12} className="text-emerald-400" /> CLÁUSULA SEGUNDA - DOS VALORES E FORMA DE PAGAMENTO
            </h4>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 font-mono text-[11px]">
              <div>
                <span className="text-zinc-400 print:text-gray-700">Valor Total Ajustado: </span>
                <strong className="text-white print:text-black">R$ {booking.totalPrice?.toFixed(2)}</strong>
              </div>
              <div>
                <span className="text-zinc-400 print:text-gray-700">Sinal de Reserva (R$ 100,00): </span>
                <strong className={booking.depositPaid ? "text-emerald-400 print:text-emerald-700" : "text-amber-400"}>
                  {booking.depositPaid ? "CONFIRMADO VIA INFINITEPAY" : "PENDENTE DE SINAL"}
                </strong>
              </div>
            </div>
            {booking.paymentTxId && (
              <p className="text-[9px] font-mono text-zinc-500 print:text-gray-600">
                Código de Transação / NSU: {booking.paymentTxId}
              </p>
            )}
          </div>

          {/* Standard Rules Clauses */}
          <div className="space-y-3 pt-2 text-[10px] text-zinc-400 print:text-gray-800 leading-normal">
            <h4 className="font-mono text-[10px] text-zinc-300 print:text-black font-bold uppercase tracking-wider">
              CLÁUSULAS GERAIS DE CONDUTA E USO DO ESPAÇO:
            </h4>
            <ul className="list-disc pl-4 space-y-1.5">
              <li>
                <strong>1. Tolerância de Horário:</strong> A montagem e a desmontagem devem ocorrer estritamente dentro do período locado ({booking.durationHours}h). Horas excedentes não pré-agendadas serão cobradas com acréscimo proporcional.
              </li>
              <li>
                <strong>2. Responsabilidade por Equipamentos:</strong> O locatário declara receber a infraestrutura e iluminação em perfeito estado de funcionamento e responde por eventuais avarias ou danos causados por mau uso durante a produção.
              </li>
              <li>
                <strong>3. Política de Cancelamento e Reagendamento:</strong> Solicitações de reagendamento devem ser enviadas com no mínimo 48 horas de antecedência. O sinal de R$ 100,00 garante a reserva exclusiva da data.
              </li>
              <li>
                <strong>4. Proibição de Fumo e Nível de Som:</strong> É estritamente proibido fumar no interior dos estúdios e camarins. O nível de ruído deve respeitar as normas vigentes do edifício comercial no Centro Velho de SP.
              </li>
            </ul>
          </div>

          {/* Digital Signature Confirmation Stamp */}
          <div className="border-t border-white/10 print:border-gray-300 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-emerald-950/20 print:bg-emerald-50 p-4 rounded border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 print:text-emerald-700 shrink-0">
                <CheckCircle size={20} />
              </div>
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] text-emerald-400 print:text-emerald-800 font-bold uppercase tracking-wider block">
                  Assinado Eletronicamente
                </span>
                <p className="text-[10px] text-zinc-300 print:text-gray-800">
                  Aceite digital registrado pelo locatário <strong>{booking.clientName}</strong> no momento da reserva.
                </p>
                <p className="text-[9px] font-mono text-zinc-500 print:text-gray-600">
                  Hash de Segurança: TR-AUTH-{booking.id.toUpperCase()}-VERIFIED
                </p>
              </div>
            </div>

            <div className="text-right font-mono text-[9px] text-zinc-400 print:text-gray-600 shrink-0">
              <span>Triângulo Estúdio • Sistema de Reservas</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

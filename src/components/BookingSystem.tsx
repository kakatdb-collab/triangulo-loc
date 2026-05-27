/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Calendar as CalIcon, 
  Clock, 
  Camera, 
  HelpCircle, 
  Sparkles, 
  Check, 
  Trash2, 
  Info, 
  CornerDownRight, 
  CheckCircle,
  TrendingUp,
  CreditCard,
  FileText,
  MessageSquare
} from "lucide-react";
import { jsPDF } from "jspdf";
import { STUDIO_SPACES, EQUIPMENT_LIST } from "../data";
import { StudioSpace, Equipment, Booking } from "../types";

interface BookingSystemProps {
  selectedSpaceId: string;
  setSelectedSpaceId: (spaceId: string) => void;
}

export default function BookingSystem({ selectedSpaceId, setSelectedSpaceId }: BookingSystemProps) {
  // Calendar states
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");
  const [durationHours, setDurationHours] = useState<number>(2); // Default 2 hours
  
  // Equipment states
  const [selectedEquipIds, setSelectedEquipIds] = useState<string[]>([]);
  
  // Client details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [projectNotes, setProjectNotes] = useState("");

  // System states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedBooking, setSubmittedBooking] = useState<Booking | null>(null);
  const [localBookings, setLocalBookings] = useState<Booking[]>([]);
  const [phoneError, setPhoneError] = useState("");
  const [emailError, setEmailError] = useState("");

  // Derived current space selection
  const currentSpace = STUDIO_SPACES.find(s => s.id === selectedSpaceId) || STUDIO_SPACES[0];

  useEffect(() => {
    // Load local bookings on start
    const saved = localStorage.getItem("triangulo_bookings");
    if (saved) {
      try {
        setLocalBookings(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao ler reservas do local storage", e);
      }
    }
  }, []);

  // Sync state back
  const saveBookingsToLocal = (updated: Booking[]) => {
    setLocalBookings(updated);
    localStorage.setItem("triangulo_bookings", JSON.stringify(updated));
  };

  // Generate PDF document for a booking
  const generatePDFOfBooking = (booking: Booking) => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // Header Banner
      doc.setFillColor(17, 17, 17);
      doc.rect(0, 0, 210, 42, "F");

      // Red active indicator strip
      doc.setFillColor(217, 56, 56);
      doc.rect(0, 42, 210, 2, "F");

      // Title
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("ESTUDIO TRIANGULO", 15, 18);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(180, 180, 180);
      doc.text("RECIBO DE SIMULACAO DE RESERVA E PROPOSTA", 15, 26);
      doc.text("Rua Augusta, 1250 - Consolacao - Sao Paulo SP", 15, 31);

      // Metas
      doc.setFontSize(9);
      doc.setTextColor(200, 200, 200);
      doc.setFont("helvetica", "bold");
      doc.text(`Ref: ${booking.id}`, 195, 18, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.text(`Data: ${booking.createdAt}`, 195, 25, { align: "right" });
      doc.text("Status: Pendente", 195, 32, { align: "right" });

      // Client Data Section
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("1. DADOS DO REQUISITANTE", 15, 54);
      
      doc.setDrawColor(217, 56, 56);
      doc.setLineWidth(0.3);
      doc.line(15, 56, 195, 56);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      
      doc.setFont("helvetica", "bold");
      doc.text("Nome Completo:", 15, 64);
      doc.setFont("helvetica", "normal");
      doc.text(booking.clientName, 50, 64);

      doc.setFont("helvetica", "bold");
      doc.text("Telefone / Whats:", 15, 71);
      doc.setFont("helvetica", "normal");
      doc.text(booking.clientPhone, 50, 71);

      doc.setFont("helvetica", "bold");
      doc.text("E-mail de Contato:", 15, 78);
      doc.setFont("helvetica", "normal");
      doc.text(booking.clientEmail, 50, 78);

      if (booking.notes) {
        doc.setFont("helvetica", "bold");
        doc.text("Notas do Projeto:", 15, 85);
        doc.setFont("helvetica", "normal");
        doc.text(booking.notes, 50, 85, { maxWidth: 145 });
      }

      // Booking details section
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("2. DETALHES DO ESPACO & TEMPO", 15, 102);
      
      doc.setDrawColor(217, 56, 56);
      doc.line(15, 104, 195, 104);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      
      doc.text("Espaco Escolhido:", 15, 112);
      doc.setFont("helvetica", "normal");
      doc.text(booking.spaceName, 50, 112);

      doc.setFont("helvetica", "bold");
      doc.text("Data Solicitada:", 15, 119);
      doc.setFont("helvetica", "normal");
      doc.text(booking.date, 50, 119);

      doc.setFont("helvetica", "bold");
      doc.text("Periodo Reserva:", 15, 126);
      doc.setFont("helvetica", "normal");
      doc.text(booking.timeSlot, 50, 126);

      doc.setFont("helvetica", "bold");
      doc.text("Carga Horaria:", 15, 133);
      doc.setFont("helvetica", "normal");
      doc.text(`${booking.durationHours} horas contratadas`, 50, 133);

      // Financial Calculation Block
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("3. DEMONSTRATIVO DE VALORES", 15, 150);
      
      doc.setDrawColor(217, 56, 56);
      doc.line(15, 152, 195, 152);

      // Table panel backgrounds
      doc.setFillColor(248, 248, 248);
      doc.rect(15, 156, 180, 42, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(80, 80, 80);

      // Space Cost Calc
      const spaceObj = STUDIO_SPACES.find(s => s.id === booking.spaceId) || STUDIO_SPACES[0];
      const spaceHourlyRate = spaceObj ? spaceObj.hourlyRate : 100;
      doc.text(`Custo de Locacao do Estudio (${booking.durationHours}h x R$ ${spaceHourlyRate},00)`, 20, 164);
      doc.text(`R$ ${spaceHourlyRate * booking.durationHours},00`, 190, 164, { align: "right" });

      // Discount Row if any
      const discount = getDiscount(booking.durationHours);
      if (discount > 0) {
        doc.setTextColor(217, 56, 56);
        doc.setFont("helvetica", "bold");
        doc.text(`(-) Desconto de Duracao Progressivo`, 20, 171);
        doc.text(`- R$ ${discount},00`, 190, 171, { align: "right" });
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
      }

      // Add-ons / Equipment
      const gearY = discount > 0 ? 178 : 171;
      const equipCost = booking.selectedEquipIds.reduce((sum, id) => {
        const eq = EQUIPMENT_LIST.find(item => item.id === id);
        return sum + (eq ? eq.price : 0);
      }, 0);

      if (booking.selectedEquipIds.length > 0) {
        doc.text(`Adicionais de Hardware / Equipamentos de Elite`, 20, gearY);
        doc.text(`R$ ${equipCost},00`, 190, gearY, { align: "right" });
      } else {
        doc.text(`Adicionais de Hardware / Equipamentos de Elite`, 20, gearY);
        doc.text(`R$ 0,00`, 190, gearY, { align: "right" });
      }

      // Border division in pricing box
      doc.setDrawColor(230, 230, 230);
      doc.line(20, 185, 190, 185);

      // Total Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text("VALOR TOTAL DA SOLICITACAO:", 20, 192);
      
      doc.setTextColor(217, 56, 56);
      doc.setFontSize(13);
      doc.text(`R$ ${booking.totalPrice},00`, 190, 192, { align: "right" });

      // Action and next step guidelines panel at bottom
      doc.setFillColor(245, 245, 245);
      doc.rect(15, 205, 180, 40, "F");

      // Small green confirmation sign mockup
      doc.setFillColor(230, 244, 234);
      doc.rect(15, 242, 180, 8, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 126, 52);
      doc.text("✔ SIMULADOR ATIVO - ENVIE ESTE RESUMO PARA CONCLUIR", 20, 247.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("INSTRUCOES DE PAGAMENTO E AGENDAMENTO FINAL:", 20, 212);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text("1. Este comprovante contem a simulacao exata da locacao com impostos e descontos.", 20, 219);
      doc.text("2. Para validar as faixas de horarios, entre em contato no WhatsApp com a referencia acima.", 20, 225);
      doc.text("3. Um deposito sinal (Via Pix) assegura o bloqueio definitivo da data em nosso painel.", 20, 231);
      doc.text("Contatos: (11) 96195-9349 | kakatdb@gmail.com", 20, 237);

      // PDF branding line
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text("Triangulo Co-working & Studio Fotocentrando - Sao Paulo", 105, 275, { align: "center" });

      doc.save(`Reserva_Triangulo_Ref_${booking.id}.pdf`);
    } catch (err) {
      console.error("Critical error generating PDF:", err);
    }
  };

  // Dispatch message and open Whatsapp
  const sendToWhatsApp = (booking: Booking) => {
    try {
      const equipNames = booking.selectedEquipIds.map(id => {
        const eq = EQUIPMENT_LIST.find(item => item.id === id);
        return eq ? ` - ${eq.name} (R$ ${eq.price},00)` : "";
      }).filter(Boolean).join("\n");

      const text = `Olá, Estúdio Triângulo! Gostaria de confirmar uma reserva com os dados abaixo:\n\n` +
        `*ID da Reserva/Ref:* ${booking.id}\n` +
        `*Cliente:* ${booking.clientName}\n` +
        `*WhatsApp:* ${booking.clientPhone}\n` +
        `*E-mail:* ${booking.clientEmail}\n\n` +
        `*Detalhes:* \n` +
        ` - Espaço: ${booking.spaceName}\n` +
        ` - Data: ${booking.date}\n` +
        ` - Horário: ${booking.timeSlot}\n` +
        ` - Duração: ${booking.durationHours} horas\n\n` +
        (equipNames ? `*Equipamentos de Elite:*\n${equipNames}\n\n` : "") +
        (booking.notes ? `*Anotações do briefing:* ${booking.notes}\n\n` : "") +
        `*Total Estimado:* R$ ${booking.totalPrice},00\n\n` +
        `Gostaria de formalizar o agendamento e acertar o Pix de reserva! Acabei de baixar o PDF do comprovante.`;

      const whatsappUrl = `https://api.whatsapp.com/send/?phone=5511961959349&text=${encodeURIComponent(text)}&type=phone_number&app_absent=0`;
      
      window.open(whatsappUrl, "_blank");
    } catch (e) {
      console.error("Erro ao redirecionar ao Whatsapp", e);
    }
  };

  // Discount builder
  const getDiscount = (hours: number): number => {
    if (hours >= 4 && hours <= 7) {
      return 50;
    } else if (hours >= 8 && hours <= 11) {
      return 100;
    } else if (hours === 12) {
      return 200;
    }
    return 0;
  };

  // Pricing math calculator
  const calculatePricing = () => {
    const discount = getDiscount(durationHours);
    const spaceCost = (currentSpace.hourlyRate * durationHours) - discount;

    // Equipment pricing is flat/daily rate
    const equipCost = selectedEquipIds.reduce((sum, id) => {
      const eq = EQUIPMENT_LIST.find(item => item.id === id);
      return sum + (eq ? eq.price : 0);
    }, 0);

    return {
      space: spaceCost,
      equipment: equipCost,
      total: spaceCost + equipCost
    };
  };

  const pricing = calculatePricing();

  const handleEquipToggle = (id: string) => {
    if (selectedEquipIds.includes(id)) {
      setSelectedEquipIds(selectedEquipIds.filter(item => item !== id));
    } else {
      setSelectedEquipIds([...selectedEquipIds, id]);
    }
  };

  // Available schedules
  const timeSlots = [
    "08:00 - 10:00",
    "10:30 - 12:30",
    "13:00 - 15:00",
    "15:30 - 17:30",
    "18:00 - 20:00",
    "20:30 - 22:30"
  ];

  // Duration shortcuts
  const durationPresets = [
    { label: "2 horas", value: 2 },
    { label: "4h (Meio Período)", value: 4 },
    { label: "8h (Integral)", value: 8 },
    { label: "10 horas", value: 10 }
  ];

  const handlePhoneChange = (val: string) => {
    // Basic formatting for SP/Brazil phones: (XX) XXXXX-XXXX
    const cleaned = val.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 2) {
      formatted = `(${cleaned.substring(0, 2)}) ` + cleaned.substring(2);
    }
    if (cleaned.length > 7) {
      formatted = `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7, 11)}`;
    }
    setClientPhone(formatted);
    setPhoneError("");
  };

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!selectedDate) {
      alert("Por favor, selecione uma data para sua produção.");
      return;
    }
    if (!selectedTimeSlot) {
      alert("Por favor, escolha uma faixa de horário.");
      return;
    }
    if (!validateEmail(clientEmail)) {
      setEmailError("Insira um endereço de e-mail autêntico.");
      return;
    }
    if (clientPhone.replace(/\D/g, "").length < 10) {
      setPhoneError("Insira um número de telefone completo.");
      return;
    }

    setIsSubmitting(true);

    // Simulate sending payload smoothly
    setTimeout(() => {
      const code = `TR-${Math.floor(10000 + Math.random() * 90000)}`;
      const newBooking: Booking = {
        id: code,
        spaceId: currentSpace.id,
        spaceName: currentSpace.name,
        date: selectedDate,
        timeSlot: selectedTimeSlot,
        durationHours: durationHours,
        clientName: clientName,
        clientEmail: clientEmail,
        clientPhone: clientPhone,
        selectedEquipIds: [...selectedEquipIds],
        notes: projectNotes,
        totalPrice: pricing.total,
        status: "Pendente",
        createdAt: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})
      };

      const updated = [newBooking, ...localBookings];
      saveBookingsToLocal(updated);
      setSubmittedBooking(newBooking);
      setIsSubmitting(false);

      // Clean inputs
      setSelectedDate("");
      setSelectedTimeSlot("");
      setSelectedEquipIds([]);
      setClientName("");
      setClientEmail("");
      setClientPhone("");
      setProjectNotes("");

      // Trigger automatic receipt generation & WhatsApp redirect
      generatePDFOfBooking(newBooking);
      sendToWhatsApp(newBooking);
    }, 2000);
  };

  const handleCancelBooking = (id: string) => {
    if (window.confirm(`Tem certeza que deseja cancelar sua reserva ${id}?`)) {
      const filtered = localBookings.filter(b => b.id !== id);
      saveBookingsToLocal(filtered);
    }
  };

  return (
    <section id="reservar" className="py-24 bg-stone-950 text-white relative">
      <div className="absolute inset-0 bg-radial-at-b from-brand-red/5 to-transparent pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header Section */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-1.5 h-1.5 bg-[#d93838] rounded-full animate-ping" />
            <span className="text-brand-red font-mono text-xs uppercase tracking-[0.3em] font-semibold">
              Canal de Agendamentos
            </span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
            Simulador de Locações
          </h2>
          <p className="text-zinc-400 font-sans text-sm font-light leading-relaxed">
            Monte a sua planilha de orçamento e reserve em tempo real com transparência total de gastos. Selecione o período ideal e adicione nosso hardware.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Reservation Calculator Settings Form (8 cols) */}
          <form id="booking-form" onSubmit={handleBookingSubmit} className="lg:col-span-8 bg-stone-900 border border-white/5 p-6 sm:p-8 rounded-sm shadow-xl space-y-8">
            
            {/* Step 1: Space Choice */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs text-brand-red font-bold px-2 py-0.5 bg-brand-red/10 border border-brand-red/20 rounded">01</span>
                <label className="font-display font-medium text-lg uppercase tracking-wider text-stone-200">
                  Selecione o Estúdio
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STUDIO_SPACES.map((space) => (
                  <button
                    type="button"
                    key={space.id}
                    onClick={() => setSelectedSpaceId(space.id)}
                    className={`p-4 rounded-sm border text-left flex flex-col justify-between transition-all duration-300 relative cursor-pointer ${
                      selectedSpaceId === space.id
                        ? "bg-brand-red/5 border-brand-red text-white"
                        : "bg-stone-950 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <div>
                      <span className="font-display font-bold text-sm sm:text-base block mb-1">
                        {space.name}
                      </span>
                      <span className="text-[10px] uppercase font-mono tracking-wider block opacity-70">
                        {space.area} • Até {space.capacity} pessoas
                      </span>
                    </div>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-xs text-zinc-500 font-mono font-light">Valor Base: </span>
                      <span className="text-sm font-mono font-bold text-white">R$ {space.hourlyRate}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">/h</span>
                    </div>

                    {selectedSpaceId === space.id && (
                      <span className="absolute top-3 right-3 bg-brand-red text-white w-4 h-4 rounded-full flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Duration Choice */}
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-brand-red font-bold px-2 py-0.5 bg-brand-red/10 border border-brand-red/20 rounded">02</span>
                  <label className="font-display font-medium text-lg uppercase tracking-wider text-stone-200">
                    Defina o Tempo de Locação
                  </label>
                </div>
                <span className="text-[10px] font-mono bg-stone-950 px-2 py-1 border border-white/5 text-brand-red rounded-sm">
                  💡 Desconto de R$ 50,00 (4-7h), R$ 100,00 (8-11h) e R$ 200,00 (12h)!
                </span>
              </div>

              {/* Slider for precision hours selection */}
              <div className="bg-stone-950 p-4 border border-white/5 rounded-sm mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono text-xs text-zinc-400 font-medium">Quantidade de Horas:</span>
                  <span className="text-lg font-mono font-bold text-brand-red">{durationHours} horas</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={durationHours}
                  onChange={(e) => setDurationHours(parseInt(e.target.value))}
                  className="w-full accent-brand-red bg-stone-900 cursor-pointer h-1 rounded"
                />
                <div className="flex justify-between text-[9px] font-mono text-zinc-500 mt-1">
                  <span>Mínimo 2 horas</span>
                  <span>Meio Período (4h)</span>
                  <span>Período Integral (8h)</span>
                  <span>Máximo 12 horas</span>
                </div>
              </div>

              {/* Quick shortcuts info tags */}
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.value}
                    onClick={() => setDurationHours(preset.value)}
                    className={`px-3 py-1.5 rounded-sm font-mono text-[10px] uppercase tracking-wider transition-colors cursor-pointer ${
                      durationHours === preset.value
                        ? "bg-stone-200 text-[#181818] font-bold"
                        : "bg-stone-950 text-zinc-500 hover:text-white border border-white/5"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Step 3: Equipment Select Add-ons */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs text-brand-red font-bold px-2 py-0.5 bg-brand-red/10 border border-brand-red/20 rounded">03</span>
                <label className="font-display font-medium text-lg uppercase tracking-wider text-stone-200">
                  Adicione Hardware de Elite (Opcional)
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                {EQUIPMENT_LIST.map((equip) => {
                  const isChecked = selectedEquipIds.includes(equip.id);
                  return (
                    <div
                      key={equip.id}
                      onClick={() => handleEquipToggle(equip.id)}
                      className={`p-3.5 rounded-sm border cursor-pointer select-none flex items-start gap-3 transition-all duration-300 ${
                        isChecked
                          ? "bg-brand-red/5 border-[#d93838] text-white"
                          : "bg-stone-950 border-white/5 text-zinc-400 hover:text-zinc-200 hover:border-white/20"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 mt-0.5 ${
                        isChecked ? "bg-brand-red border-brand-red text-white" : "border-zinc-700"
                      }`}>
                        {isChecked && <Check size={10} strokeWidth={3} />}
                      </div>

                      <div className="flex-grow">
                        <div className="flex justify-between items-baseline gap-2">
                          <span className="font-sans font-semibold text-xs text-stone-100 leading-tight">
                            {equip.name}
                          </span>
                          <span className="font-mono text-xs font-bold text-zinc-300 whitespace-nowrap">
                            RSL {equip.price}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500 font-light mt-1 leading-snug">
                          {equip.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Schedule Logistics */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs text-brand-red font-bold px-2 py-0.5 bg-brand-red/10 border border-brand-red/20 rounded">04</span>
                <label className="font-display font-medium text-lg uppercase tracking-wider text-stone-200">
                  Data e Faixa Disponíveis
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Date Input */}
                <div className="sm:col-span-1 bg-stone-950 p-4 border border-white/5 rounded-sm flex flex-col gap-2">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">
                    Escolha o Dia do Ensaio
                  </span>
                  <div className="relative">
                    <input
                      type="date"
                      required
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full bg-stone-900 border border-white/10 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                {/* Slots selectors (sm:col-span-2) */}
                <div className="sm:col-span-2 bg-stone-950 p-4 border border-white/5 rounded-sm">
                  <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block mb-2">
                    Faixa de Início Disponíveis
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {timeSlots.map((slot) => {
                      const isActive = selectedTimeSlot === slot;
                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`py-2 px-1 text-center font-mono text-[10px] rounded border transition-colors cursor-pointer ${
                            isActive
                              ? "bg-brand-red border-brand-red text-white font-bold"
                              : "bg-stone-900 border-white/5 text-zinc-400 hover:text-white hover:border-white/20"
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 5: Personal details form */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs text-brand-red font-bold px-2 py-0.5 bg-brand-red/10 border border-brand-red/20 rounded">05</span>
                <label className="font-display font-medium text-lg uppercase tracking-wider text-stone-200">
                  Seus Dados de Contato
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Amanda Silva"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5 flex justify-between">
                    <span>E-mail</span>
                    {emailError && <span className="text-red-500 normal-case">{emailError}</span>}
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="amanda@exemplo.com"
                    value={clientEmail}
                    onChange={(e) => {
                      setClientEmail(e.target.value);
                      setEmailError("");
                    }}
                    className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5 flex justify-between">
                    <span>WhatsApp / Telefone</span>
                    {phoneError && <span className="text-red-500 normal-case">{phoneError}</span>}
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="(11) 99999-9999"
                    value={clientPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                  Resumo do Projeto / Anotações (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Conte para nós as tochas necessárias, se vai usar água, assistente ou cor específica de fundo..."
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red resize-none"
                />
              </div>
            </div>

          </form>

          {/* Checkout Column Block (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Realtime Live Slip Card */}
            <div className="bg-stone-900 border-2 border-brand-red/30 p-6 rounded-sm shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-brand-red text-white py-1 px-3 text-[9px] font-mono uppercase font-black uppercase rounded-bl shadow tracking-widest">
                PREÇO ESTIMADO
              </div>

              <h3 className="font-display font-medium text-xs font-mono uppercase tracking-[0.2em] text-[#d93838] border-b border-white/5 pb-3 mb-4">
                Recibo do Agendamento
              </h3>

              <div className="space-y-4">
                
                {/* Workspace indicator details */}
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-sm font-bold text-white block">
                      {currentSpace.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Período de locação: {durationHours}h
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs text-white font-bold">
                    R$ {pricing.space}
                  </div>
                </div>

                {/* Display discount tags if preset triggered */}
                {getDiscount(durationHours) > 0 && (
                  <div className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded flex items-center justify-between">
                    <span>✓ Desconto Progressivo Ativo:</span>
                    <span className="font-bold">- R$ {getDiscount(durationHours)},00</span>
                  </div>
                )}

                {/* Equipment add-ons listing and tally */}
                {selectedEquipIds.length > 0 && (
                  <div className="bg-stone-950 p-3 rounded-sm border border-white/5 space-y-2">
                    <span className="text-[10px] font-mono text-[#d93838] uppercase block font-semibold">
                      Hardware Adicionado ({selectedEquipIds.length})
                    </span>
                    {selectedEquipIds.map(id => {
                      const eq = EQUIPMENT_LIST.find(item => item.id === id);
                      if (!eq) return null;
                      return (
                        <div key={id} className="flex justify-between text-[11px] text-zinc-400 font-mono font-light">
                          <span className="truncate pr-4">↳ {eq.name}</span>
                          <span className="text-zinc-300 font-bold shrink-0">RSL {eq.price}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Subtotals & Taxes */}
                <div className="border-t border-white/5 pt-4 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500 font-mono">
                    <span>Setup de Entrada:</span>
                    <span className="text-emerald-500">Incluso</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-500 font-mono">
                    <span>Equipamentos:</span>
                    <span>R$ {pricing.equipment}</span>
                  </div>
                </div>

                {/* Total sum */}
                <div className="border-t border-dashed border-white/10 pt-4 flex justify-between items-end">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 block tracking-widest uppercase">
                      Total Bruto
                    </span>
                    <span className="text-[11px] text-emerald-500 font-mono uppercase block font-medium">
                      Pix 5% Off no Sucesso!
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-mono font-black text-white block leading-none">
                      R$ {pricing.total}
                    </span>
                  </div>
                </div>

              </div>

              {/* Action Button trigger */}
              <div className="mt-6 pt-4 border-t border-white/5">
                <button
                  type="submit"
                  form="booking-form"
                  disabled={isSubmitting}
                  className={`w-full font-mono text-xs uppercase tracking-widest font-bold py-4 rounded-sm transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer active:scale-98 text-white ${
                    isSubmitting 
                      ? "bg-stone-800 border border-white/10" 
                      : "bg-[#d93838] hover:bg-red-700 shadow-lg shadow-[#d93838]/10"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
                      Calculando Vagas...
                    </>
                  ) : (
                    <>
                      <CreditCard size={14} className="animate-pulse" />
                      RESERVAR AGORA
                    </>
                  )}
                </button>
              </div>

            </div>

            {/* My Active Schedules Section (Retains local persistence) */}
            <div className="bg-stone-900 border border-white/10 rounded-sm p-4 sm:p-5">
              <h4 className="font-display font-bold text-xs uppercase tracking-[0.2em] text-zinc-300 border-b border-white/5 pb-2 mb-3 flex items-center justify-between">
                <span>Minhas Reservas Ativas ({localBookings.length})</span>
                {localBookings.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
              </h4>

              {localBookings.length === 0 ? (
                <div className="py-6 text-center text-zinc-500 text-xs font-mono font-light leading-relaxed">
                  Não há locações agendadas neste dispositivo.
                </div>
              ) : (
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {localBookings.map((b) => (
                    <div key={b.id} className="p-3 bg-stone-950 rounded-sm border border-white/5 flex flex-col justify-between hover:border-zinc-700/60 transition-colors">
                      <div className="flex justify-between items-start border-b border-white/5 pb-1.5 mb-2">
                        <div>
                          <span className="font-mono text-[11px] font-bold text-white block">
                            Ref: {b.id}
                          </span>
                          <span className="text-[9px] font-mono text-zinc-500 uppercase">
                            Criado em: {b.createdAt}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono bg-amber-500/10 border border-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-bold uppercase">
                          {b.status}
                        </span>
                      </div>

                      <div className="space-y-1 font-mono text-[10px] text-zinc-400 mb-2">
                        <p className="font-sans text-stone-300 text-xs font-bold truncate">↳ {b.spaceName}</p>
                        <p>Slot: {b.date} • {b.timeSlot}</p>
                        <p>Tempo: {b.durationHours}h | Total: R$ {b.totalPrice}</p>
                      </div>

                      <div className="flex gap-1.5 items-center justify-end">
                        <button
                          type="button"
                          onClick={() => generatePDFOfBooking(b)}
                          title="Baixar Comprovante PDF"
                          className="text-[9px] font-mono text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 p-2 rounded transition-colors border border-white/5 cursor-pointer flex items-center gap-1"
                        >
                          <FileText size={11} />
                          PDF
                        </button>
                        <button
                          type="button"
                          onClick={() => sendToWhatsApp(b)}
                          title="Enviar p/ WhatsApp"
                          className="text-[9px] font-mono text-emerald-500 hover:text-white hover:bg-emerald-600/20 p-2 rounded transition-colors border border-emerald-500/10 cursor-pointer flex items-center gap-1"
                        >
                          <MessageSquare size={11} />
                          Whats
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelBooking(b.id)}
                          className="text-[9px] font-mono text-red-500 hover:text-white hover:bg-red-500/10 p-2 rounded flex items-center gap-1 transition-colors border border-red-500/20 cursor-pointer"
                        >
                          <Trash2 size={11} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Dynamic Success Dialog Modal */}
      <AnimatePresence>
        {submittedBooking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#111] border border-[#d93838]/60 p-6 sm:p-8 rounded-sm max-w-lg w-full text-center relative shadow-2xl shadow-[#d93838]/10"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500 mx-auto mb-6">
                <CheckCircle size={36} className="animate-bounce" />
              </div>

              <span className="font-mono text-xs text-[#d93838] uppercase tracking-widest font-bold">
                Reserva Pré-Confirmada
              </span>
              <h3 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight mt-1 mb-4">
                Pronto para Criar!
              </h3>
              
              <div className="bg-stone-950 p-4 rounded border border-white/5 mb-6 text-left font-mono space-y-2">
                <p className="text-xs text-zinc-300">
                  <span className="text-zinc-500 uppercase block text-[10px] tracking-widest">Código Pix/Referência</span>
                  <span className="text-sm text-white font-bold">{submittedBooking.id}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs border-t border-white/5 pt-2">
                  <div>
                    <span className="text-zinc-500 uppercase text-[9px] block">Estúdio</span>
                    <span className="text-stone-300 truncate font-semibold block">{submittedBooking.spaceName}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 uppercase text-[9px] block">Agendado</span>
                    <span className="text-[#d93838] font-bold block">{submittedBooking.date}</span>
                  </div>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between items-end text-xs">
                  <div>
                    <span className="text-zinc-500 uppercase text-[9px] block">Horário</span>
                    <span className="text-stone-300 block">{submittedBooking.timeSlot}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 uppercase text-[9px] block">Total Bruto</span>
                    <span className="text-sm text-emerald-500 font-bold block">R$ {submittedBooking.totalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Elegant Simulated Payment Gateway Detail (QR CODE mockup) */}
              <div className="bg-white p-4 rounded-sm flex items-center justify-center gap-4 max-w-xs mx-auto mb-6 shadow">
                {/* Visual rendering of custom simulated QR to look premium */}
                <div className="w-20 h-20 bg-stone-100 p-1 rounded border flex flex-wrap items-center justify-center select-none shrink-0 border-stone-200">
                  <div className="grid grid-cols-4 gap-1 w-full h-full">
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-stone-100 rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-stone-100 rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-stone-100 rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-stone-100 rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                    <div className="bg-stone-100 rounded-xs"></div>
                    <div className="bg-black rounded-xs"></div>
                  </div>
                </div>

                <div className="text-left">
                  <span className="font-mono text-[9px] bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded font-bold uppercase block w-fit mb-1">
                    Via Pix Copia e Cola
                  </span>
                  <p className="text-[11px] font-sans text-stone-800 leading-tight">
                    Escaneie ao lado ou transfira para o Pix do clube. Enviamos um recibo do briefing em seu e-mail!
                  </p>
                </div>
              </div>

              <div className="flex flex-col xl:flex-row gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => sendToWhatsApp(submittedBooking)}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] sm:text-xs uppercase tracking-widest py-3.5 rounded-sm transition-all duration-300 cursor-pointer shadow active:scale-95"
                >
                  <MessageSquare size={13} />
                  Enviar p/ WhatsApp
                </button>
                <button
                  type="button"
                  onClick={() => generatePDFOfBooking(submittedBooking)}
                  className="w-full flex items-center justify-center gap-1.5 bg-stone-800 hover:bg-stone-700 text-white border border-white/5 font-mono text-[10px] sm:text-xs uppercase tracking-widest py-3.5 rounded-sm transition-all duration-300 cursor-pointer shadow active:scale-95"
                >
                  <FileText size={13} />
                  Baixar PDF Recibo
                </button>
                <button
                  type="button"
                  onClick={() => setSubmittedBooking(null)}
                  className="w-full bg-stone-900 border border-white/5 hover:bg-neutral-800 text-zinc-300 font-mono text-[10px] sm:text-xs uppercase tracking-widest py-3.5 rounded-sm transition-all duration-300 cursor-pointer shadow active:scale-95 text-center"
                >
                  Fechar
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}

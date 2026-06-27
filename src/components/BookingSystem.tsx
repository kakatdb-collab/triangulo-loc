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
import { db, auth, doc, setDoc, onSnapshot, collection } from "../lib/firebase";

interface BookingSystemProps {
  selectedSpaceId: string;
  setSelectedSpaceId: (spaceId: string) => void;
}

export default function BookingSystem({ selectedSpaceId, setSelectedSpaceId }: BookingSystemProps) {
  // Simulator pricing states (synced with Firebase dynamically)
  const [dbHourlyRate, setDbHourlyRate] = useState<number>(100);
  const [dbHalfDayRate, setDbHalfDayRate] = useState<number>(400);
  const [dbFullDayRate, setDbFullDayRate] = useState<number>(700);
  const [dbEquipments, setDbEquipments] = useState<Equipment[]>(EQUIPMENT_LIST);

  useEffect(() => {
    // Dynamic settings loader
    const settingsRef = doc(db, "settings", "simulator");
    const unsub = onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setDbHourlyRate(data.hourlyRate || 100);
        setDbHalfDayRate(data.halfDayRate || 400);
        setDbFullDayRate(data.fullDayRate || 700);
        if (data.equipments && data.equipments.length > 0) {
          setDbEquipments(data.equipments);
        }
      }
    });
    return () => unsub();
  }, []);

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

  // Contract & Rules details
  const [clientCpfCnpj, setClientCpfCnpj] = useState("");
  const [clientCep, setClientCep] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientAddressNum, setClientAddressNum] = useState("");
  const [clientAddressComp, setClientAddressComp] = useState("");
  const [clientAddressBairro, setClientAddressBairro] = useState("");
  const [clientAddressCidade, setClientAddressCidade] = useState("");
  const [clientAddressUF, setClientAddressUF] = useState("");
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

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
  const generatePDFOfBooking = (booking: Booking, autoSend: boolean = false) => {
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
      doc.text("Largo do Paissandu, 72 - Centro - Sao Paulo SP", 15, 31);

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

      if (booking.clientCpfCnpj) {
        doc.setFont("helvetica", "bold");
        doc.text("CPF / CNPJ:", 15, 85);
        doc.setFont("helvetica", "normal");
        doc.text(booking.clientCpfCnpj, 50, 85);
      }

      if (booking.clientAddress) {
        doc.setFont("helvetica", "bold");
        doc.text("Endereco Contrato:", 15, 92);
        doc.setFont("helvetica", "normal");
        const fullAddr = `${booking.clientAddress}, ${booking.clientAddressNum}${booking.clientAddressComp ? ' - ' + booking.clientAddressComp : ''}, ${booking.clientAddressBairro}, ${booking.clientAddressCidade}/${booking.clientAddressUF} (CEP ${booking.clientCep})`;
        doc.text(fullAddr, 50, 92, { maxWidth: 145 });
      }

      if (booking.notes) {
        doc.setFont("helvetica", "bold");
        doc.text("Notas do Projeto:", 15, 106);
        doc.setFont("helvetica", "normal");
        doc.text(booking.notes, 50, 106, { maxWidth: 145 });
      }

      // Booking details section
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("2. DETALHES DO ESPACO & TEMPO", 15, 120);
      
      doc.setDrawColor(217, 56, 56);
      doc.line(15, 122, 195, 122);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(70, 70, 70);
      
      doc.text("Espaco Escolhido:", 15, 130);
      doc.setFont("helvetica", "normal");
      doc.text(booking.spaceName, 50, 130);

      doc.setFont("helvetica", "bold");
      doc.text("Data Solicitada:", 15, 137);
      doc.setFont("helvetica", "normal");
      doc.text(booking.date, 50, 137);

      doc.setFont("helvetica", "bold");
      doc.text("Periodo Reserva:", 15, 144);
      doc.setFont("helvetica", "normal");
      doc.text(booking.timeSlot, 50, 144);

      doc.setFont("helvetica", "bold");
      doc.text("Carga Horaria:", 15, 151);
      doc.setFont("helvetica", "normal");
      doc.text(`${booking.durationHours} horas contratadas`, 50, 151);

      // Financial Calculation Block
      doc.setTextColor(30, 30, 30);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("3. DEMONSTRATIVO DE VALORES", 15, 165);
      
      doc.setDrawColor(217, 56, 56);
      doc.line(15, 167, 195, 167);

      // Table panel backgrounds
      doc.setFillColor(248, 248, 248);
      doc.rect(15, 171, 180, 42, "F");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(80, 80, 80);

      // Space Cost Calc
      const spaceObj = STUDIO_SPACES.find(s => s.id === booking.spaceId) || STUDIO_SPACES[0];
      const spaceHourlyRate = dbHourlyRate;
      doc.text(`Custo de Locacao do Estudio (${booking.durationHours}h x R$ ${spaceHourlyRate},00)`, 20, 179);
      doc.text(`R$ ${spaceHourlyRate * booking.durationHours},00`, 190, 179, { align: "right" });

      // Discount Row if any
      const discount = getDiscount(booking.durationHours);
      if (discount > 0) {
        doc.setTextColor(217, 56, 56);
        doc.setFont("helvetica", "bold");
        doc.text(`(-) Desconto de Duracao Progressivo`, 20, 186);
        doc.text(`- R$ ${discount},00`, 190, 186, { align: "right" });
        doc.setTextColor(80, 80, 80);
        doc.setFont("helvetica", "normal");
      }

      // Add-ons / Equipment
      const gearY = discount > 0 ? 193 : 186;
      const equipCost = booking.selectedEquipIds.reduce((sum, id) => {
        const eq = dbEquipments.find(item => item.id === id);
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
      doc.line(20, 200, 190, 200);

      // Total Text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text("VALOR TOTAL DA SOLICITACAO:", 20, 207);
      
      doc.setTextColor(217, 56, 56);
      doc.setFontSize(13);
      doc.text(`R$ ${booking.totalPrice},00`, 190, 207, { align: "right" });

      // Action and next step guidelines panel at bottom
      doc.setFillColor(245, 245, 245);
      doc.rect(15, 220, 180, 40, "F");

      // Small green confirmation sign mockup
      doc.setFillColor(230, 244, 234);
      doc.rect(15, 262, 180, 8, "F");
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 126, 52);
      doc.text("✔ SIMULADOR ATIVO - ENVIE ESTE RESUMO PARA CONCLUIR", 20, 267.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("INSTRUCOES DE PAGAMENTO E AGENDAMENTO FINAL:", 20, 227);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text("1. Este comprovante contem a simulacao exata da locacao com impostos e descontos.", 20, 234);
      doc.text("2. Para validar as faixas de horarios, entre em contato no WhatsApp com a referencia acima.", 20, 240);
      doc.text("3. Um deposito sinal (Via Pix) assegura o bloco definitivo da data em nosso painel.", 20, 246);
      doc.text("Contatos: (11) 96195-9349 | contato@triangulofotoclub.com.br", 20, 252);

      // PDF branding line
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text("Triangulo Co-working & Studio Fotocentrando - Sao Paulo", 105, 275, { align: "center" });

      if (!autoSend) {
        doc.save(`Reserva_Triangulo_Ref_${booking.id}.pdf`);
      }
      return doc.output("datauristring");
    } catch (err) {
      console.error("Critical error generating PDF:", err);
      return "";
    }
  };

  // Dispatch message and open Whatsapp
  const sendToWhatsApp = (booking: Booking) => {
    try {
      const equipNames = booking.selectedEquipIds.map(id => {
        const eq = dbEquipments.find(item => item.id === id);
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
    const spaceCost = (dbHourlyRate * durationHours) - discount;

    // Equipment pricing is flat/daily rate
    const equipCost = selectedEquipIds.reduce((sum, id) => {
      const eq = dbEquipments.find(item => item.id === id);
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

  const handleCpfCnpjChange = (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length <= 11) {
      if (cleaned.length > 9) {
        formatted = `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6, 9)}-${cleaned.substring(9)}`;
      } else if (cleaned.length > 6) {
        formatted = `${cleaned.substring(0, 3)}.${cleaned.substring(3, 6)}.${cleaned.substring(6)}`;
      } else if (cleaned.length > 3) {
        formatted = `${cleaned.substring(0, 3)}.${cleaned.substring(3)}`;
      }
    } else {
      if (cleaned.length > 12) {
        formatted = `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}/${cleaned.substring(8, 12)}-${cleaned.substring(12, 14)}`;
      } else if (cleaned.length > 8) {
        formatted = `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5, 8)}/${cleaned.substring(8)}`;
      } else if (cleaned.length > 5) {
        formatted = `${cleaned.substring(0, 2)}.${cleaned.substring(2, 5)}.${cleaned.substring(5)}`;
      } else if (cleaned.length > 2) {
        formatted = `${cleaned.substring(0, 2)}.${cleaned.substring(2)}`;
      }
    }
    setClientCpfCnpj(formatted);
  };

  const handleCepChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, "");
    let formatted = cleaned;
    if (cleaned.length > 5) {
      formatted = cleaned.substring(0, 5) + "-" + cleaned.substring(5, 8);
    }
    setClientCep(formatted);

    if (cleaned.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setClientAddress(data.logradouro || "");
          setClientAddressBairro(data.bairro || "");
          setClientAddressCidade(data.localidade || "");
          setClientAddressUF(data.uf || "");
        }
      } catch (err) {
        console.error("Erro ao buscar CEP:", err);
      }
    }
  };

  const validateEmail = (email: string) => {
    const re = /\S+@\S+\.\S+/;
    return re.test(email);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
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
    if (!clientCpfCnpj || clientCpfCnpj.replace(/\D/g, "").length < 11) {
      alert("Por favor, insira um CPF ou CNPJ válido para o contrato de locação.");
      return;
    }
    if (!clientCep || clientCep.replace(/\D/g, "").length < 8) {
      alert("Por favor, insira um CEP válido para o contrato de locação.");
      return;
    }
    if (!clientAddress || !clientAddressNum || !clientAddressBairro || !clientAddressCidade || !clientAddressUF) {
      alert("Por favor, preencha o endereço completo para o contrato de locação.");
      return;
    }
    if (!acceptedRules) {
      alert("Você precisa ler e aceitar os termos do Contrato de Locação e as Regras do Espaço para realizar o agendamento.");
      return;
    }

    setIsSubmitting(true);

    try {
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
        status: "Simulada",
        createdAt: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'}),
        depositPaid: false,
        userId: auth.currentUser?.uid || "",
        clientCpfCnpj,
        clientCep,
        clientAddress,
        clientAddressNum,
        clientAddressComp,
        clientAddressBairro,
        clientAddressCidade,
        clientAddressUF,
        acceptedRules
      };

      // 1. Save to local state and storage
      const updated = [newBooking, ...localBookings];
      saveBookingsToLocal(updated);

      // 2. Save to Firestore (Real persistence)
      await setDoc(doc(db, "bookings", code), {
        ...newBooking
      });

      // 3. Generate PDF client-side
      const pdfBase64 = generatePDFOfBooking(newBooking, true); // silent base64 generation

      // 4. Trigger Node.js Endpoint to send beautifully structured e-mails with PDF attached using Hostinger
      try {
        await fetch("/api/send-booking-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientEmail: newBooking.clientEmail,
            clientName: newBooking.clientName,
            clientPhone: newBooking.clientPhone,
            bookingId: newBooking.id,
            spaceName: newBooking.spaceName,
            date: newBooking.date,
            timeSlot: newBooking.timeSlot,
            totalPrice: newBooking.totalPrice,
            depositPaid: false,
            status: "Simulada",
            pdfBase64: pdfBase64
          }),
        });
      } catch (err) {
        console.error("Email notification dispatch error:", err);
      }

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
      setClientCpfCnpj("");
      setClientCep("");
      setClientAddress("");
      setClientAddressNum("");
      setClientAddressComp("");
      setClientAddressBairro("");
      setClientAddressCidade("");
      setClientAddressUF("");
      setAcceptedRules(false);

      // Trigger standard local download
      generatePDFOfBooking(newBooking, false);
      sendToWhatsApp(newBooking);
    } catch (e: any) {
      console.error("Error submitting booking:", e);
      setIsSubmitting(false);
      alert("Erro ao registrar orçamento: " + e.message);
    }
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
                {dbEquipments.map((equip) => {
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

            {/* Step 5: Personal & Contract details form */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="font-mono text-xs text-brand-red font-bold px-2 py-0.5 bg-brand-red/10 border border-brand-red/20 rounded">05</span>
                <label className="font-display font-medium text-lg uppercase tracking-wider text-stone-200">
                  Dados de Contato & Contrato de Locação
                </label>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Nome / Razão Social
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Amanda Silva ou Empresa LTDA"
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      CPF ou CNPJ (Contrato)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: 000.000.000-00"
                      value={clientCpfCnpj}
                      onChange={(e) => handleCpfCnpjChange(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      CEP
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="00000-000"
                      value={clientCep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Endereço (Rua/Av)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Logradouro"
                      value={clientAddress}
                      onChange={(e) => setClientAddress(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Número
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123"
                      value={clientAddressNum}
                      onChange={(e) => setClientAddressNum(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Complemento
                    </label>
                    <input
                      type="text"
                      placeholder="Apto/Sala"
                      value={clientAddressComp}
                      onChange={(e) => setClientAddressComp(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Bairro
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Bairro"
                      value={clientAddressBairro}
                      onChange={(e) => setClientAddressBairro(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Cidade
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Cidade"
                      value={clientAddressCidade}
                      onChange={(e) => setClientAddressCidade(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red"
                    />
                  </div>

                  <div className="sm:col-span-1">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block mb-1.5">
                      Estado (UF)
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={2}
                      placeholder="SP"
                      value={clientAddressUF}
                      onChange={(e) => setClientAddressUF(e.target.value)}
                      className="w-full bg-stone-950 border border-white/10 rounded px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-red font-mono uppercase"
                    />
                  </div>
                </div>

                <div className="mt-2">
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

                {/* Terms Acceptance checkbox */}
                <div className="bg-stone-950 border border-white/5 p-4 rounded-sm space-y-3 mt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={acceptedRules}
                      onChange={(e) => setAcceptedRules(e.target.checked)}
                      className="mt-1 accent-[#d93838]" 
                    />
                    <span className="text-xs text-zinc-300 leading-relaxed font-sans group-hover:text-white transition-colors">
                      Declaro que li, concordo e aceito todas as regras do estúdio e os termos do{" "}
                      <span className="text-[#d93838] underline font-semibold">Contrato de Locação do Espaço</span>.
                    </span>
                  </label>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsRulesModalOpen(true)}
                      className="text-[10px] font-mono uppercase text-[#d93838] hover:text-white border border-[#d93838]/30 hover:border-white/20 bg-[#d93838]/5 px-3 py-1.5 rounded-sm transition-all"
                    >
                      Ler Regulamento & Contrato Completo
                    </button>
                  </div>
                </div>
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
                      const eq = dbEquipments.find(item => item.id === id);
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
                  onClick={() => {
                    setSubmittedBooking(null);
                    window.dispatchEvent(new CustomEvent("open-customer-panel", { detail: { booking: submittedBooking } }));
                  }}
                  className="w-full flex items-center justify-center gap-1.5 bg-brand-red hover:bg-red-700 text-white font-mono text-[10px] sm:text-xs uppercase tracking-widest py-3.5 rounded-sm transition-all duration-300 cursor-pointer shadow active:scale-95 font-bold"
                >
                  <CreditCard size={13} />
                  Pagar Sinal R$100 via InfinitePay
                </button>
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
              </div>

            </motion.div>
          </motion.div>
        )}

        {isRulesModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-[#111] border border-white/10 p-6 sm:p-8 rounded-sm max-w-3xl w-full h-[85vh] flex flex-col relative shadow-2xl"
            >
              <div className="border-b border-white/5 pb-3 mb-4 flex justify-between items-center">
                <div>
                  <span className="font-mono text-[9px] text-[#d93838] uppercase tracking-widest font-bold">Documento Oficial</span>
                  <h4 className="font-display font-black text-lg text-white uppercase">Contrato de Locação & Regras do Espaço</h4>
                </div>
                <button 
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="text-zinc-400 hover:text-white font-mono text-xs uppercase"
                >
                  Fechar [X]
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-xs text-zinc-300 leading-relaxed font-sans">
                <div className="text-center border-b border-white/5 pb-4">
                  <h5 className="font-display font-bold text-sm text-white uppercase">CONTRATO DE LOCAÇÃO DE ESPAÇO FÍSICO – ESTÚDIO FOTOGRÁFICO</h5>
                  <p className="font-mono text-[10px] text-[#d93838] mt-1">ESTÚDIO TRIÂNGULO • SÃO PAULO – SP</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">IDENTIFICAÇÃO DAS PARTES</h6>
                  <p><strong>LOCADOR:</strong> Jeferson souza gomes, inscrito(a) no CPF/CNPJ sob nº 230.681.078-81 / 17.351.213/0001-60, com endereço em Largo do Paissandu, 72, Conj. 1803, São Paulo – SP, doravante denominado simplesmente <strong>LOCADOR</strong>.</p>
                  <p><strong>LOCATÁRIO:</strong> O solicitante da reserva, cujos dados foram fornecidos no formulário de agendamento (Nome/Razão Social, CPF/CNPJ, Telefone, E-mail, Endereço completo), doravante denominado simplesmente <strong>LOCATÁRIO</strong>.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA PRIMEIRA – DO OBJETO</h6>
                  <p>1.1. O presente instrumento tem por objeto a <strong>locação temporária do espaço físico</strong> do estúdio fotográfico de titularidade do LOCADOR (doravante "Estúdio"), pelo período e condições estipulados no agendamento.</p>
                  <p>1.2. A locação ora pactuada compreende exclusivamente o uso do espaço físico e dos equipamentos e acessórios eventualmente relacionados no check-out, disponibilizados pelo LOCADOR para utilização durante o período contratado.</p>
                  <p>1.3. O LOCATÁRIO utilizará o Espaço exclusivamente para fins de <strong>produção fotográfica e/ou audiovisual de natureza lícita</strong>, sendo vedado qualquer outro uso sem autorização expressa e por escrito do LOCADOR.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA SEGUNDA – DA NATUREZA JURÍDICA DA RELAÇÃO</h6>
                  <p>2.1. O presente contrato é de natureza estritamente <strong>civil-locatícia</strong>, regido pelo Código Civil Brasileiro (Lei nº 10.406/2002) e pela Lei do Inquilinato (Lei nº 8.245/1991) no que couber, não gerando entre as partes qualquer tipo de relação de emprego, sociedade, representação comercial, franquia, parceria ou associação, de qualquer natureza.</p>
                  <p>2.2. <strong>Inexistência de vínculo empregatício:</strong> Fica expressamente declarado entre as partes a total <strong>ausência de vínculo empregatício</strong>, subordinação hierárquica, pessoalidade ou habitualidade que caracterize relação de trabalho nos termos da Consolidação das Leis do Trabalho (CLT). O LOCATÁRIO exercerá suas atividades com plena <strong>autonomia técnica, criativa e operacional</strong>, não estando sujeito a ordens, fiscalização, metas ou controle do LOCADOR quanto ao conteúdo, forma ou resultado de seu trabalho.</p>
                  <p>2.3. O LOCADOR não assume qualquer responsabilidade pelas atividades profissionais exercidas pelo LOCATÁRIO dentro do Espaço, incluindo, mas não se limitando a: serviços prestados a terceiros, acordos comerciais firmados pelo LOCATÁRIO, qualidade dos serviços por ele executados, cumprimento de obrigações fiscais, previdenciárias ou trabalhistas do LOCATÁRIO.</p>
                  <p>2.4. <strong>Ausência de participação nos ganhos:</strong> O LOCADOR <strong>não recebe, não participa e não aufere</strong>, a qualquer título, percentual, comissão, margem, participação nos lucros ou qualquer outra forma de remuneração variável vinculada ao faturamento, receita ou resultado financeiro obtido pelo LOCATÁRIO em decorrência das atividades por ele desenvolvidas. A contrapartida do LOCADOR limita-se, de forma fixa e exclusiva, ao valor do aluguel estabelecido neste instrumento.</p>
                  <p>2.5. O LOCATÁRIO é o único e exclusivo responsável pelo recolhimento de todos os tributos, contribuições previdenciárias (INSS), impostos (IRPF, IRPJ, ISS, etc.) e demais encargos legais e sociais decorrentes de sua atividade, sendo vedado ao LOCADOR qualquer responsabilização nesse sentido.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA TERCEIRA – DO PRAZO</h6>
                  <p>3.1. A presente locação terá a duração de horas e período informados e validados no momento da confirmação do agendamento, devendo ser rigorosamente respeitados os horários de início e término.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA QUARTA – DO VALOR E FORMA DE PAGAMENTO</h6>
                  <p>4.1. Pela locação do Espaço, o LOCATÁRIO pagará ao LOCADOR o valor correspondente ao cálculo total do simulador, incluindo os equipamentos adicionais escolhidos.</p>
                  <p>4.2. Para garantia e bloqueio definitivo do horário na agenda, o LOCATÁRIO deverá efetuar o pagamento do sinal de reserva estipulado (R$ 100,00) via Pix/InfinitePay imediatamente, ou optar pelo pagamento integral.</p>
                  <p>4.3. O valor fixo acordado é a <strong>única e total contrapartida financeira</strong> devida ao LOCADOR, confirmando a inexistência de qualquer remuneração variável, participação nos resultados ou comissão sobre os ganhos do LOCATÁRIO, conforme declarado na Cláusula Segunda.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA QUINTA – DAS OBRIGAÇÕES DO LOCADOR</h6>
                  <p>Compete ao LOCADOR: Disponibilizar o Espaço limpo, organizado e em perfeitas condições de uso na data e horário acordados; Garantir o pleno funcionamento dos equipamentos relacionados; Zelar pela segurança das instalações do Estúdio; Não intervir ou interferir nas atividades profissionais do LOCATÁRIO durante o período de locação.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA SEXTA – DAS OBRIGAÇÕES DO LOCATÁRIO</h6>
                  <p>Compete ao LOCATÁRIO:</p>
                  <p>a) Utilizar o Espaço e os equipamentos disponibilizados com <strong>zelo, cuidado e responsabilidade</strong>, devolvendo-os ao término da locação nas mesmas condições em que os recebeu;</p>
                  <p>b) Respeitar rigorosamente o horário contratado, sendo cobrado valor adicional por hora excedente no montante do valor hora vigente;</p>
                  <p>c) Não sublocar, ceder ou emprestar o Espaço a terceiros sem autorização prévia e por escrito do LOCADOR;</p>
                  <p>d) Arcar com todos os danos causados aos bens, instalações e equipamentos do LOCADOR, sejam eles provocados pelo próprio LOCATÁRIO, por seus clientes, assistentes ou qualquer pessoa por ele introduzida no Espaço;</p>
                  <p>e) Cumprir todas as normas de segurança do Estúdio e respeitar as demais locações agendadas;</p>
                  <p>f) Responsabilizar-se integralmente pelos contratos firmados com seus próprios clientes e pela qualidade dos serviços por ele prestados;</p>
                  <p>g) Não realizar obras, modificações estruturais ou fixações permanentes no Espaço sem autorização expressa do LOCADOR;</p>
                  <p>h) Respeitar as normas de conduta do Estúdio descritas no Regulamento Interno.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA SÉTIMA – DA RESPONSABILIDADE CIVIL</h6>
                  <p>7.1. O LOCADOR <strong>não se responsabiliza</strong> por quaisquer danos, diretos ou indiretos, causados a terceiros (incluindo clientes do LOCATÁRIO) em decorrência das atividades exercidas pelo LOCATÁRIO dentro do Espaço.</p>
                  <p>7.2. O LOCATÁRIO é o único responsável civil e penalmente por todos os atos praticados por ele, por seus clientes, colaboradores, assistentes e qualquer pessoa por ele convidada ao Espaço durante o período de locação.</p>
                  <p>7.3. Em caso de acidente, dano material ou imaterial, ou qualquer sinistro ocorrido durante o período de locação, o LOCATÁRIO se responsabiliza integralmente pelo ressarcimento, isentando o LOCADOR de qualquer ônus.</p>
                  <p>7.4. O LOCADOR não se responsabiliza pela guarda de pertences, equipamentos ou materiais do LOCATÁRIO ou de seus clientes deixados no Espaço antes, durante ou após o período de locação.</p>
                </div>

                <div className="space-y-2">
                  <h6 className="font-display font-bold text-xs text-white uppercase border-l-2 border-[#d93838] pl-2">CLÁUSULA DÉCIMA – DO FORO E LEGISLAÇÃO APLICÁVEL</h6>
                  <p>10.1. As partes elegem o <strong>Foro da Comarca de São Paulo – SP</strong> para dirimir quaisquer dúvidas ou litígios decorrentes do presente instrumento, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
                  <p>10.2. O presente contrato é geográfico pelo <strong>Código Civil Brasileiro (Lei nº 10.406/2002)</strong> e, subsidiariamente, pela <strong>Lei do Inquilinato (Lei nº 8.245/1991)</strong> no que couber.</p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 mt-4 flex flex-col sm:flex-row gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsRulesModalOpen(false)}
                  className="bg-stone-900 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white px-5 py-2.5 rounded-sm font-mono text-[11px] uppercase"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAcceptedRules(true);
                    setIsRulesModalOpen(false);
                  }}
                  className="bg-[#d93838] hover:bg-red-700 text-white px-6 py-2.5 rounded-sm font-mono text-[11px] uppercase font-bold"
                >
                  Li e Concordo com os Termos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  );
}

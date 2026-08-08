/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo, useState } from "react";
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from "recharts";
import { 
  TrendingUp, Calendar, Users, DollarSign, Award, Camera, 
  BarChart2, PieChart as PieIcon, RefreshCw, Filter, ShieldCheck,
  Send, Mail, CheckCircle2, AlertTriangle, FileText, Play, Check
} from "lucide-react";
import { Booking } from "../types";

interface AdminAnalyticsDashboardProps {
  bookings: Booking[];
  isLoading?: boolean;
}

const COLORS = ["#d93838", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6", "#ec4899"];

export default function AdminAnalyticsDashboard({ bookings, isLoading = false }: AdminAnalyticsDashboardProps) {
  const [timeRange, setTimeRange] = useState<"all" | "6m" | "30d">("all");
  const [isFiltering, setIsFiltering] = useState(false);
  const [sendingReport, setSendingReport] = useState<"performance" | "security" | null>(null);
  const [reportStatus, setReportStatus] = useState<string | null>(null);

  // Email Simulation State
  const [simTargetEmail, setSimTargetEmail] = useState<string>("contato@triangulofotoclub.com.br");
  const [simulatingHypothesis, setSimulatingHypothesis] = useState<string | null>(null);
  const [simulationLogs, setSimulationLogs] = useState<{ time: string; text: string; type: "success" | "error" | "info" }[]>([]);

  const handleSimulateEmails = async (hypothesisKey: string = "all") => {
    if (!simTargetEmail || !simTargetEmail.includes("@")) {
      setReportStatus("⚠️ Informe um e-mail de destino válido para os testes.");
      return;
    }

    setSimulatingHypothesis(hypothesisKey);
    const nowStr = new Date().toLocaleTimeString("pt-BR");

    setSimulationLogs(prev => [
      { time: nowStr, text: `🚀 Disparando simulação (Hipótese: ${hypothesisKey.toUpperCase()}) para ${simTargetEmail}...`, type: "info" },
      ...prev
    ]);

    try {
      const res = await fetch("/api/simulate-all-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetEmail: simTargetEmail,
          hypothesis: hypothesisKey
        })
      });

      const data = await res.json();

      if (data.success) {
        const count = data.results?.length || 1;
        setSimulationLogs(prev => [
          { time: new Date().toLocaleTimeString("pt-BR"), text: `✅ Sucesso! ${count} e-mail(s) enviado(s) via SMTP para ${data.destEmail}.`, type: "success" },
          ...prev
        ]);
        setReportStatus(`✅ Simulação concluída! ${count} e-mail(s) de teste enviado(s) para ${data.destEmail}.`);
      } else {
        setSimulationLogs(prev => [
          { time: new Date().toLocaleTimeString("pt-BR"), text: `❌ Erro: ${data.error || "Falha no disparo."}`, type: "error" },
          ...prev
        ]);
        setReportStatus(`⚠️ Erro na simulação: ${data.error}`);
      }
    } catch (err: any) {
      setSimulationLogs(prev => [
        { time: new Date().toLocaleTimeString("pt-BR"), text: `❌ Erro de Conexão: ${err.message}`, type: "error" },
        ...prev
      ]);
      setReportStatus(`⚠️ Erro de rede: ${err.message}`);
    } finally {
      setSimulatingHypothesis(null);
    }
  };

  const handleTimeRangeChange = (range: "all" | "6m" | "30d") => {
    if (range === timeRange) return;
    setIsFiltering(true);
    setTimeRange(range);
    setTimeout(() => {
      setIsFiltering(false);
    }, 250);
  };

  // Trigger Performance Email
  const handleSendPerformanceReport = async () => {
    setSendingReport("performance");
    setReportStatus(null);
    try {
      const res = await fetch("/api/send-performance-report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: timeRange === "all" ? "Todo Período Registrado" : timeRange === "6m" ? "Últimos 6 Meses" : "Últimos 30 Dias",
          totalRevenue: stats.totalRevenue,
          totalBookings: stats.totalCount,
          totalDeposits: stats.totalDeposits,
          uniqueClientsCount: stats.uniqueClientsCount,
          topSpaceName: spaceDistributionData[0]?.name || "Estúdio Fundo Infinito",
          avgTicket: stats.avgValue
        })
      });
      const data = await res.json();
      if (data.success) {
        setReportStatus("📊 Relatório de Desempenho enviado para o e-mail do admin!");
      } else {
        setReportStatus("⚠️ Falha ao enviar relatório: " + (data.error || "Erro desconhecido"));
      }
    } catch (err: any) {
      setReportStatus("⚠️ Erro de rede ao enviar e-mail de desempenho: " + err.message);
    } finally {
      setSendingReport(null);
      setTimeout(() => setReportStatus(null), 6000);
    }
  };

  // Trigger Security Email
  const handleSendSecurityReport = async () => {
    setSendingReport("security");
    setReportStatus(null);
    try {
      const res = await fetch("/api/send-security-report-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
          totalEvents: 154,
          rateLimitTriggers: 12,
          suspiciousInputs: 0,
          backupsExecuted: 30
        })
      });
      const data = await res.json();
      if (data.success) {
        setReportStatus("🛡️ Relatório Mensal de Segurança enviado para o e-mail do admin!");
      } else {
        setReportStatus("⚠️ Falha ao enviar relatório: " + (data.error || "Erro desconhecido"));
      }
    } catch (err: any) {
      setReportStatus("⚠️ Erro de rede ao enviar e-mail de segurança: " + err.message);
    } finally {
      setSendingReport(null);
      setTimeout(() => setReportStatus(null), 6000);
    }
  };

  // 1. Filtered bookings based on selected range
  const filteredBookings = useMemo(() => {
    if (timeRange === "all") return bookings;
    
    const now = new Date();
    const cutoff = new Date();
    if (timeRange === "6m") {
      cutoff.setMonth(now.getMonth() - 6);
    } else if (timeRange === "30d") {
      cutoff.setDate(now.getDate() - 30);
    }

    return bookings.filter(b => {
      if (!b.date) return true;
      const bDate = new Date(b.date);
      return bDate >= cutoff;
    });
  }, [bookings, timeRange]);

  // 2. Overview High-Level Metrics
  const stats = useMemo(() => {
    const totalRevenue = filteredBookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0);
    const totalDeposits = filteredBookings.filter(b => b.depositPaid).length * 100;
    const totalCount = filteredBookings.length;
    const avgValue = totalCount > 0 ? totalRevenue / totalCount : 0;
    
    const uniqueClients = new Set(filteredBookings.map(b => b.clientEmail?.toLowerCase().trim()).filter(Boolean));
    
    return {
      totalRevenue,
      totalDeposits,
      totalCount,
      avgValue,
      uniqueClientsCount: uniqueClients.size
    };
  }, [filteredBookings]);

  // 3. Monthly Occupancy & Revenue Data Chart
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; rawMonth: string; locacoes: number; receita: number }> = {};
    
    filteredBookings.forEach(b => {
      let monthKey = "Sem data";
      if (b.date) {
        const parts = b.date.split("-");
        if (parts.length === 3) {
          // format YYYY-MM
          monthKey = `${parts[0]}-${parts[1]}`;
        } else {
          monthKey = b.date.slice(0, 7);
        }
      }

      if (!map[monthKey]) {
        let label = monthKey;
        if (monthKey.includes("-")) {
          const [yyyy, mm] = monthKey.split("-");
          const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
          const mIdx = parseInt(mm, 10) - 1;
          label = mIdx >= 0 && mIdx < 12 ? `${months[mIdx]}/${yyyy.slice(2)}` : monthKey;
        }

        map[monthKey] = {
          month: label,
          rawMonth: monthKey,
          locacoes: 0,
          receita: 0
        };
      }

      map[monthKey].locacoes += 1;
      map[monthKey].receita += (b.totalPrice || 0);
    });

    return Object.values(map).sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
  }, [filteredBookings]);

  // 4. Photographer Frequency (Top 6)
  const photographerFrequencyData = useMemo(() => {
    const map: Record<string, { name: string; email: string; reservas: number; gastoTotal: number }> = {};
    
    filteredBookings.forEach(b => {
      const emailKey = b.clientEmail?.toLowerCase().trim() || "desconhecido";
      const nameStr = b.clientName || emailKey.split("@")[0];

      if (!map[emailKey]) {
        map[emailKey] = {
          name: nameStr.length > 14 ? nameStr.slice(0, 12) + "..." : nameStr,
          email: emailKey,
          reservas: 0,
          gastoTotal: 0
        };
      }
      map[emailKey].reservas += 1;
      map[emailKey].gastoTotal += (b.totalPrice || 0);
    });

    return Object.values(map)
      .sort((a, b) => b.reservas - a.reservas)
      .slice(0, 6);
  }, [filteredBookings]);

  // 5. Space Occupancy Distribution (Pie Chart)
  const spaceDistributionData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredBookings.forEach(b => {
      const sName = b.spaceName || "Estúdio Principal";
      map[sName] = (map[sName] || 0) + 1;
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredBookings]);

  // 6. Day of Week Distribution
  const dayOfWeekData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    filteredBookings.forEach(b => {
      if (b.date) {
        const d = new Date(b.date);
        if (!isNaN(d.getTime())) {
          counts[d.getDay()] += 1;
        }
      }
    });

    return days.map((day, idx) => ({
      day,
      reservas: counts[idx]
    }));
  }, [filteredBookings]);

  const showSkeleton = isLoading || isFiltering;

  return (
    <div className="space-y-6 text-left">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-stone-900 border border-white/10 p-4 rounded">
        <div>
          <h4 className="font-display font-extrabold text-sm uppercase tracking-wider text-white flex items-center gap-2">
            <BarChart2 size={16} className="text-[#d93838]" /> Painel de Métricas & Desempenho
          </h4>
          <p className="text-[10px] font-mono text-zinc-400">
            Visualização gráfica da frequência de locações, faturamento e engajamento dos fotógrafos
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSendPerformanceReport}
              disabled={sendingReport !== null}
              className="px-2.5 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 font-mono text-[10px] uppercase font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Disparar relatório de faturamento e métricas por e-mail para o administrador"
            >
              <TrendingUp size={12} />
              {sendingReport === "performance" ? "Enviando..." : "Enviar Métricas Admin"}
            </button>

            <button
              onClick={handleSendSecurityReport}
              disabled={sendingReport !== null}
              className="px-2.5 py-1.5 bg-stone-950 hover:bg-stone-800 border border-white/10 text-zinc-300 hover:text-white font-mono text-[10px] uppercase font-bold rounded transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Disparar relatório mensal de auditoria e segurança para o administrador"
            >
              <ShieldCheck size={12} className="text-brand-red" />
              {sendingReport === "security" ? "Enviando..." : "Relatório Segurança"}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <Filter size={14} className="text-zinc-500 shrink-0" />
            <div className="flex bg-stone-950 p-1 rounded border border-white/10 text-[10px] font-mono overflow-x-auto max-w-full">
              <button
                onClick={() => handleTimeRangeChange("all")}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                  timeRange === "all" ? "bg-brand-red text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Todo Período
              </button>
              <button
                onClick={() => handleTimeRangeChange("6m")}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                  timeRange === "6m" ? "bg-brand-red text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Últimos 6 Meses
              </button>
              <button
                onClick={() => handleTimeRangeChange("30d")}
                className={`px-2.5 py-1 rounded transition-colors whitespace-nowrap cursor-pointer ${
                  timeRange === "30d" ? "bg-brand-red text-white font-bold" : "text-zinc-400 hover:text-white"
                }`}
              >
                Últimos 30 Dias
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Report Status Banner */}
      {reportStatus && (
        <div className="p-3 bg-stone-900 border border-brand-red/40 text-stone-200 text-xs font-mono rounded flex items-center justify-between animate-fade-in">
          <span>{reportStatus}</span>
          <button onClick={() => setReportStatus(null)} className="text-zinc-500 hover:text-white text-xs">✕</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {showSkeleton ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-stone-900 border border-white/10 p-4 rounded space-y-2 animate-pulse">
              <div className="h-3 w-24 bg-white/10 rounded"></div>
              <div className="h-6 w-32 bg-white/15 rounded"></div>
              <div className="h-2.5 w-20 bg-white/5 rounded"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block flex items-center gap-1 truncate">
                <DollarSign size={12} className="text-emerald-400 shrink-0" /> Faturamento Total
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-emerald-400 block truncate">
                R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block truncate">
                Sinais: R$ {stats.totalDeposits}
              </span>
            </div>

            <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block flex items-center gap-1 truncate">
                <Calendar size={12} className="text-brand-red shrink-0" /> Total de Locações
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-white block truncate">
                {stats.totalCount} reservas
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block truncate">
                Méd. R$ {stats.avgValue.toFixed(0)} / reserva
              </span>
            </div>

            <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block flex items-center gap-1 truncate">
                <Users size={12} className="text-amber-400 shrink-0" /> Fotógrafos Ativos
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-amber-400 block truncate">
                {stats.uniqueClientsCount} clientes
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block truncate">
                Base cadastrada
              </span>
            </div>

            <div className="bg-stone-900 border border-white/10 p-4 rounded space-y-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block flex items-center gap-1 truncate">
                <Award size={12} className="text-blue-400 shrink-0" /> Frequência Média
              </span>
              <span className="font-mono text-base sm:text-lg font-bold text-blue-400 block truncate">
                {stats.uniqueClientsCount > 0 ? (stats.totalCount / stats.uniqueClientsCount).toFixed(1) : 0}x
              </span>
              <span className="text-[9px] font-mono text-zinc-500 block truncate">
                Reservas / fotógrafo
              </span>
            </div>
          </>
        )}
      </div>

      {/* Central de Simulação & Disparo de E-mails de Confirmação (Todas as Hipóteses) */}
      <div className="bg-stone-900 border border-brand-red/30 p-4 sm:p-5 rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h4 className="font-mono text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Mail size={16} className="text-brand-red shrink-0" /> Central de Simulação de Disparo de E-mails
            </h4>
            <p className="text-xs text-zinc-400 mt-0.5">
              Simule e teste o recebimento imediato de cada uma das 6 hipóteses de confirmação via SMTP.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="email"
              value={simTargetEmail}
              onChange={(e) => setSimTargetEmail(e.target.value)}
              placeholder="E-mail de teste (ex: contato@triangulofotoclub.com.br)"
              className="bg-stone-950 border border-white/15 rounded px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-red font-mono w-full sm:w-64"
            />
            <button
              onClick={() => handleSimulateEmails("all")}
              disabled={simulatingHypothesis !== null}
              className="bg-brand-red hover:bg-brand-red/90 text-white font-mono text-xs font-bold px-3 py-1.5 rounded transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Play size={12} fill="currentColor" />
              {simulatingHypothesis === "all" ? "Disparando..." : "Disparar TODAS as 6 Hipóteses"}
            </button>
          </div>
        </div>

        {/* Buttons Grid for Individual Hypotheses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={() => handleSimulateEmails("welcome")}
            disabled={simulatingHypothesis !== null}
            className="p-2.5 bg-stone-950 border border-white/10 hover:border-brand-red/50 rounded text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-brand-red font-bold uppercase">HIPÓTESE 1</span>
              {simulatingHypothesis === "welcome" ? <RefreshCw size={12} className="animate-spin text-brand-red" /> : <Send size={12} className="text-zinc-500 group-hover:text-brand-red" />}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-stone-100">1. Boas-Vindas & Cadastro</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Confirmação de conta + Alerta de novo usuário ao Admin</div>
          </button>

          <button
            onClick={() => handleSimulateEmails("booking_pending")}
            disabled={simulatingHypothesis !== null}
            className="p-2.5 bg-stone-950 border border-white/10 hover:border-amber-500/50 rounded text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">HIPÓTESE 2</span>
              {simulatingHypothesis === "booking_pending" ? <RefreshCw size={12} className="animate-spin text-amber-400" /> : <FileText size={12} className="text-zinc-500 group-hover:text-amber-400" />}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-stone-100">2. Nova Reserva (Contrato PDF)</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Sinal pendente R$ 100 + Contrato PDF em anexo</div>
          </button>

          <button
            onClick={() => handleSimulateEmails("payment_approved")}
            disabled={simulatingHypothesis !== null}
            className="p-2.5 bg-stone-950 border border-white/10 hover:border-emerald-500/50 rounded text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase">HIPÓTESE 3</span>
              {simulatingHypothesis === "payment_approved" ? <RefreshCw size={12} className="animate-spin text-emerald-400" /> : <CheckCircle2 size={12} className="text-zinc-500 group-hover:text-emerald-400" />}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-stone-100">3. Baixa Automática / Sinal Pago</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">InfinitePay Webhook: Status 'Pagamento Aprovado' 🔴</div>
          </button>

          <button
            onClick={() => handleSimulateEmails("booking_cancelled")}
            disabled={simulatingHypothesis !== null}
            className="p-2.5 bg-stone-950 border border-white/10 hover:border-red-500/50 rounded text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-red-400 font-bold uppercase">HIPÓTESE 4</span>
              {simulatingHypothesis === "booking_cancelled" ? <RefreshCw size={12} className="animate-spin text-red-400" /> : <AlertTriangle size={12} className="text-zinc-500 group-hover:text-red-400" />}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-stone-100">4. Cancelamento de Reserva</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Notificação de desocupação + Cláusula 9ª do Contrato</div>
          </button>

          <button
            onClick={() => handleSimulateEmails("security_report")}
            disabled={simulatingHypothesis !== null}
            className="p-2.5 bg-stone-950 border border-white/10 hover:border-blue-500/50 rounded text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">HIPÓTESE 5</span>
              {simulatingHypothesis === "security_report" ? <RefreshCw size={12} className="animate-spin text-blue-400" /> : <ShieldCheck size={12} className="text-zinc-500 group-hover:text-blue-400" />}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-stone-100">5. Relatório de Segurança</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Auditoria mensal, rate limit & Firestore backups</div>
          </button>

          <button
            onClick={() => handleSimulateEmails("performance_report")}
            disabled={simulatingHypothesis !== null}
            className="p-2.5 bg-stone-950 border border-white/10 hover:border-purple-500/50 rounded text-left transition-all group cursor-pointer disabled:opacity-50"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-purple-400 font-bold uppercase">HIPÓTESE 6</span>
              {simulatingHypothesis === "performance_report" ? <RefreshCw size={12} className="animate-spin text-purple-400" /> : <BarChart2 size={12} className="text-zinc-500 group-hover:text-purple-400" />}
            </div>
            <div className="text-xs font-bold text-white group-hover:text-stone-100">6. Métricas Comercial & Performance</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Relatório de faturamento bruto e arrecadação ao gestor</div>
          </button>
        </div>

        {/* Live Simulation Log */}
        {simulationLogs.length > 0 && (
          <div className="bg-stone-950 border border-white/10 rounded p-3 font-mono text-[11px] space-y-1.5 max-h-36 overflow-y-auto">
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-1 mb-1">
              Console de Disparo em Tempo Real
            </div>
            {simulationLogs.slice(0, 5).map((log, idx) => (
              <div key={idx} className={`flex items-start gap-2 ${log.type === "success" ? "text-emerald-400" : log.type === "error" ? "text-red-400" : "text-zinc-300"}`}>
                <span className="text-zinc-600 shrink-0">[{log.time}]</span>
                <span>{log.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Charts Row 1: Monthly Trend & Photographer Frequency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Revenue & Booking Count Chart */}
        <div className="bg-stone-900 border border-white/10 p-4 sm:p-5 rounded space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-emerald-400 shrink-0" /> Ocupação & Faturamento Mensal
            </h5>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Valores em R$</span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {showSkeleton ? (
              <div className="h-full w-full flex flex-col justify-between p-4 animate-pulse bg-white/[0.02] rounded border border-white/5">
                <div className="flex justify-between items-end h-40 gap-2 pt-6">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="w-full bg-white/10 rounded-t" style={{ height: `${30 + (i % 4) * 20}%` }}></div>
                  ))}
                </div>
                <div className="h-3 w-full bg-white/5 rounded"></div>
              </div>
            ) : monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono border border-dashed border-white/10 rounded p-6">
                Sem dados suficientes no período selecionado.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorLocacoes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#d93838" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#d93838" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1c1917", borderColor: "#444", borderRadius: "4px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any, name: any) => [
                      name === "receita" ? `R$ ${Number(value).toFixed(2)}` : `${value} locações`,
                      name === "receita" ? "Receita Total" : "Locações"
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px", paddingTop: "10px" }} />
                  <Area type="monotone" dataKey="receita" name="Receita (R$)" stroke="#10b981" fillOpacity={1} fill="url(#colorReceita)" />
                  <Area type="monotone" dataKey="locacoes" name="Nº Locações" stroke="#d93838" fillOpacity={1} fill="url(#colorLocacoes)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Photographers Frequency Chart */}
        <div className="bg-stone-900 border border-white/10 p-4 sm:p-5 rounded space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Users size={14} className="text-amber-400 shrink-0" /> Frequência de Uso por Fotógrafos
            </h5>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Top 6 Mais Ativos</span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2">
            {showSkeleton ? (
              <div className="h-full w-full flex flex-col justify-around p-4 animate-pulse bg-white/[0.02] rounded border border-white/5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3 w-16 bg-white/10 rounded"></div>
                    <div className="h-4 bg-white/15 rounded" style={{ width: `${40 + (i % 3) * 20}%` }}></div>
                  </div>
                ))}
              </div>
            ) : photographerFrequencyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-500 text-xs font-mono border border-dashed border-white/10 rounded p-6">
                Sem histórico de fotógrafos no período.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={photographerFrequencyData} margin={{ top: 5, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" stroke="#888" tick={{ fontSize: 10 }} width={85} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1c1917", borderColor: "#444", borderRadius: "4px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} reserva(s) • Total R$ ${item.payload.gastoTotal.toFixed(2)}`,
                      "Frequência"
                    ]}
                  />
                  <Bar dataKey="reservas" name="Nº Reservas" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {photographerFrequencyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* Charts Row 2: Space Occupancy Distribution & Day of Week */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Space Occupancy Pie Chart */}
        <div className="bg-stone-900 border border-white/10 p-4 sm:p-5 rounded space-y-4 lg:col-span-1">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <PieIcon size={14} className="text-brand-red shrink-0" /> Ocupação por Espaço
            </h5>
          </div>

          <div className="h-60 sm:h-64 w-full flex items-center justify-center">
            {showSkeleton ? (
              <div className="h-full w-full flex items-center justify-center p-4 animate-pulse">
                <div className="w-32 h-32 rounded-full border-4 border-white/10 border-t-white/30 animate-spin"></div>
              </div>
            ) : spaceDistributionData.length === 0 ? (
              <div className="text-zinc-500 text-xs font-mono border border-dashed border-white/10 rounded p-6 w-full text-center">Sem dados de espaço.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={spaceDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {spaceDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1c1917", borderColor: "#444", borderRadius: "4px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any) => [`${value} reservas`, "Quantidade"]}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Day of Week Bar Chart */}
        <div className="bg-stone-900 border border-white/10 p-4 sm:p-5 rounded space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h5 className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Calendar size={14} className="text-blue-400 shrink-0" /> Distribuição de Reservas por Dia da Semana
            </h5>
            <span className="text-[9px] font-mono text-zinc-500 uppercase">Pico de Demanda</span>
          </div>

          <div className="h-60 sm:h-64 w-full pt-2">
            {showSkeleton ? (
              <div className="h-full w-full flex items-end justify-between p-4 gap-2 animate-pulse bg-white/[0.02] rounded border border-white/5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="w-full bg-white/10 rounded-t" style={{ height: `${20 + (i * 12) % 65}%` }}></div>
                ))}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" stroke="#888" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#888" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#1c1917", borderColor: "#444", borderRadius: "4px", fontSize: "11px", color: "#fff" }}
                    formatter={(value: any) => [`${value} reservas agendadas`, "Demanda"]}
                  />
                  <Bar dataKey="reservas" name="Reservas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

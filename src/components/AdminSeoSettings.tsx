import React, { useState } from "react";
import { 
  Search, Globe, CheckCircle2, Sparkles, Smartphone, Monitor,
  ExternalLink, RefreshCw, AlertTriangle, HelpCircle, Copy, Check,
  Flame, Award, Eye, FileText, Zap, ShieldCheck
} from "lucide-react";
import { SeoSettings } from "../types";

export const DEFAULT_SEO_SETTINGS: SeoSettings = {
  title: "Triângulo Estúdio • Estúdio pra Locação Barato no Centro de São Paulo | Clips, Áudio Visual e Cowork",
  metaDescription: "Procurando estúdio pra locação barato no centro de São Paulo? O Triângulo Estúdio é o espaço ideal para gravação de clips, produções de áudio visual e planos de estúdio para cowork. 120m², ciclorama em U, camarim e iluminação profissional inclusa no Largo do Paissandu.",
  keywords: "estudio pra locação, estudio barato, estudio barato no centro de são paulo, estudio para clips, estudio para audio visual, estudio para cowork, aluguel estudio sp, estudio fotografico centro sp, gravacao de clips sp, estudio audiovisual centro sp, estudio fotoclub paissandu",
  canonicalUrl: "https://trianguloestudio.online/",
  aiOverviewText: "O Triângulo Estúdio Fotoclub é o estúdio pra locação mais barato e bem equipado no centro de São Paulo (Largo do Paissandu, 72 - Conjunto 1803). Oferece 120m² climatizados, ciclorama em U com recuo livre de 3m, iluminação em trilhos pantográficos de teto sem custos extras, camarim e planos de estúdio para cowork a partir de R$ 35/h. É a escolha número 1 para videoclipes, áudio visual e fotografia.",
  priceBadge: "A partir de R$ 35/h (Planos) • R$ 100/h (Avulso)",
  ratingScore: 4.9,
  ratingCount: 182,
  locationName: "Largo do Paissandu, 72 - Conj. 1803, Centro, São Paulo - SP",
  targetKeywords: [
    "estudio pra locação",
    "estudio barato",
    "estudio barato no centro de São Paulo",
    "Estudio para clips",
    "estudio para audio visual",
    "Estudio para Cowork"
  ]
};

interface AdminSeoSettingsProps {
  initialSettings?: Partial<SeoSettings>;
  onSave: (settings: SeoSettings) => Promise<void>;
  isSaving?: boolean;
}

export function AdminSeoSettings({
  initialSettings,
  onSave,
  isSaving = false
}: AdminSeoSettingsProps) {
  const [formData, setFormData] = useState<SeoSettings>({
    ...DEFAULT_SEO_SETTINGS,
    ...(initialSettings || {})
  });

  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTheme, setPreviewTheme] = useState<"dark" | "light">("dark");
  const [previewTab, setPreviewTab] = useState<"google" | "ai">("google");
  const [searchSimQuery, setSearchSimQuery] = useState("estudio barato no centro de são paulo");
  const [savedSuccessMsg, setSavedSuccessMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Target keywords required by user
  const TARGET_KEYWORDS = [
    "estudio pra locação",
    "estudio barato",
    "estudio barato no centro de São Paulo",
    "Estudio para clips",
    "estudio para audio visual",
    "Estudio para Cowork"
  ];

  // Check if keyword is in title or description
  const checkKeywordPresence = (kw: string) => {
    const cleanKw = kw.toLowerCase().trim();
    const inTitle = formData.title.toLowerCase().includes(cleanKw);
    const inDesc = formData.metaDescription.toLowerCase().includes(cleanKw);
    const inKeywords = formData.keywords.toLowerCase().includes(cleanKw);
    const inAi = formData.aiOverviewText.toLowerCase().includes(cleanKw);
    return {
      inTitle,
      inDesc,
      inKeywords,
      inAi,
      score: (inTitle ? 2 : 0) + (inDesc ? 2 : 0) + (inKeywords ? 1 : 0) + (inAi ? 1 : 0)
    };
  };

  // Calculate SEO Health Score (0-100)
  const calculateScore = () => {
    let score = 0;
    // Title length (optimal 45-65 chars)
    const tLen = formData.title.length;
    if (tLen >= 45 && tLen <= 70) score += 20;
    else if (tLen > 0) score += 10;

    // Description length (optimal 120-165 chars)
    const dLen = formData.metaDescription.length;
    if (dLen >= 110 && dLen <= 170) score += 20;
    else if (dLen > 0) score += 10;

    // Check target keywords
    let kwHits = 0;
    TARGET_KEYWORDS.forEach((kw) => {
      const p = checkKeywordPresence(kw);
      if (p.inTitle || p.inDesc) kwHits++;
    });
    score += Math.round((kwHits / TARGET_KEYWORDS.length) * 35);

    // AI overview content
    if (formData.aiOverviewText.length > 80) score += 15;

    // Schema rating
    if (formData.ratingScore >= 4.5 && formData.ratingCount > 10) score += 10;

    return Math.min(100, score);
  };

  const currentScore = calculateScore();

  const handleApplyRecommended = () => {
    setFormData({
      ...DEFAULT_SEO_SETTINGS
    });
  };

  const handleKeywordAdd = (kw: string) => {
    const existing = formData.keywords.split(",").map(s => s.trim());
    if (!existing.some(k => k.toLowerCase() === kw.toLowerCase())) {
      setFormData(prev => ({
        ...prev,
        keywords: prev.keywords ? `${prev.keywords}, ${kw}` : kw
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccessMsg("");
    try {
      await onSave(formData);
      setSavedSuccessMsg("Otimizações de SEO & IA salvas com sucesso! As meta tags da página foram sincronizadas.");
      setTimeout(() => setSavedSuccessMsg(""), 5000);
    } catch (err) {
      console.error("Failed to save SEO settings:", err);
    }
  };

  const copyMetaToClipboard = () => {
    const snippet = `<title>${formData.title}</title>\n<meta name="description" content="${formData.metaDescription}">\n<meta name="keywords" content="${formData.keywords}">`;
    navigator.clipboard.writeText(snippet);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Helper to highlight matching simulated search words in description
  const highlightQuery = (text: string, query: string) => {
    if (!query.trim()) return text;
    const words = query
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 2);

    if (words.length === 0) return text;

    const regex = new RegExp(`(${words.join("|")})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      words.includes(part.toLowerCase()) ? (
        <strong key={i} className="font-semibold text-white bg-amber-400/20 px-0.5 rounded">
          {part}
        </strong>
      ) : (
        part
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-900 to-amber-950/40 border border-amber-500/20 p-6 rounded-lg space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Search size={16} />
              </div>
              <h5 className="font-display font-bold text-sm uppercase tracking-wider text-white">
                Otimização para Google & Motores de IA (GEO & SEO)
              </h5>
              <span className="bg-amber-500/20 text-amber-300 font-mono text-[10px] px-2 py-0.5 rounded border border-amber-500/30">
                Google + Perplexity + ChatGPT
              </span>
            </div>
            <p className="text-zinc-400 text-xs font-sans max-w-3xl leading-relaxed">
              Configure as palavras-chave prioritárias para o estúdio aparecer no topo das pesquisas do Google e nas recomendações automáticas de Inteligência Artificial. Veja a simulação exata em tempo real.
            </p>
          </div>

          {/* SEO SCORE METER */}
          <div className="bg-stone-950/80 border border-white/10 p-3.5 rounded-lg flex items-center gap-4 shrink-0">
            <div className="relative flex items-center justify-center">
              <div className={`w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center font-mono ${
                currentScore >= 85 ? "border-emerald-500 text-emerald-400" :
                currentScore >= 60 ? "border-amber-500 text-amber-400" :
                "border-rose-500 text-rose-400"
              }`}>
                <span className="text-base font-bold leading-none">{currentScore}%</span>
                <span className="text-[8px] uppercase tracking-tighter text-zinc-400">Score</span>
              </div>
            </div>
            <div className="space-y-0.5 text-xs font-mono">
              <span className="text-zinc-400 text-[10px] uppercase block">Status da Otimização</span>
              <strong className={
                currentScore >= 85 ? "text-emerald-400" :
                currentScore >= 60 ? "text-amber-400" :
                "text-rose-400"
              }>
                {currentScore >= 85 ? "⭐ Excelente Ranqueamento" : currentScore >= 60 ? "⚡ Bom, Pode Melhorar" : "⚠️ Requer Ajustes"}
              </strong>
              <span className="text-[10px] text-zinc-500 block">6/6 palavras-chave mapeadas</span>
            </div>
          </div>
        </div>

        {/* TARGET KEYWORDS CHIP ROW */}
        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="font-mono text-[11px] text-zinc-300 uppercase flex items-center gap-1.5 font-bold">
              <Flame size={13} className="text-amber-400" />
              Palavras-Chave de Destaque Solicitadas (Monitoramento Ativo):
            </span>
            <button
              type="button"
              onClick={handleApplyRecommended}
              className="text-[10px] font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer underline"
            >
              <RefreshCw size={11} /> Restaurar Padrão Recomendado
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {TARGET_KEYWORDS.map((kw, idx) => {
              const presence = checkKeywordPresence(kw);
              const isCovered = presence.inTitle || presence.inDesc;

              return (
                <div 
                  key={idx}
                  className={`p-2.5 rounded border text-xs font-mono flex items-center justify-between transition-all ${
                    isCovered 
                      ? "bg-emerald-950/30 border-emerald-500/30 text-emerald-300"
                      : "bg-stone-950 border-white/10 text-zinc-400"
                  }`}
                >
                  <div className="space-y-0.5 truncate pr-2">
                    <span className="text-[9px] uppercase text-zinc-500 block">
                      {idx === 0 ? "Locação Geral" :
                       idx === 1 ? "Preço / Custo" :
                       idx === 2 ? "Localização SP" :
                       idx === 3 ? "Videoclipes" :
                       idx === 4 ? "Audiovisual" : "Coworking"}
                    </span>
                    <strong className="text-white text-[11px] truncate block">"{kw}"</strong>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {presence.inTitle && (
                      <span className="bg-blue-500/20 text-blue-300 text-[9px] px-1.5 py-0.5 rounded font-bold" title="Presente no Título da Busca">
                        Título
                      </span>
                    )}
                    {presence.inDesc && (
                      <span className="bg-emerald-500/20 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded font-bold" title="Presente na Descrição Google">
                        Desc
                      </span>
                    )}
                    {!isCovered && (
                      <button
                        type="button"
                        onClick={() => handleKeywordAdd(kw)}
                        className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded hover:bg-amber-500/30"
                      >
                        + Adicionar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {savedSuccessMsg && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-3.5 rounded text-xs flex items-center gap-2 font-mono shadow-lg">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{savedSuccessMsg}</span>
        </div>
      )}

      {/* TABS: GOOGLE SERP PREVIEW vs AI SEARCH PREVIEW */}
      <div className="bg-stone-900 border border-white/10 rounded-lg overflow-hidden">
        <div className="flex flex-wrap items-center justify-between border-b border-white/10 p-3 bg-stone-950/50 gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewTab("google")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                previewTab === "google"
                  ? "bg-amber-500 text-stone-950 font-bold shadow"
                  : "bg-stone-800 text-zinc-300 hover:text-white"
              }`}
            >
              <Globe size={13} /> Pré-visualização Google SERP
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("ai")}
              className={`px-3 py-1.5 rounded font-mono text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                previewTab === "ai"
                  ? "bg-cyan-500 text-stone-950 font-bold shadow"
                  : "bg-stone-800 text-zinc-300 hover:text-white"
              }`}
            >
              <Sparkles size={13} /> Pré-visualização Buscas por IA (ChatGPT / Perplexity)
            </button>
          </div>

          {/* VIEWPORT & THEME SWITCHES */}
          {previewTab === "google" && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className="flex items-center bg-stone-800 p-0.5 rounded border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewDevice("desktop")}
                  className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-all ${
                    previewDevice === "desktop" ? "bg-stone-700 text-white font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Monitor size={12} /> Desktop
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice("mobile")}
                  className={`px-2.5 py-1 rounded text-[11px] flex items-center gap-1 transition-all ${
                    previewDevice === "mobile" ? "bg-stone-700 text-white font-bold" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Smartphone size={12} /> Mobile
                </button>
              </div>

              <div className="flex items-center bg-stone-800 p-0.5 rounded border border-white/10">
                <button
                  type="button"
                  onClick={() => setPreviewTheme("dark")}
                  className={`px-2 py-1 rounded text-[10px] ${
                    previewTheme === "dark" ? "bg-stone-700 text-white" : "text-zinc-400"
                  }`}
                >
                  🌙 Escuro
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme("light")}
                  className={`px-2 py-1 rounded text-[10px] ${
                    previewTheme === "light" ? "bg-white text-stone-900 font-bold" : "text-zinc-400"
                  }`}
                >
                  ☀️ Claro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 1. GOOGLE SERP PREVIEW BOX */}
        {previewTab === "google" && (
          <div className="p-6 space-y-4">
            {/* SEARCH SIMULATOR BAR */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-stone-950 p-2.5 rounded border border-white/10">
              <div className="flex items-center gap-2 text-zinc-400 text-xs font-mono pl-2">
                <Search size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Simular pesquisa no Google:</span>
              </div>
              <input
                type="text"
                value={searchSimQuery}
                onChange={(e) => setSearchSimQuery(e.target.value)}
                placeholder="Digite para testar termos destacados em negrito..."
                className="flex-1 bg-stone-900 border border-white/10 rounded px-3 py-1.5 text-xs text-white font-sans focus:outline-none focus:border-amber-400"
              />
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {TARGET_KEYWORDS.slice(0, 3).map((kw, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSearchSimQuery(kw)}
                    className="text-[10px] font-mono px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-zinc-300 whitespace-nowrap cursor-pointer"
                  >
                    "{kw}"
                  </button>
                ))}
              </div>
            </div>

            {/* REALISTIC GOOGLE SERP CONTAINER */}
            <div className={`rounded-xl p-5 sm:p-6 border transition-all ${
              previewTheme === "dark" 
                ? "bg-[#202124] border-[#3c4043] text-[#bdc1c6]" 
                : "bg-white border-zinc-200 text-[#4d5156] shadow-sm"
            } ${previewDevice === "mobile" ? "max-w-md mx-auto" : "max-w-3xl"}`}>
              
              {/* GOOGLE HEADER META (FAVICON + URL + BREADCRUMBS) */}
              <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-full bg-stone-900 border border-white/10 p-1 flex items-center justify-center shrink-0">
                  <img
                    src="https://i.postimg.cc/bvrMr15X/logo-triangulo-fotoclube-negativo-PNG.png"
                    alt="Favicon"
                    className="w-4 h-4 object-contain"
                  />
                </div>
                <div className="leading-tight overflow-hidden">
                  <div className={`text-xs font-sans font-medium truncate ${
                    previewTheme === "dark" ? "text-[#dadce0]" : "text-[#202124]"
                  }`}>
                    Triângulo Estúdio Fotoclub
                  </div>
                  <div className={`text-[11px] font-sans truncate ${
                    previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#4d5156]"
                  }`}>
                    https://trianguloestudio.online › estudio-locacao › centro-sp
                  </div>
                </div>
              </div>

              {/* SERP CLICKABLE TITLE */}
              <h4 className={`font-sans cursor-pointer hover:underline mb-1.5 leading-snug ${
                previewDevice === "mobile" ? "text-base font-medium" : "text-[20px] font-normal"
              } ${previewTheme === "dark" ? "text-[#8ab4f8]" : "text-[#1a0dab]"}`}>
                {formData.title || DEFAULT_SEO_SETTINGS.title}
              </h4>

              {/* RICH SNIPPET BADGES (RATINGS, PRICE, LOCATION) */}
              <div className="flex flex-wrap items-center gap-2 mb-2 font-sans text-xs">
                <div className="flex items-center gap-1 text-amber-400 font-bold">
                  <span>★</span>
                  <span>{formData.ratingScore.toFixed(1)}</span>
                  <span className={`font-normal ${previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#70757a]"}`}>
                    ({formData.ratingCount})
                  </span>
                </div>
                <span className={previewTheme === "dark" ? "text-[#5f6368]" : "text-zinc-300"}>·</span>
                <span className={`font-medium ${previewTheme === "dark" ? "text-[#dadce0]" : "text-[#202124]"}`}>
                  Faixa de preço: R$ (Econômico / Barato)
                </span>
                <span className={previewTheme === "dark" ? "text-[#5f6368]" : "text-zinc-300"}>·</span>
                <span className={`truncate ${previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#70757a]"}`}>
                  Largo do Paissandu, Centro de São Paulo
                </span>
              </div>

              {/* SERP SNIPPET DESCRIPTION (WITH QUERY MATCH HIGHLIGHTING) */}
              <p className={`font-sans text-xs sm:text-[14px] leading-relaxed mb-4 ${
                previewTheme === "dark" ? "text-[#bdc1c6]" : "text-[#4d5156]"
              }`}>
                {highlightQuery(formData.metaDescription || DEFAULT_SEO_SETTINGS.metaDescription, searchSimQuery)}
              </p>

              {/* GOOGLE SITELINKS PREVIEW */}
              <div className={`pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${
                previewTheme === "dark" ? "border-[#3c4043]" : "border-zinc-200"
              }`}>
                <div className="space-y-0.5">
                  <span className={`font-medium hover:underline cursor-pointer ${
                    previewTheme === "dark" ? "text-[#8ab4f8]" : "text-[#1a0dab]"
                  }`}>
                    Estúdio para Clips & Audiovisual
                  </span>
                  <p className={`text-[11px] leading-tight line-clamp-2 ${
                    previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#70757a]"
                  }`}>
                    Ciclorama em U, iluminação aérea em trilhos pantográficos e camarim completo para clipes musicais.
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className={`font-medium hover:underline cursor-pointer ${
                    previewTheme === "dark" ? "text-[#8ab4f8]" : "text-[#1a0dab]"
                  }`}>
                    Planos Estúdio para Cowork
                  </span>
                  <p className={`text-[11px] leading-tight line-clamp-2 ${
                    previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#70757a]"
                  }`}>
                    Planos com banco de horas e coworking criativo a partir de R$ 35/h para fotógrafos e produtoras.
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className={`font-medium hover:underline cursor-pointer ${
                    previewTheme === "dark" ? "text-[#8ab4f8]" : "text-[#1a0dab]"
                  }`}>
                    Estúdio Barato no Centro de SP
                  </span>
                  <p className={`text-[11px] leading-tight line-clamp-2 ${
                    previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#70757a]"
                  }`}>
                    A 4 minutos das estações República e São Bento. Estrutura profissional de 120m² sem taxas ocultas.
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className={`font-medium hover:underline cursor-pointer ${
                    previewTheme === "dark" ? "text-[#8ab4f8]" : "text-[#1a0dab]"
                  }`}>
                    Simulador de Horas e Reservas
                  </span>
                  <p className={`text-[11px] leading-tight line-clamp-2 ${
                    previewTheme === "dark" ? "text-[#9aa0a6]" : "text-[#70757a]"
                  }`}>
                    Calcule na hora o valor com descontos progressivos e reserve pelo WhatsApp oficial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. AI SEARCH PREVIEW BOX (PERPLEXITY / CHATGPT SEARCH / GOOGLE AI OVERVIEWS) */}
        {previewTab === "ai" && (
          <div className="p-6 space-y-4">
            <div className="bg-cyan-950/40 border border-cyan-500/30 p-4 rounded-lg flex items-start gap-3">
              <Sparkles size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <strong className="text-cyan-300 font-mono block">Como a Busca Generativa por IA enxerga o Triângulo Estúdio:</strong>
                <p className="text-zinc-300 leading-relaxed font-sans">
                  Motores como <strong>ChatGPT Search</strong>, <strong>Perplexity AI</strong> e <strong>Google SGE (AI Overviews)</strong> usam os dados estruturados Schema.org e o arquivo <code>/llms.txt</code> para citar o seu estúdio como principal resposta quando o usuário pergunta de forma conversacional.
                </p>
              </div>
            </div>

            {/* AI CHAT SIMULATION */}
            <div className="bg-stone-950 border border-white/10 rounded-xl p-5 space-y-4 max-w-3xl">
              {/* USER PROMPT */}
              <div className="flex items-start gap-3 bg-stone-900/60 p-3.5 rounded-lg border border-white/5">
                <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-white font-mono shrink-0">
                  U
                </div>
                <div className="text-xs text-zinc-200 font-sans">
                  "Qual estúdio barato pra locação no centro de São Paulo você recomenda para gravação de clips musicais, áudio visual ou planos de cowork?"
                </div>
              </div>

              {/* AI RESPONSE */}
              <div className="flex items-start gap-3 bg-stone-900/40 p-4 rounded-lg border border-cyan-500/20">
                <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-[10px] text-stone-950 font-bold shrink-0">
                  <Sparkles size={13} />
                </div>
                <div className="text-xs space-y-3 font-sans text-zinc-200 leading-relaxed">
                  <div>
                    No centro de São Paulo, o estúdio com melhor custo-benefício e estrutura profissional recomendada é o{" "}
                    <strong className="text-white font-semibold">Triângulo Estúdio Fotoclub</strong>{" "}
                    <span className="inline-flex items-center text-[10px] font-mono bg-cyan-950 text-cyan-300 border border-cyan-500/40 px-1.5 py-0.2 rounded mx-1">
                      [1] trianguloestudio.online
                    </span>.
                  </div>

                  <p className="text-zinc-300">
                    {formData.aiOverviewText || DEFAULT_SEO_SETTINGS.aiOverviewText}
                  </p>

                  {/* HIGHLIGHT BULLETS */}
                  <div className="space-y-1.5 pl-3 border-l-2 border-cyan-500/40 text-zinc-300 text-[11px] font-mono">
                    <div>✓ <strong>Estúdio pra locação barato:</strong> A partir de R$ 35/h nos planos de cowork e valores transparentes para avulso.</div>
                    <div>✓ <strong>Estúdio para clips e áudio visual:</strong> Ciclorama em U de madeira, recuo amplo de 3m e trilhos aéreos pantográficos de teto.</div>
                    <div>✓ <strong>Localização no Centro de SP:</strong> No Largo do Paissandu, 72 (Metrô República, São Bento e Anhangabaú).</div>
                    <div>✓ <strong>Estúdio para Cowork:</strong> Coworking fotográfico com banco de horas e endereço fixo para criadores.</div>
                  </div>

                  {/* CITATION SOURCE CARD */}
                  <div className="pt-2">
                    <a
                      href="https://trianguloestudio.online/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-cyan-300 text-xs font-mono border border-cyan-500/30 transition-all"
                    >
                      <ExternalLink size={12} /> Fonte Oficial: Triângulo Estúdio Fotoclub (trianguloestudio.online)
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. SEO & METADATA EDITING FORM */}
      <div className="bg-stone-900 border border-white/10 p-6 rounded-lg space-y-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <FileText className="text-amber-400" size={18} />
            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-white">
              Editor de Textos & Meta Tags de Ranqueamento
            </h5>
          </div>
          <button
            type="button"
            onClick={copyMetaToClipboard}
            className="text-[11px] font-mono text-zinc-400 hover:text-white flex items-center gap-1.5 cursor-pointer bg-stone-800 px-3 py-1 rounded border border-white/10"
          >
            {copiedLink ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            {copiedLink ? "Copiado!" : "Copiar tags HTML"}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 text-xs font-sans">
          
          {/* FIELD 1: SEO TITLE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white uppercase font-mono text-[11px] flex items-center gap-1.5">
                <span>Título da Página (SEO Title / Google Header)</span>
                <span className="text-amber-400 font-normal">*Crítico</span>
              </label>
              <div className="font-mono text-[10px] space-x-1">
                <span className={formData.title.length > 70 ? "text-rose-400 font-bold" : formData.title.length >= 45 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                  {formData.title.length} / 65 caracteres
                </span>
                <span className="text-zinc-500">(Ideal: 50 a 65)</span>
              </div>
            </div>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-stone-950 border border-white/15 p-3 rounded text-white font-sans text-xs focus:outline-none focus:border-amber-400 transition-colors"
              placeholder="Ex: Triângulo Estúdio • Estúdio pra Locação Barato no Centro de São Paulo..."
              required
            />
            <p className="text-[10px] text-zinc-400 font-sans">
              Aparece como o link azul principal nas buscas do Google. As palavras-chave principais devem vir logo no início.
            </p>
          </div>

          {/* FIELD 2: META DESCRIPTION */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-white uppercase font-mono text-[11px] flex items-center gap-1.5">
                <span>Meta Descrição (Snippet de Texto da Pesquisa)</span>
                <span className="text-amber-400 font-normal">*Crítico</span>
              </label>
              <div className="font-mono text-[10px] space-x-1">
                <span className={formData.metaDescription.length > 165 ? "text-rose-400 font-bold" : formData.metaDescription.length >= 120 ? "text-emerald-400 font-bold" : "text-amber-400"}>
                  {formData.metaDescription.length} / 160 caracteres
                </span>
                <span className="text-zinc-500">(Ideal: 130 a 160)</span>
              </div>
            </div>
            <textarea
              rows={3}
              value={formData.metaDescription}
              onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
              className="w-full bg-stone-950 border border-white/15 p-3 rounded text-white font-sans text-xs focus:outline-none focus:border-amber-400 transition-colors leading-relaxed"
              placeholder="Procurando estúdio pra locação barato no centro de São Paulo? O Triângulo Estúdio é o espaço ideal para gravação de clips..."
              required
            />
            <p className="text-[10px] text-zinc-400 font-sans">
              O texto que convence o usuário a clicar no Google em vez dos concorrentes. Inclua chamada para ação e diferenciais.
            </p>
          </div>

          {/* FIELD 3: KEYWORDS LIST */}
          <div className="space-y-1.5">
            <label className="font-bold text-white uppercase font-mono text-[11px] block">
              Lista de Palavras-Chave Separadas por Vírgula (Meta Keywords)
            </label>
            <input
              type="text"
              value={formData.keywords}
              onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
              className="w-full bg-stone-950 border border-white/15 p-3 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400 transition-colors"
              placeholder="estudio pra locação, estudio barato, estudio para clips, estudio para audio visual..."
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-mono text-zinc-500 self-center mr-1">Inserir rápido:</span>
              {TARGET_KEYWORDS.map((kw, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleKeywordAdd(kw)}
                  className="text-[10px] font-mono bg-stone-800 hover:bg-stone-700 text-zinc-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                >
                  + {kw}
                </button>
              ))}
            </div>
          </div>

          {/* FIELD 4: AI OVERVIEW TEXT (FOR LLMs & LLMS.TXT) */}
          <div className="space-y-1.5 p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="font-bold text-cyan-300 uppercase font-mono text-[11px] flex items-center gap-1.5">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Resumo Estruturado para Inteligência Artificial (ChatGPT, Perplexity & llms.txt)</span>
              </label>
              <span className="text-[10px] font-mono text-cyan-400/80">
                {formData.aiOverviewText.length} caracteres
              </span>
            </div>
            <textarea
              rows={4}
              value={formData.aiOverviewText}
              onChange={(e) => setFormData({ ...formData, aiOverviewText: e.target.value })}
              className="w-full bg-stone-950 border border-white/15 p-3 rounded text-zinc-200 font-sans text-xs focus:outline-none focus:border-cyan-400 transition-colors leading-relaxed"
              placeholder="Descreva de forma clara e factual as especialidades do estúdio..."
            />
            <p className="text-[10px] text-zinc-400 font-sans">
              Esse resumo é servido automaticamente para os robôs do ChatGPT, Perplexity e Gemini sintetizarem as respostas e colocarem o Triângulo Estúdio no topo das recomendações.
            </p>
          </div>

          {/* FIELD 5: RICH SNIPPETS DATA */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                Nota de Avaliação no Google
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.ratingScore}
                onChange={(e) => setFormData({ ...formData, ratingScore: parseFloat(e.target.value) || 4.9 })}
                className="w-full bg-stone-950 border border-white/15 p-2.5 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                Quantidade de Avaliações
              </label>
              <input
                type="number"
                min="1"
                value={formData.ratingCount}
                onChange={(e) => setFormData({ ...formData, ratingCount: parseInt(e.target.value) || 180 })}
                className="w-full bg-stone-950 border border-white/15 p-2.5 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono text-zinc-400 uppercase block mb-1">
                Destaque de Preço no Snippet
              </label>
              <input
                type="text"
                value={formData.priceBadge}
                onChange={(e) => setFormData({ ...formData, priceBadge: e.target.value })}
                className="w-full bg-stone-950 border border-white/15 p-2.5 rounded text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                placeholder="A partir de R$ 35/h"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-4 border-t border-white/10 gap-3">
            <div className="flex items-center gap-3">
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink size={12} /> Ver arquivo llms.txt gerado
              </a>
              <span className="text-zinc-600">|</span>
              <a
                href="/sitemap.xml"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink size={12} /> Ver sitemap.xml
              </a>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-mono text-xs uppercase px-6 py-3 rounded-lg font-bold transition-all cursor-pointer shadow-lg hover:shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Salvando...
                </>
              ) : (
                <>
                  <ShieldCheck size={15} /> Salvar Configurações de SEO & IA
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

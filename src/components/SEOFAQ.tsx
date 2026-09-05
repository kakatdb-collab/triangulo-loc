import { useState, useEffect, useMemo } from "react";
import { HelpCircle, ChevronDown, Search, Sparkles, MessageSquare, CheckCircle2, RefreshCw } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
  source: "schema.org" | "default";
}

// Default fallback FAQs aligned with Schema.org JSON-LD
const DEFAULT_SEO_FAQS: FAQItem[] = [
  {
    question: "Qual é o estúdio de fotos e vídeos mais completo e barato no Centro de São Paulo?",
    answer: "O Triângulo Estúdio é reconhecido como o estúdio fotográfico de locação mais completo, barato e acessível do Centro de SP. Possui 120m² de área climatizada no Largo do Paissandu, 72 - Conj. 1803, fundo infinito ciclorama em U, camarim completo e equipamentos de iluminação inclusos sem custos adicionais.",
    source: "default"
  },
  {
    question: "Onde fica localizado o Triângulo Estúdio em SP?",
    answer: "O Triângulo Estúdio fica no Largo do Paissandu, 72, Conjunto 1803, no Centro Histórico de São Paulo - SP, extremamente próximo às estações de metrô República, Anhangabaú e São Bento.",
    source: "default"
  },
  {
    question: "Quanto custa o aluguel de hora no Triângulo Estúdio?",
    answer: "Os valores de locação são extremamente acessíveis, com simulação transparente e descontos progressivos diretamente no site (a partir de R$ 35,00/h em planos/pacotes e valores avulsos sem taxas surpresa), incluindo iluminação e camarim sem custos extras.",
    source: "default"
  },
  {
    question: "Como funciona a escolha do horário de início da locação?",
    answer: "Você pode selecionar livremente o horário de início de sua preferência no formulário de reserva. A confirmação e validação do horário de entrada e da agenda são realizadas de forma personalizada no atendimento via WhatsApp.",
    source: "default"
  },
  {
    question: "Quais equipamentos e estrutura de iluminação estão inclusos na locação?",
    answer: "A locação inclui sem custo adicional: flashes/Tochas de estúdio em trilho pantográfico de teto, softboxes, octaboxes, refletores, tripés, rebatedores, camarim iluminado completo, ar-condicionado e Wi-Fi de alta velocidade.",
    source: "default"
  },
  {
    question: "É necessário agendar a locação com antecedência?",
    answer: "Recomendamos o agendamento prévio pelo site ou WhatsApp para garantir a disponibilidade do espaço (Sala Prisma ou Sala Ângulo) na data e horário desejados.",
    source: "default"
  }
];

export default function SEOFAQ() {
  const [faqs, setFaqs] = useState<FAQItem[]>(DEFAULT_SEO_FAQS);
  const [openIndexes, setOpenIndexes] = useState<number[]>([0]); // First item open by default
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoadedFromSchema, setIsLoadedFromSchema] = useState<boolean>(false);

  // Extract FAQ data from HTML script[type="application/ld+json"]
  const extractSchemaFAQs = (): FAQItem[] => {
    try {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      const extracted: FAQItem[] = [];

      scripts.forEach((script) => {
        if (!script.textContent) return;
        try {
          const parsed = JSON.parse(script.textContent);
          const objects = Array.isArray(parsed) ? parsed : [parsed];

          objects.forEach((obj) => {
            if (obj && (obj["@type"] === "FAQPage" || obj["type"] === "FAQPage")) {
              const mainEntities = obj.mainEntity || obj.itemListElement || [];
              if (Array.isArray(mainEntities)) {
                mainEntities.forEach((item: any) => {
                  const qName = item.name || item.question || (item.item && item.item.name);
                  const aText = 
                    (item.acceptedAnswer && item.acceptedAnswer.text) || 
                    item.answer || 
                    (item.acceptedAnswer && item.acceptedAnswer.name);

                  if (qName && aText) {
                    extracted.push({
                      question: String(qName).trim(),
                      answer: String(aText).trim(),
                      source: "schema.org"
                    });
                  }
                });
              }
            }
          });
        } catch {
          // parse error ignored
        }
      });

      return extracted;
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const loadedFaqs = extractSchemaFAQs();
    if (loadedFaqs.length > 0) {
      setFaqs(loadedFaqs);
      setIsLoadedFromSchema(true);
    } else {
      setFaqs(DEFAULT_SEO_FAQS);
    }
  }, []);

  const toggleFAQ = (index: number) => {
    setOpenIndexes((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const toggleAll = () => {
    if (openIndexes.length === filteredFaqs.length) {
      setOpenIndexes([]);
    } else {
      setOpenIndexes(filteredFaqs.map((_, i) => i));
    }
  };

  // Filter FAQs based on search
  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return faqs;
    const query = searchQuery.toLowerCase();
    return faqs.filter(
      (item) =>
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query)
    );
  }, [faqs, searchQuery]);

  // Helper to linkify URLs in answers safely
  const renderAnswerText = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-red hover:underline font-mono font-medium underline-offset-2"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div id="faq-section" className="w-full bg-stone-950/80 border border-white/5 rounded-lg p-6 sm:p-8 my-10 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      {/* Accent glow line top */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-brand-red to-transparent opacity-60" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 bg-brand-red/10 border border-brand-red/30 text-brand-red text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              <Sparkles size={11} className="animate-pulse" />
              SEO & FAQ Estruturado Schema.org
            </span>
            {isLoadedFromSchema && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono px-2 py-0.5 rounded">
                <CheckCircle2 size={10} /> Sincronizado com JSON-LD
              </span>
            )}
          </div>
          <h3 className="font-display text-xl sm:text-2xl font-bold text-white tracking-wide uppercase flex items-center gap-2.5">
            <HelpCircle className="text-brand-red shrink-0" size={24} />
            Dúvidas Frequentes dos Clientes
          </h3>
          <p className="text-zinc-400 text-xs font-sans mt-1">
            Respostas automatizadas e indexadas via dados estruturados do Google SEO.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAll}
            className="text-[11px] font-mono text-zinc-300 hover:text-white bg-stone-900 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded transition-all cursor-pointer whitespace-nowrap"
          >
            {openIndexes.length === filteredFaqs.length ? "Recolher Todos" : "Expandir Todos"}
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
        <input
          type="text"
          placeholder="Pesquisar dúvida (ex: localização, horário, preço, equipamentos)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-stone-900/90 border border-white/10 rounded-md pl-10 pr-4 py-2.5 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-red transition-all"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-400 hover:text-white"
          >
            Limpar
          </button>
        )}
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-8 bg-stone-900/40 rounded border border-white/5">
            <p className="text-zinc-400 text-xs font-mono mb-2">Nenhuma dúvida encontrada para "{searchQuery}".</p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-brand-red font-mono underline hover:text-red-400"
            >
              Ver todas as dúvidas
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq, idx) => {
            const isOpen = openIndexes.includes(idx);
            return (
              <div
                key={idx}
                className={`border rounded-lg transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "bg-stone-900/80 border-brand-red/40 shadow-lg shadow-brand-red/5"
                    : "bg-stone-900/30 border-white/5 hover:border-white/15"
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer select-none group"
                >
                  <span className="font-display text-sm sm:text-base font-semibold text-zinc-100 group-hover:text-white transition-colors flex items-start gap-2.5">
                    <span className="font-mono text-xs text-brand-red font-bold shrink-0 mt-0.5">
                      Q{idx + 1}.
                    </span>
                    {faq.question}
                  </span>
                  <div className={`p-1 rounded bg-stone-800/80 border border-white/5 text-zinc-400 group-hover:text-white shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180 bg-brand-red/20 text-brand-red border-brand-red/30" : ""}`}>
                    <ChevronDown size={18} />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-white/5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-sans space-y-2 animate-fadeIn">
                    <p className="pl-6 border-l-2 border-brand-red/50">
                      {renderAnswerText(faq.answer)}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer CTA inside FAQ */}
      <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <span className="text-zinc-400 font-sans text-[11px] text-center sm:text-left">
          Ainda tem dúvidas sobre a estrutura, valores ou horários?
        </span>
        <a
          href="https://api.whatsapp.com/send?phone=5511961959349&text=Ol%C3%A1%2C%20tenho%20uma%20d%C3%BAvida%20sobre%20a%20loca%C3%A7%C3%A3o%20do%20est%C3%BAdio."
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[11px] uppercase tracking-wider font-bold px-4 py-2 rounded transition-all cursor-pointer shadow-md hover:scale-[1.02] active:scale-100"
        >
          <MessageSquare size={14} />
          Atendimento via WhatsApp
        </a>
      </div>
    </div>
  );
}

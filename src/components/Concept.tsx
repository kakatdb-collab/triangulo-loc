/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Sliders, Eye, Zap, ChevronLeft, ChevronRight, Play, Pause, Video } from "lucide-react";
import { db, doc, onSnapshot } from "../lib/firebase";

function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

export default function Concept() {
  const [conceptData, setConceptData] = useState({
    badge: "Sobre Nós",
    title: "Nossa Base",
    description: "Escolhemos o triângulo para representar o nosso fotoclube por ser uma simbologia forte e com profunda relação com a fotografia: ele representa a relação entre os princípios básicos da exposição (ISO, diafragma, e velocidade do obturador) e os três pilares fundamentais que sustentam nossas produções corporativas, comerciais e autorais: Equipamento, Ambiente e Conexão.",
    videoUrls: [
      "https://www.youtube.com/embed/wjVz3E63tSM?autoplay=1&mute=1&loop=1&playlist=wjVz3E63tSM&controls=1"
    ],
    pillar1Title: "Equipamento",
    pillar1Desc: "Flashes Profoto de alto rendimento, acessórios de modelagem e câmeras de médio formato à disposição imediata para viabilizar seus projetos sem travas técnicas.",
    pillar2Title: "Ambiente",
    pillar2Desc: "Estúdios com arquitetura inteligente, climatizados, espaços amplos, isolamento acústico e luz natural abundante para total conforto e foco mental absoluto.",
    pillar3Title: "Conexão",
    pillar3Desc: "Muito mais que um espaço físico: um autêntico fotoclube para trocar referências, enriquecer portfólios, promover workshops e catalisar novos negócios em rede.",
    isoTitle: "ISO",
    isoDesc: "Representa a capacidade do sensor do clube em reagir à luz. Controla o grão conceitual e a pureza digital.",
    diafragmaTitle: "Diafragma",
    diafragmaDesc: "Define a profundidade de campo, controlando o bokeh de fundo e a nitidez dos detalhes do seu objeto principal.",
    obturadorTitle: "Obturador",
    obturadorDesc: "Modula a passagem temporal de luz: desde congelamentos instantâneos até rastros delicados de longa exposição."
  });

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site_settings", "concept"), (snap) => {
      if (snap.exists()) {
        const d = snap.data();

        let vUrls: string[] = [];
        if (Array.isArray(d.videoUrls) && d.videoUrls.length > 0) {
          vUrls = d.videoUrls.filter((u: any) => typeof u === "string" && u.trim().length > 0);
        } else if (d.videoUrl && typeof d.videoUrl === "string" && d.videoUrl.trim().length > 0) {
          vUrls = [d.videoUrl.trim()];
        }

        if (vUrls.length === 0) {
          vUrls = ["https://www.youtube.com/embed/wjVz3E63tSM?autoplay=1&mute=1&loop=1&playlist=wjVz3E63tSM&controls=1"];
        }

        setConceptData({
          badge: d.badge || "Sobre Nós",
          title: d.title || "Nossa Base",
          description: d.description || conceptData.description,
          videoUrls: vUrls,
          pillar1Title: d.pillar1Title || "Equipamento",
          pillar1Desc: d.pillar1Desc || conceptData.pillar1Desc,
          pillar2Title: d.pillar2Title || "Ambiente",
          pillar2Desc: d.pillar2Desc || conceptData.pillar2Desc,
          pillar3Title: d.pillar3Title || "Conexão",
          pillar3Desc: d.pillar3Desc || conceptData.pillar3Desc,
          isoTitle: d.isoTitle || "ISO",
          isoDesc: d.isoDesc || "Representa a capacidade do sensor do clube em reagir à luz. Controla o grão conceitual e a pureza digital.",
          diafragmaTitle: d.diafragmaTitle || "Diafragma",
          diafragmaDesc: d.diafragmaDesc || "Define a profundidade de campo, controlando o bokeh de fundo e a nitidez dos detalhes do seu objeto principal.",
          obturadorTitle: d.obturadorTitle || "Obturador",
          obturadorDesc: d.obturadorDesc || "Modula a passagem temporal de luz: desde congelamentos instantâneos até rastros delicados de longa exposição."
        });
      }
    });
    return () => unsub();
  }, []);

  // Timer to cycle through videos if more than 1 exists
  useEffect(() => {
    if (!isAutoRotating || conceptData.videoUrls.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % conceptData.videoUrls.length);
    }, 9000); // 9 seconds cycle

    return () => clearInterval(interval);
  }, [isAutoRotating, conceptData.videoUrls.length]);

  const handlePrevVideo = () => {
    setCurrentVideoIndex((prev) => (prev === 0 ? conceptData.videoUrls.length - 1 : prev - 1));
  };

  const handleNextVideo = () => {
    setCurrentVideoIndex((prev) => (prev + 1) % conceptData.videoUrls.length);
  };

  const exposurePillars = [
    {
      title: conceptData.isoTitle,
      meta: "Sensibilidade do Sensor",
      desc: conceptData.isoDesc,
      icon: Eye,
    },
    {
      title: conceptData.diafragmaTitle,
      meta: "Abertura da Lente",
      desc: conceptData.diafragmaDesc,
      icon: Sliders,
    },
    {
      title: conceptData.obturadorTitle,
      meta: "Velocidade de Captura",
      desc: conceptData.obturadorDesc,
      icon: Zap,
    },
  ];

  const spacePillars = [
    {
      title: conceptData.pillar1Title,
      desc: conceptData.pillar1Desc,
      color: "border-brand-red/30",
    },
    {
      title: conceptData.pillar2Title,
      desc: conceptData.pillar2Desc,
      color: "border-brand-red/30",
    },
    {
      title: conceptData.pillar3Title,
      desc: conceptData.pillar3Desc,
      color: "border-brand-red/30",
    },
  ];

  return (
    <section id="conceito" className="py-24 bg-stone-950 text-white relative overflow-hidden">
      {/* Subtle grid backing layout */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none opacity-40" />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Column - Content */}
          <div className="lg:col-span-7 flex flex-col items-start pr-0 lg:pr-8">
            
            {/* Divider element structured in red as required (#d93838) */}
            <div className="flex items-center gap-3 mb-6">
              <span className="w-8 h-[2px] bg-[#d93838] block" />
              <span className="text-[#d93838] font-mono text-xs uppercase tracking-widest font-semibold">
                {conceptData.badge}
              </span>
              <span className="w-2 h-[2px] bg-[#d93838] block" />
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-8">
              {conceptData.title}
            </h2>

            {/* Main Statement */}
            <p className="text-zinc-300 font-sans text-base sm:text-lg leading-relaxed font-light mb-10">
              {conceptData.description}
            </p>

            {/* Dynamic tabs/pills comparing the elements */}
            <div className="w-full mt-4">
              <div className="text-xs font-mono text-[#d93838] uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">
                ▲ O Triângulo de Exposição (Fotografia)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {exposurePillars.map((pillar) => (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    key={pillar.title}
                    className="p-4 rounded-sm bg-neutral-900/60 border border-white/5 hover:border-[#d93838]/40 transition-all duration-300 group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[#d93838] font-display font-medium text-lg">
                        {pillar.title}
                      </span>
                      <pillar.icon size={16} className="text-zinc-500 group-hover:text-[#d93838] transition-colors" />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 mb-1">
                      {pillar.meta}
                    </div>
                    <p className="text-xs text-zinc-500 leading-relaxed font-light">
                      {pillar.desc}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="text-xs font-mono text-[#d93838] uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">
                ▲ Os 3 Pilares do Nosso Fotoclube
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {spacePillars.map((pillar) => (
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    key={pillar.title}
                    className={`p-4 rounded-sm bg-stone-900 border ${pillar.color} transition-all duration-300`}
                  >
                    <h4 className="text-sm font-semibold font-display text-white border-b border-white/5 pb-2 mb-2">
                      {pillar.title}
                    </h4>
                    <p className="text-xs text-zinc-400 leading-relaxed font-light">
                      {pillar.desc}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column - Visual Graphic & Video Carousel */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative w-full max-w-sm sm:max-w-md aspect-square bg-[#111] p-2 border border-white/10 rounded-sm overflow-hidden group shadow-2xl shadow-black"
            >
              <iframe
                key={conceptData.videoUrls[currentVideoIndex] || currentVideoIndex}
                src={conceptData.videoUrls[currentVideoIndex] || conceptData.videoUrls[0]}
                title={`Estúdio Triângulo Vídeo ${currentVideoIndex + 1}`}
                className="w-full h-full rounded-sm border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>

              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-60 pointer-events-none" />
              
              {/* Overlay branding lines */}
              <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col pointer-events-none">
                <span className="font-mono text-[10px] text-brand-red uppercase tracking-[0.3em] mb-1 font-bold">
                  Simbologia Ativa
                </span>
                <span className="font-display text-sm font-bold text-white tracking-[0.1em] uppercase">
                  {conceptData.pillar1Title} • {conceptData.pillar2Title} • {conceptData.pillar3Title}
                </span>
              </div>

              {/* Top-Right Decorative Triangulation coordinates & Video counter */}
              <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                {conceptData.videoUrls.length > 1 && (
                  <span className="font-mono text-[9px] bg-brand-red text-white font-bold px-2 py-1 uppercase rounded tracking-widest flex items-center gap-1 shadow">
                    <Video size={10} /> VÍDEO {currentVideoIndex + 1}/{conceptData.videoUrls.length}
                  </span>
                )}
                <div className="font-mono text-[9px] text-white/50 tracking-widest bg-black/70 px-2 py-1 uppercase rounded">
                  ▲ F/1.4 | 1/250S | ISO 100
                </div>
              </div>

              {/* Navigation Arrows if > 1 video */}
              {conceptData.videoUrls.length > 1 && (
                <>
                  <button
                    onClick={handlePrevVideo}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-brand-red text-white p-2 rounded-full border border-white/20 backdrop-blur-sm transition-all cursor-pointer opacity-80 hover:opacity-100"
                    title="Vídeo Anterior"
                  >
                    <ChevronLeft size={18} />
                  </button>

                  <button
                    onClick={handleNextVideo}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 bg-black/70 hover:bg-brand-red text-white p-2 rounded-full border border-white/20 backdrop-blur-sm transition-all cursor-pointer opacity-80 hover:opacity-100"
                    title="Próximo Vídeo"
                  >
                    <ChevronRight size={18} />
                  </button>
                </>
              )}
            </motion.div>

            {/* Video Selector Pills / Controls below frame if > 1 video */}
            {conceptData.videoUrls.length > 1 && (
              <div className="mt-4 w-full max-w-sm sm:max-w-md bg-stone-900/80 border border-white/10 rounded p-2.5 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                  {conceptData.videoUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentVideoIndex(idx)}
                      className={cn(
                        "px-2.5 py-1 rounded text-[10px] font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1",
                        idx === currentVideoIndex
                          ? "bg-brand-red text-white border border-red-500 shadow"
                          : "bg-stone-950 text-zinc-400 hover:text-white border border-white/10"
                      )}
                    >
                      <Video size={10} /> Vídeo {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsAutoRotating(!isAutoRotating)}
                  className={cn(
                    "p-1.5 rounded text-[10px] font-mono border transition-all cursor-pointer flex items-center gap-1 shrink-0",
                    isAutoRotating
                      ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30"
                      : "bg-stone-950 text-zinc-400 border-white/10"
                  )}
                  title={isAutoRotating ? "Pausar Rotação Automática" : "Ativar Rotação Automática"}
                >
                  {isAutoRotating ? <Pause size={12} /> : <Play size={12} />}
                  <span className="hidden sm:inline">{isAutoRotating ? "AUTO" : "PAUSA"}</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </section>
  );
}


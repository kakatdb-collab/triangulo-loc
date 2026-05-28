/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Maximize, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles, 
  Camera, 
  Image as ImageIcon 
} from "lucide-react";
import { STUDIO_SPACES, ASSETS } from "../data";

interface SpacesProps {
  onSelectSpace: (spaceId: string) => void;
}

const PRISMA_PHOTOS = [
  {
    url: ASSETS.prismaStudioFirst,
    caption: "Estúdio principal com ciclorama em 'U' inovador, sofá Chesterfield e ampla iluminação aérea",
  },
  {
    url: "https://images.unsplash.com/photo-1616448242352-0d6df6cfab0e?auto=format&fit=crop&q=80&w=1000",
    caption: "Iluminação profissional e modificadores de luz de ponta inclusos",
  },
  {
    url: "https://triangulofotoclub.com.br/locacao/27%20-%20Varamda%20.jpg",
    caption: "Varanda charmosa e rústica integrada para ensaios ao ar livre e luz natural",
  },
  {
    url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&q=80&w=1000",
    caption: "Camarim mobiliado de alto padrão para maquiagem e cabelo",
  },
  {
    url: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=1000",
    caption: "Equipamentos de suporte premium, tripés e painéis refletores",
  },
  {
    url: "https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&q=80&w=1000",
    caption: "Grid de teto pantográfico para total controle do seu setup",
  }
];

export default function Spaces({ onSelectSpace }: SpacesProps) {
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const space = STUDIO_SPACES[0] || {
    id: "prisma",
    name: "Triângulo Estúdio",
    subtitle: "O infinito branco e iluminação profissional",
    description: "Equipado com um ciclorama(fundo infinito) de madeira branco em 'U', pé direito de 3m, Largura 3M, Profundidade 3M e mais 3 metros de recuo, trás ainda uma estrutura aérea de trilhos para iluminação. Perfeito para editoriais de moda, campanhas publicitárias de grande porte, videoclipes e produções que necessitam de fundo infinito ou iluminação técnica avançada. O estúdio tem escritório, um espaço aconchegante e rústico tipo quarto de AirnB com visual antigo e industrial, mobília vintage e uma varanda para compor com diversos trabalhos de foto e video.",
    hourlyRate: 100,
    halfDayRate: 400,
    fullDayRate: 700,
    capacity: 15,
    area: "120m²",
    features: [
      "Trilhos aéreos",
      "3 Tochas de estudio Godox com modificadores.",
      "Cortinas Blackout",
      "Copa",
      "Camarim (usando o ambiente do quarto cencio como camarim).",
    ],
  };

  return (
    <section id="espacos" className="py-24 bg-stone-900 text-white relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-[2px] bg-brand-red block" />
              <span className="text-brand-red font-mono text-xs uppercase tracking-widest font-semibold">
                Nosso Espaço
              </span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              {space.name}
            </h2>
          </div>
          <p className="text-zinc-400 font-light max-w-md mt-4 md:mt-0 leading-relaxed text-sm">
            Um estúdio completo, flexível e totalmente equipado no coração de São Paulo. Conheça cada detalhe através da nossa galeria exclusiva.
          </p>
        </div>

        {/* Studio Content Grid: Split Screen */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch" id="prisma-studio-layout">
          
          {/* Left/Side: High-End Photo Gallery (lg:col-span-7) */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-4" id="studio-gallery-panel">
            
            {/* Main Active Image View Box */}
            <div className="relative aspect-[3/2] sm:aspect-[16/10] bg-stone-950 rounded border border-white/5 overflow-hidden group shadow-2xl flex-grow">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activePhotoIdx}
                  src={PRISMA_PHOTOS[activePhotoIdx].url}
                  alt={PRISMA_PHOTOS[activePhotoIdx].caption}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </AnimatePresence>
              
              {/* Overlay Top Bar indicator */}
              <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-md px-3 py-1.5 text-[9px] font-mono uppercase tracking-wider text-white border border-white/10 rounded flex items-center gap-1.5">
                <Camera size={10} className="text-[#d93838]" />
                <span>Foto {activePhotoIdx + 1} de {PRISMA_PHOTOS.length}</span>
              </div>

              {/* Status Ribbon overlay */}
              <div className="absolute top-4 right-4 bg-[#d93838] px-3 py-1 text-[10px] font-mono uppercase tracking-widest font-bold rounded shadow-md text-white">
                Ciclorama Ativo
              </div>

              {/* Cover Bottom Gradient & Caption */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/45 to-transparent p-6 pt-12">
                <span className="text-xs font-mono uppercase text-[#d93838] block mb-1 tracking-wider">
                  Triângulo Estúdio • Diferenciais
                </span>
                <p className="text-sm text-zinc-200 font-light tracking-wide drop-shadow-sm">
                  {PRISMA_PHOTOS[activePhotoIdx].caption}
                </p>
              </div>

              {/* Subtle Tech Overlay Borders */}
              <div className="absolute inset-0 border border-white/5 pointer-events-none group-hover:border-[#d93838]/15 transition-all duration-500" />
            </div>

            {/* Thumbnail Navigation Row */}
            <div className="grid grid-cols-6 gap-2 sm:gap-3" id="gallery-navigation-thumbnails">
              {PRISMA_PHOTOS.map((photo, index) => (
                <button
                  key={index}
                  onClick={() => setActivePhotoIdx(index)}
                  className={`relative aspect-[4/3] rounded overflow-hidden border transition-all duration-300 ${
                    activePhotoIdx === index 
                      ? "border-[#d93838] scale-95 shadow-md shadow-[#d93838]/10" 
                      : "border-white/5 hover:border-white/20 filter brightness-75 hover:brightness-100"
                  }`}
                >
                  <img
                    src={photo.url}
                    alt={`Thumbnail ${index}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  {activePhotoIdx === index && (
                    <div className="absolute inset-0 bg-[#d93838]/10 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#d93838]" />
                    </div>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* Right/Side: Space Details Card Panel (lg:col-span-5) */}
          <div className="lg:col-span-5 flex flex-col" id="studio-details-panel">
            <div className="bg-stone-950 p-6 sm:p-8 rounded border border-white/10 hover:border-[#d93838]/20 transition-colors duration-500 h-full flex flex-col justify-between shadow-2xl relative overflow-hidden group">
              
              {/* Highlight subtle corner red bar */}
              <div className="absolute top-0 right-0 w-16 h-[2px] bg-[#d93838]" />
              
              <div>
                <div className="flex items-center justify-between gap-4 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#d93838] font-bold">
                    {space.subtitle}
                  </span>
                  <div className="bg-[#d93838]/5 border border-[#d93838]/30 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-300">
                    Estúdio Único
                  </div>
                </div>

                <h3 className="font-display font-black text-2xl sm:text-3xl text-white mb-4 group-hover:text-[#d93838] transition-colors">
                  {space.name}
                </h3>

                <p className="text-xs sm:text-sm text-zinc-400 font-light leading-relaxed mb-6">
                  {space.description}
                </p>

                {/* Specific Space Specs Grid */}
                <div className="grid grid-cols-2 gap-4 border-y border-white/10 py-4 mb-6 text-zinc-300">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[#d93838] shrink-0 border border-white/5">
                      <Users size={14} />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">Capacidade</span>
                      <span className="text-xs font-mono font-bold text-white">Até {space.capacity} pessoas</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded bg-white/5 flex items-center justify-center text-[#d93838] shrink-0 border border-white/5">
                      <Maximize size={14} />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase block">Área Útil</span>
                      <span className="text-xs font-mono font-bold text-white">{space.area}</span>
                    </div>
                  </div>
                </div>

                {/* Included features block */}
                <div className="space-y-2.5 mb-8">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 block mb-2">
                    Incluso em todas as locações:
                  </span>
                  {space.features.map((perk, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2.5 text-xs text-zinc-400 font-light">
                      <CheckCircle2 size={13} className="mt-0.5 text-[#d93838] shrink-0" />
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action layout */}
              <div className="pt-6 border-t border-white/10 mt-auto">
                <div className="flex flex-col sm:flex-row items-center sm:items-stretch justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <span className="text-[9px] font-mono uppercase text-zinc-500 block">
                      Valores Especiais
                    </span>
                    <span className="text-[11px] text-zinc-300 font-medium font-mono">
                      4h: R$ {space.halfDayRate} | 8h: R$ {space.fullDayRate}
                    </span>
                    <div className="text-lg font-bold text-white mt-1">
                      R$ {space.hourlyRate} <span className="text-xs font-mono text-zinc-500">/ hora</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onSelectSpace(space.id)}
                    className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-[#d93838] hover:bg-neutral-800 text-white hover:text-white font-mono text-xs uppercase tracking-wider px-6 py-4 rounded transition-all duration-300 active:scale-95 whitespace-nowrap border border-transparent hover:border-[#d93838]/40 cursor-pointer shadow-lg shadow-[#d93838]/10"
                  >
                    Reservar Estúdio
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Dynamic Concept Info Block */}
        <div className="mt-16 bg-stone-950 p-6 sm:p-8 rounded border border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded bg-brand-red/10 flex items-center justify-center border border-brand-red/20 text-brand-red shrink-0">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-display font-bold text-lg text-white mb-1">
                Precisa de assistência técnica em seu ensaio?
              </h4>
              <p className="text-xs text-zinc-400 font-light max-w-xl leading-relaxed">
                Nossos estúdios contam com assistência presencial de setup e auxílio básico de briefing. Você também pode alugar assistentes fotográficos avançados diretamente no nosso formulário abaixo.
              </p>
            </div>
          </div>
          <a
            href="#reservar"
            className="w-full md:w-auto bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase tracking-wider py-3 px-6 rounded text-center transition-all duration-300 cursor-pointer active:scale-95 shadow-md shadow-brand-red/10 shrink-0"
          >
            Faça um Orçamento Direto
          </a>
        </div>

      </div>
    </section>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, ChevronLeft, ChevronRight, Eye, Grid3X3 } from "lucide-react";
import { PORTFOLIO_GALLERY } from "../data";
import { PortfolioItem } from "../types";

export default function Portfolio() {
  const [activeFilter, setActiveFilter] = useState<string>("Todos");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  const categories = ["Todos", "Moda", "Retrato", "Produto", "Comercial"];

  const filteredItems = activeFilter === "Todos"
    ? PORTFOLIO_GALLERY
    : PORTFOLIO_GALLERY.filter(item => item.category === activeFilter);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedItemIndex !== null) {
      setSelectedItemIndex((selectedItemIndex + 1) % filteredItems.length);
    }
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedItemIndex !== null) {
      setSelectedItemIndex((selectedItemIndex - 1 + filteredItems.length) % filteredItems.length);
    }
  };

  return (
    <section id="portfolio" className="py-24 bg-stone-950 text-white relative">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-brand-red" />
            <span className="text-brand-red font-mono text-xs uppercase tracking-widest font-semibold">
              Galeria do Clube
            </span>
            <span className="w-6 h-[2px] bg-brand-red" />
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-4">
            Produzido no Triângulo
          </h2>
          <p className="text-zinc-400 font-sans text-sm font-light leading-relaxed">
            Navegue pelos editoriais, testes e ensaios criados de ponta a ponta em nossos sets de iluminação. Inspiração real sob o olhar de fotógrafos parceiros.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4 mb-12">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setActiveFilter(cat);
                setSelectedItemIndex(null); // Reset lightbox on filter change
              }}
              className={`font-mono text-[10px] sm:text-xs uppercase tracking-widest px-4 py-2 rounded-sm transition-all duration-300 border cursor-pointer ${
                activeFilter === cat
                  ? "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/15"
                  : "bg-stone-900 text-zinc-400 border-white/5 hover:text-white hover:border-white/20"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Portfolio Masonry Grid */}
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-1 bg-stone-900/30 rounded-sm"
        >
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item: PortfolioItem, index) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.4 }}
                key={item.id}
                onClick={() => setSelectedItemIndex(index)}
                className="group relative aspect-square sm:aspect-[3/4] overflow-hidden bg-neutral-900 rounded-sm cursor-pointer border border-white/5"
              >
                {/* Photo */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105 group-hover:blur-[1px]"
                />

                {/* Translucent Glass Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex flex-col justify-end p-4 sm:p-5">
                  <span className="text-[9px] font-mono uppercase bg-brand-red text-white px-2 py-0.5 rounded-sm w-fit mb-2 font-bold tracking-widest shadow">
                    {item.category}
                  </span>
                  <h4 className="font-display font-bold text-white text-sm sm:text-base tracking-tight leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] font-mono text-zinc-400 mt-1">
                    por {item.photographer}
                  </p>
                  
                  {/* Circle explore indicators */}
                  <div className="absolute top-4 right-4 bg-brand-red/90 w-8 h-8 rounded-full flex items-center justify-center scale-0 group-hover:scale-100 transition-all duration-300 shadow">
                    <Eye size={12} className="text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty list handler */}
        {filteredItems.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center justify-center border border-dashed border-white/10 rounded">
            <Grid3X3 className="text-zinc-600 mb-4 animate-bounce" size={32} />
            <p className="font-mono text-xs text-zinc-500 uppercase tracking-widest">
              Nenhuma imagem cadastrada nesta seção.
            </p>
          </div>
        )}

        {/* Lightroom/Lightbox Modal Theater */}
        <AnimatePresence>
          {selectedItemIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedItemIndex(null)}
              className="fixed inset-0 bg-black/95 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
            >
              {/* Back close trigger */}
              <button
                onClick={() => setSelectedItemIndex(null)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors p-2 bg-stone-900/50 rounded-full border border-white/10 cursor-pointer"
              >
                <X size={20} />
              </button>

              {/* Prev Trigger */}
              <button
                onClick={handlePrev}
                className="absolute left-4 p-3 bg-stone-900/50 hover:bg-brand-red text-white border border-white/5 hover:border-transparent rounded-full font-mono transition-all duration-300 cursor-pointer active:scale-95"
              >
                <ChevronLeft size={24} />
              </button>

              {/* Inner modal card with photo and metadata details */}
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.95 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[85vh] bg-[#111] rounded-sm border border-white/10 overflow-hidden flex flex-col md:flex-row relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
              >
                {/* Image panel */}
                <div className="flex-grow flex items-center justify-center bg-black/50 p-2 overflow-hidden aspect-[4/3] md:aspect-auto md:max-w-xl lg:max-w-2xl">
                  <img
                    src={filteredItems[selectedItemIndex].imageUrl}
                    alt={filteredItems[selectedItemIndex].title}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[70vh] object-contain rounded-sm"
                  />
                </div>

                {/* Meta details panel */}
                <div className="p-6 md:p-8 flex flex-col justify-between w-full md:w-80 lg:w-96 bg-stone-950 shrink-0 border-t md:border-t-0 md:border-l border-white/5">
                  <div>
                    <span className="font-mono text-[9px] uppercase tracking-widest text-brand-red bg-brand-red/10 px-2.5 py-1 rounded-sm border border-brand-red/20 font-bold block w-fit mb-4">
                      {filteredItems[selectedItemIndex].category}
                    </span>
                    <h3 className="font-display font-black text-2xl sm:text-3xl text-white uppercase tracking-tight mb-2">
                      {filteredItems[selectedItemIndex].title}
                    </h3>
                    <div className="w-12 h-1 bg-brand-red mb-6" />

                    <div className="space-y-4">
                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                          Fotógrafo Co-criador
                        </span>
                        <span className="text-sm font-sans text-zinc-300 font-medium">
                          {filteredItems[selectedItemIndex].photographer}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-mono text-zinc-500 uppercase block mb-0.5">
                          Local do Setup
                        </span>
                        <span className="text-sm font-sans text-zinc-300 font-light block">
                          Triângulo Fotoclub • São Paulo, SP
                        </span>
                      </div>

                      <div className="border-t border-white/5 pt-4 mt-4 bg-stone-900/30 p-3 rounded border">
                        <span className="text-[10px] font-mono text-brand-red uppercase block mb-1 font-bold">
                          ▲ Configurações Sugeridas (Base):
                        </span>
                        <p className="text-[11px] font-mono text-zinc-400 leading-relaxed font-light">
                          ISO 100-200, Diafragma f/5.6 ou f/8 (nitidez máxima comercial) e speed 1/160s para tochas aéreas sincronizadas por triggers universais inclusos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-2">
                    <a
                      href="#reservar"
                      onClick={() => setSelectedItemIndex(null)}
                      className="w-full bg-[#d93838] hover:bg-red-700 text-white font-mono text-xs uppercase tracking-widest text-center py-3 rounded-sm transition-all duration-300 cursor-pointer shadow-md shadow-brand-red/10"
                    >
                      Reservar Espaço
                    </a>
                    <button
                      onClick={() => setSelectedItemIndex(null)}
                      className="w-full border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-widest text-center py-2.5 rounded-sm transition-all duration-300 cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Next Trigger */}
              <button
                onClick={handleNext}
                className="absolute right-4 p-3 bg-stone-900/50 hover:bg-brand-red text-white border border-white/5 hover:border-transparent rounded-full font-mono transition-all duration-300 cursor-pointer active:scale-95"
              >
                <ChevronRight size={24} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { TESTIMONIALS } from "../data";

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((currentIndex + 1) % TESTIMONIALS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((currentIndex - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  return (
    <section className="py-24 bg-stone-900 text-white relative overflow-hidden">
      {/* Decorative quotes background graphic */}
      <div className="absolute right-12 top-12 opacity-[0.02] text-white">
        <Quote size={300} strokeWidth={1} />
      </div>

      <div className="max-w-4xl mx-auto px-6 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-6 h-[2px] bg-brand-red block" />
            <span className="text-brand-red font-mono text-xs uppercase tracking-widest font-semibold">
              Depoimentos
            </span>
            <span className="w-6 h-[2px] bg-brand-red block" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-extrabold uppercase tracking-tight">
            Quem Faz Acontecer Conosco
          </h2>
        </div>

        {/* Carousel Slider with animations */}
        <div className="relative min-h-[300px] flex items-center justify-center bg-stone-950 p-6 sm:p-12 border border-white/5 rounded-sm shadow-xl">
          <button
            onClick={handlePrev}
            className="absolute left-2 sm:left-4 p-2 bg-stone-900 border border-white/10 hover:border-brand-red text-zinc-400 hover:text-white rounded-full transition-all duration-300 cursor-pointer active:scale-95 z-20"
          >
            <ChevronLeft size={18} />
          </button>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="text-center max-w-2xl flex flex-col items-center"
            >
              {/* Star group */}
              <div className="flex justify-center gap-1 mb-6">
                {[...Array(TESTIMONIALS[currentIndex].rating)].map((_, i) => (
                  <Star key={i} size={14} className="fill-brand-red text-brand-red" />
                ))}
              </div>

              {/* Quote mark icon */}
              <Quote size={28} className="text-[#d93838] opacity-30 mb-4" />

              {/* Content text */}
              <p className="text-sm sm:text-base md:text-lg text-zinc-300 font-sans font-light italic leading-relaxed mb-6">
                "{TESTIMONIALS[currentIndex].quote}"
              </p>

              {/* Author badge layout */}
              <div className="flex items-center gap-4 text-left">
                <img
                  src={TESTIMONIALS[currentIndex].avatarUrl}
                  alt={TESTIMONIALS[currentIndex].name}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="w-12 h-12 rounded-full object-cover border border-white/10 shadow"
                />
                <div>
                  <h4 className="font-display font-bold text-sm text-white">
                    {TESTIMONIALS[currentIndex].name}
                  </h4>
                  <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                    {TESTIMONIALS[currentIndex].role}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <button
            onClick={handleNext}
            className="absolute right-2 sm:right-4 p-2 bg-stone-900 border border-white/10 hover:border-brand-red text-zinc-400 hover:text-white rounded-full transition-all duration-300 cursor-pointer active:scale-95 z-20"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Indicator dots */}
        <div className="flex justify-center gap-2 mt-8">
          {TESTIMONIALS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === idx ? "bg-[#d93838] w-4" : "bg-neutral-800"
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}

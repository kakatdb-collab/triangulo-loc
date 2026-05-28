/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { ArrowDown, Play, Instagram, MapPin } from "lucide-react";
import { ASSETS } from "../data";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col justify-center items-center overflow-hidden bg-[#181818] select-none"
    >
      {/* Background Image with elegant overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={ASSETS.studioHero}
          alt="Triângulo Estúdio Fotoclub Banner"
          referrerPolicy="no-referrer"
          fetchPriority="high"
          className="w-full h-full object-cover opacity-35 scale-105 filter brightness-90 saturate-[0.8]"
        />
        {/* Radical dark vignettes to match user #181818 block requirement */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-black/80" />
      </div>

      {/* Decorative vertical lines / aesthetic alignment */}
      <div className="absolute left-6 bottom-16 hidden lg:flex flex-col gap-6 z-10 items-center">
        <a
          href="https://www.instagram.com/triangulofotoclub/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-white/40 hover:text-brand-red transition-colors text-xs font-mono uppercase tracking-[0.2em] -rotate-90 origin-left translate-y-8 flex items-center gap-2"
        >
          <Instagram size={14} className="rotate-90" />
          @triangulofotoclub
        </a>
        <div className="w-[1px] h-20 bg-white/10 mt-14" />
      </div>

      <div className="absolute right-6 bottom-16 hidden lg:flex flex-col gap-6 z-10 items-center">
        <div className="text-white/40 text-xs font-mono uppercase tracking-[0.2em] rotate-90 origin-right -translate-y-8 flex items-center gap-2">
          <MapPin size={14} className="-rotate-90" />
          São Paulo, SP
        </div>
        <div className="w-[1px] h-20 bg-white/10 mt-14" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center flex flex-col items-center mt-12">
        {/* Small conceptual geometric marker */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex items-center gap-2 mb-6"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-brand-red animate-ping" />
          <span className="text-brand-red font-mono text-xs uppercase tracking-[0.4em] font-semibold">
            Espaço Criativo Premium
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-[0.06em] uppercase leading-none drop-shadow-2xl"
          id="hero-title"
        >
          TRIÂNGULO
          <span className="block mt-2 font-light text-zinc-300 tracking-[0.1em] text-3xl sm:text-5xl md:text-6xl lg:text-7xl">
            ESTÚDIO FOTOCLUB
          </span>
        </motion.h1>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="w-24 h-[3px] bg-brand-red my-8 rounded-full"
        />

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-zinc-300 font-sans text-sm sm:text-lg md:text-xl font-light tracking-wide max-w-2xl leading-relaxed mb-12"
        >
          O melhor <strong className="text-white font-medium">estúdio de locação barato</strong> no <strong className="text-white font-medium">centro de São Paulo (SP)</strong>, climatizado e <strong className="text-white font-medium">próximo ao metrô</strong>. Conforto, praticidade e liberdade criativa com iluminação inclusa.
        </motion.p>

        {/* Buttons / Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row items-center gap-6"
        >
          {/* Requested Ghost Button with hover fill */}
          <a
            href="#reservar"
            className="group relative inline-flex items-center justify-center px-8 py-4 border border-white text-white font-mono text-xs font-bold uppercase tracking-[0.25em] transition-all duration-500 overflow-hidden rounded-sm hover:text-[#181818]"
            id="btn-reservar-horario"
          >
            {/* Background fill sliding up */}
            <span className="absolute inset-0 bg-white scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-500 ease-out z-0" />
            <span className="relative z-10">RESERVAR HORÁRIO</span>
          </a>

          {/* Secondary Action */}
          <a
            href="#espacos"
            className="group flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300 font-mono text-xs uppercase tracking-[0.2em] py-3 px-4"
          >
            <span className="relative flex items-center justify-center w-8 h-8 rounded-full border border-white/10 group-hover:border-white/30 transition-all duration-300">
              <Play size={10} className="text-zinc-300 fill-zinc-300 group-hover:text-white" />
            </span>
            Conhecer Estúdios
          </a>
        </motion.div>
      </div>

      {/* Decorative ambient bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-32 bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer select-none group"
        onClick={() => document.getElementById("conceito")?.scrollIntoView({ behavior: "smooth" })}
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
          Deslizar
        </span>
        <ArrowDown size={14} className="text-zinc-500 group-hover:text-white transition-colors animate-bounce" />
      </motion.div>
    </section>
  );
}

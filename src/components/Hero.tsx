/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { motion } from "motion/react";
import { ArrowDown, Play, Instagram, MapPin, Circle } from "lucide-react";
import { ASSETS } from "../data";

// Helper function to concatenate classes cleanly
function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ElegantShapeProps {
  className?: string;
  delay?: number;
  width?: number;
  height?: number;
  rotate?: number;
  gradient?: string;
}

function ElegantShape({
  className,
  delay = 0,
  width = 400,
  height = 100,
  rotate = 0,
  gradient = "from-white/[0.08]",
}: ElegantShapeProps) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: -150,
        rotate: rotate - 15,
      }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: rotate,
      }}
      transition={{
        duration: 2.4,
        delay,
        ease: [0.23, 0.86, 0.39, 0.96],
        opacity: { duration: 1.2 },
      }}
      className={cn("absolute", className)}
    >
      <motion.div
        animate={{
          y: [0, 15, 0],
        }}
        transition={{
          duration: 12,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
        }}
        style={{
          width,
          height,
        }}
        className="relative"
      >
        <div
          className={cn(
            "absolute inset-0 rounded-full",
            "bg-gradient-to-r to-transparent",
            gradient,
            "backdrop-blur-[2px] border-2 border-white/[0.15]",
            "shadow-[0_8px_32px_0_rgba(255,255,255,0.1)]",
            "after:absolute after:inset-0 after:rounded-full",
            "after:bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.2),transparent_70%)]"
          )}
        />
      </motion.div>
    </motion.div>
  );
}

export default function Hero() {
  const fadeUpVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        delay: 0.5 + i * 0.2,
        ease: [0.25, 0.4, 0.25, 1],
      },
    }),
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen w-full flex flex-col justify-center items-center overflow-hidden bg-[#181818] select-none"
    >
      {/* Background Image with elegant overlay layered under geometric filters */}
      <div className="absolute inset-0 z-0">
        <img
          src={ASSETS.studioHero}
          alt="Triângulo Estúdio Fotoclub Banner"
          referrerPolicy="no-referrer"
          fetchPriority="high"
          className="w-full h-full object-cover opacity-15 scale-105 filter brightness-75 saturate-[0.8]"
        />
        {/* Dark radial and linear gradients for ultimate cinematic lighting */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/70 to-[#181818]/90" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.08] via-transparent to-red-600/[0.04] blur-3xl pointer-events-none" />
      </div>

      {/* Aesthetic Floating Geometric Lens Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-brand-red/[0.12]"
          className="left-[-15%] md:left-[-10%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-red-600/[0.10]"
          className="right-[-10%] md:right-[-5%] top-[65%] md:top-[70%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-amber-600/[0.08]"
          className="left-[2%] md:left-[8%] bottom-[8%] md:bottom-[12%]"
        />

        <ElegantShape
          delay={0.6}
          width={220}
          height={60}
          rotate={20}
          gradient="from-white/[0.08]"
          className="right-[10%] md:right-[15%] top-[8%] md:top-[12%]"
        />

        <ElegantShape
          delay={0.7}
          width={155}
          height={40}
          rotate={-25}
          gradient="from-red-500/[0.12]"
          className="left-[15%] md:left-[22%] top-[3%] md:top-[8%]"
        />
      </div>

      {/* Decorative vertical columns / social media & location anchors */}
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

      {/* Main Hero Container */}
      <div className="relative z-10 container mx-auto px-4 md:px-6 flex flex-col items-center">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          
          {/* Badge */}
          <motion.div
            custom={0}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] mb-8 md:mb-10"
          >
            <Circle className="h-2 w-2 fill-brand-red/80 text-brand-red animate-pulse" />
            <span className="text-xs text-white/60 tracking-[0.25em] font-mono uppercase">
              Espaço Criativo Premium
            </span>
          </motion.div>

          {/* Title */}
          <motion.div
            custom={1}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
          >
            <h1 
              className="font-display text-4xl sm:text-6xl md:text-8xl font-black mb-6 md:mb-8 tracking-wider uppercase leading-none drop-shadow-2xl"
              id="hero-title"
            >
              <span className="bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                ESTÚDIO TRIÂNGULO
              </span>
              <br />
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-red via-red-300 to-amber-500 font-light tracking-[0.1em] text-3xl sm:text-5xl md:text-7xl">
                FOTOCLUB
              </span>
            </h1>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            custom={2}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="text-zinc-300 font-sans text-sm sm:text-lg md:text-xl font-light tracking-wide max-w-2xl leading-relaxed mb-12"
          >
            O melhor <strong className="text-white font-medium">estúdio de locação barato</strong> no <strong className="text-white font-medium">centro de São Paulo (SP)</strong>, climatizado e <strong className="text-white font-medium">próximo ao metrô</strong>. Conforto, praticidade e liberdade criativa com iluminação inclusa.
          </motion.p>

          {/* Buttons & Call to Actions */}
          <motion.div
            custom={3}
            variants={fadeUpVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            {/* Primary Action Button */}
            <a
              href="#reservar"
              className="group relative inline-flex items-center justify-center px-8 py-4 border border-white text-white font-mono text-xs font-bold uppercase tracking-[0.25em] transition-all duration-500 overflow-hidden rounded-sm hover:text-[#181818]"
              id="btn-reservar-horario"
            >
              <span className="absolute inset-0 bg-white scale-x-0 group-hover:scale-x-100 origin-center transition-transform duration-500 ease-out z-0" />
              <span className="relative z-10">RESERVAR HORÁRIO</span>
            </a>

            {/* Secondary Option Button */}
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
      </div>

      {/* Ambient glowing vignette at the base of the hero block */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-32 bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-[#181818]/60 pointer-events-none" />

      {/* Scroll indicator */}
      <div
        className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 cursor-pointer select-none group animate-slow-fade-in [animation-delay:1000ms] opacity-0 [animation-fill-mode:forwards]"
        onClick={() => document.getElementById("conceito")?.scrollIntoView({ behavior: "smooth" })}
      >
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-zinc-500 group-hover:text-zinc-300 transition-colors">
          Deslizar
        </span>
        <ArrowDown size={14} className="text-zinc-500 group-hover:text-white transition-colors animate-bounce" />
      </div>
    </section>
  );
}

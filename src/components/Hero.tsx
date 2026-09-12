/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowDown, Play, Instagram, MapPin, Circle, ChevronLeft, ChevronRight } from "lucide-react";
import { ASSETS } from "../data";
import { db, doc, onSnapshot } from "../lib/firebase";

// Helper function to concatenate classes cleanly
function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(" ");
}

interface HeroPhotoItem {
  url: string;
  mobileUrl?: string;
  caption?: string;
}

const DEFAULT_HERO_PHOTOS: HeroPhotoItem[] = [
  {
    url: ASSETS.studioHero,
    mobileUrl: ASSETS.studioHero,
    caption: "Estúdio Triângulo Fotoclub - Ciclorama em U no Centro de SP"
  },
  {
    url: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=1600&q=80",
    mobileUrl: "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=800&q=75",
    caption: "Estrutura Profissional de Iluminação e Camarim"
  },
  {
    url: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80",
    mobileUrl: "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=75",
    caption: "Locação para Fotos, Podcasts, Vídeos e Eventos"
  }
];

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
  const [heroData, setHeroData] = useState({
    title1: "ESTÚDIO TRIÂNGULO",
    title2: "FOTOCLUB",
    badge: "Espaço Criativo Premium",
    description: "O estúdio mais completo, barato e acessível no Centro de São Paulo (Largo do Paissandu, próximo ao metrô). 90m² climatizados com ciclorama em U, camarim e iluminação inclusa.",
    bgImage: ASSETS.studioHero,
    heroPhotos: DEFAULT_HERO_PHOTOS,
    btnPrimary: "RESERVAR HORÁRIO",
    btnSecondary: "Conhecer Estúdios"
  });

  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site_settings", "hero"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        let loadedPhotos: HeroPhotoItem[] = [];

        if (Array.isArray(data.heroPhotos) && data.heroPhotos.length > 0) {
          loadedPhotos = data.heroPhotos.slice(0, 10).map((p: any) => ({
            url: typeof p === "string" ? p : p.url,
            mobileUrl: typeof p === "string" ? p : (p.mobileUrl || p.url),
            caption: typeof p === "string" ? "Estúdio Triângulo" : (p.caption || "Estúdio Triângulo")
          }));
        } else if (data.bgImage) {
          loadedPhotos = [{ url: data.bgImage, mobileUrl: data.bgImageMobile || data.bgImage, caption: "Estúdio Triângulo" }];
        } else {
          loadedPhotos = DEFAULT_HERO_PHOTOS;
        }

        setHeroData({
          title1: data.title1 || "ESTÚDIO TRIÂNGULO",
          title2: data.title2 || "FOTOCLUB",
          badge: data.badge || "Espaço Criativo Premium",
          description: data.description || "O estúdio mais completo, barato e acessível no Centro de São Paulo (Largo do Paissandu, próximo ao metrô). 90m² climatizados com ciclorama em U, camarim e iluminação inclusa.",
          bgImage: data.bgImage || ASSETS.studioHero,
          heroPhotos: loadedPhotos,
          btnPrimary: data.btnPrimary || "RESERVAR HORÁRIO",
          btnSecondary: data.btnSecondary || "Conhecer Estúdios"
        });
      }
    });
    return () => unsub();
  }, []);

  // Auto-advance hero banner carousel every 6 seconds if > 1 slide
  useEffect(() => {
    if (heroData.heroPhotos.length <= 1) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % heroData.heroPhotos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [heroData.heroPhotos.length]);

  const currentPhoto = heroData.heroPhotos[activeSlide] || heroData.heroPhotos[0] || DEFAULT_HERO_PHOTOS[0];

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
      {/* Background Banner Carousel Images - High Visibility & Crisp Clarity */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.picture
            key={activeSlide}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1.02 }}
            exit={{ opacity: 0, scale: 1.0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="absolute inset-0 w-full h-full"
          >
            {/* Mobile optimized WebP source */}
            {currentPhoto.mobileUrl && (
              <source media="(max-width: 768px)" srcSet={currentPhoto.mobileUrl} type="image/webp" />
            )}
            {/* Desktop WebP source */}
            <img
              src={currentPhoto.url}
              alt={currentPhoto.caption || "Triângulo Estúdio Fotoclub Banner"}
              referrerPolicy="no-referrer"
              fetchPriority="high"
              className="w-full h-full object-cover opacity-75 filter brightness-90 saturate-[1.1] transition-all duration-1000"
              onError={(e) => {
                const target = e.currentTarget;
                const fallback = "/images/gallery/03-fundo-infinito.webp";
                if (target.src !== fallback) {
                  target.src = fallback;
                }
              }}
            />
          </motion.picture>
        </AnimatePresence>

        {/* Overlay com gradiente escuro refinado para garantir legibilidade perfeita do texto sem apagar a foto */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/60 to-[#181818]/70" />
      </div>

      {/* Aesthetic Animated Background Canvas & Shapes with 60% Transparency (Transparência de 60%) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-60 transition-opacity duration-1000">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-red/[0.10] via-transparent to-amber-600/[0.08] blur-3xl pointer-events-none" />

        <ElegantShape
          delay={0.3}
          width={600}
          height={140}
          rotate={12}
          gradient="from-brand-red/[0.20]"
          className="left-[-15%] md:left-[-10%] top-[15%] md:top-[20%]"
        />

        <ElegantShape
          delay={0.5}
          width={500}
          height={120}
          rotate={-15}
          gradient="from-red-600/[0.18]"
          className="right-[-10%] md:right-[-5%] top-[65%] md:top-[70%]"
        />

        <ElegantShape
          delay={0.4}
          width={300}
          height={80}
          rotate={-8}
          gradient="from-amber-600/[0.15]"
          className="left-[2%] md:left-[8%] bottom-[8%] md:bottom-[12%]"
        />

        <ElegantShape
          delay={0.6}
          width={220}
          height={60}
          rotate={20}
          gradient="from-white/[0.12]"
          className="right-[10%] md:right-[15%] top-[8%] md:top-[12%]"
        />

        <ElegantShape
          delay={0.7}
          width={155}
          height={40}
          rotate={-25}
          gradient="from-red-500/[0.18]"
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
              {heroData.badge}
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
                {heroData.title1}
              </span>
              <br />
              <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-brand-red via-red-300 to-amber-500 font-light tracking-[0.1em] text-3xl sm:text-5xl md:text-7xl">
                {heroData.title2}
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
            {heroData.description}
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
              <span className="relative z-10">{heroData.btnPrimary}</span>
            </a>

            {/* Secondary Option Button */}
            <a
              href="#espacos"
              className="group flex items-center gap-3 text-zinc-400 hover:text-white transition-colors duration-300 font-mono text-xs uppercase tracking-[0.2em] py-3 px-4"
            >
              <span className="relative flex items-center justify-center w-8 h-8 rounded-full border border-white/10 group-hover:border-white/30 transition-all duration-300">
                <Play size={10} className="text-zinc-300 fill-zinc-300 group-hover:text-white" />
              </span>
              {heroData.btnSecondary}
            </a>
          </motion.div>
        </div>
      </div>

      {/* Ambient glowing vignette at the base of the hero block */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[70%] h-32 bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#181818] via-transparent to-[#181818]/60 pointer-events-none" />

      {/* Hero Banner Carousel Navigation Controls & Indicators */}
      {heroData.heroPhotos.length > 1 && (
        <>
          {/* Navigation Arrows */}
          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev - 1 + heroData.heroPhotos.length) % heroData.heroPhotos.length)}
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-brand-red border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md hover:scale-110 shadow-lg group"
            title="Foto Anterior do Banner"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>

          <button
            type="button"
            onClick={() => setActiveSlide((prev) => (prev + 1) % heroData.heroPhotos.length)}
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-brand-red border border-white/20 text-white flex items-center justify-center transition-all cursor-pointer backdrop-blur-md hover:scale-110 shadow-lg group"
            title="Próxima Foto do Banner"
          >
            <ChevronRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
          </button>

          {/* Carousel Dot Indicators & Active Caption Badge */}
          <div className="absolute bottom-20 md:bottom-16 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2">
            {currentPhoto.caption && (
              <span className="text-[10px] md:text-xs font-mono text-white/80 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md max-w-xs md:max-w-md truncate text-center">
                📷 {currentPhoto.caption}
              </span>
            )}
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
              {heroData.heroPhotos.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveSlide(idx)}
                  className={cn(
                    "h-1.5 rounded-full transition-all cursor-pointer",
                    idx === activeSlide
                      ? "w-6 bg-brand-red shadow-sm shadow-brand-red/50"
                      : "w-1.5 bg-white/30 hover:bg-white/60"
                  )}
                  title={`Ir para foto ${idx + 1}`}
                />
              ))}
              <span className="text-[10px] font-mono text-zinc-400 ml-1">
                {activeSlide + 1}/{heroData.heroPhotos.length}
              </span>
            </div>
          </div>
        </>
      )}

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

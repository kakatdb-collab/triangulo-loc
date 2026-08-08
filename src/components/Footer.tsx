/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Clock, ArrowUp, Instagram, Youtube, Compass, Star } from "lucide-react";
import StudioMap from "./StudioMap";
import { db, doc, onSnapshot } from "../lib/firebase";
import { DEFAULT_MARKETING_SETTINGS, trackConversionEvent } from "../lib/analytics";

export default function Footer() {
  const [reviewUrl, setReviewUrl] = useState<string>(DEFAULT_MARKETING_SETTINGS.googleBusinessReviewUrl!);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "site_settings", "integrations"), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const url = data.googleBusinessReviewUrl;
        if (url && !url.includes("ChIJ31y92A1YzpQRx94iO2qP_mI")) {
          setReviewUrl(url);
        } else {
          setReviewUrl(DEFAULT_MARKETING_SETTINGS.googleBusinessReviewUrl!);
        }
      }
    });
    return () => unsub();
  }, []);

  const handleScrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer id="contato" className="bg-[#111] text-white pt-20 pb-10 border-t border-white/5 relative">
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#d93838]/50 to-transparent" />
      
      <div className="max-w-7xl mx-auto px-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          
          {/* Col 1: Brand & Bio (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3">
              <img
                src="https://i.postimg.cc/bvrMr15X/logo-triangulo-fotoclube-negativo-PNG.png"
                alt="Logo Triângulo"
                referrerPolicy="no-referrer"
                className="h-9 w-auto object-contain"
              />
              <div className="flex flex-col">
                <span className="font-display text-white tracking-[0.2em] font-bold text-lg leading-none uppercase">
                  TRIÂNGULO
                </span>
                <span className="font-mono text-[9px] text-zinc-500 tracking-[0.15em] font-medium uppercase mt-1">
                  Estúdio Fotoclub
                </span>
              </div>
            </div>

            <p className="text-zinc-400 font-sans text-xs sm:text-sm font-light leading-relaxed max-w-sm">
              O Triângulo é um <strong className="text-white hover:text-[#d93838] transition-colors font-medium">estúdio de locação barato no centro de São Paulo</strong> desenhado para fotógrafos, diretores de arte, criadores de conteúdo e agências modernas. Infraestrutura de ponta com excelente custo-benefício.
            </p>

            <div className="flex gap-4">
              <a 
                href="https://www.instagram.com/triangulofotoclub/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-sm bg-stone-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#d93838] hover:bg-[#d93838]/5 transition-all duration-300"
              >
                <Instagram size={14} />
              </a>
              <a 
                href="https://www.youtube.com/@Daluz_jef" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-sm bg-stone-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#d93838] hover:bg-[#d93838]/5 transition-all duration-300"
              >
                <Youtube size={14} />
              </a>
              <a 
                href="https://behance.net" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-sm bg-stone-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:border-[#d93838] hover:bg-[#d93838]/5 transition-all duration-300"
              >
                <Compass size={14} />
              </a>
            </div>

            {/* Google Meu Negócio Badge */}
            <div className="pt-2">
              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackConversionEvent("google_review_footer_click")}
                className="inline-flex items-center gap-2 bg-stone-900 hover:bg-stone-800 border border-amber-500/30 hover:border-amber-500/60 p-2.5 rounded text-xs transition-all group cursor-pointer"
              >
                <div className="flex text-amber-400">
                  <Star size={13} className="fill-amber-400" />
                  <Star size={13} className="fill-amber-400" />
                  <Star size={13} className="fill-amber-400" />
                  <Star size={13} className="fill-amber-400" />
                  <Star size={13} className="fill-amber-400" />
                </div>
                <span className="font-mono text-[10px] uppercase font-bold text-zinc-300 group-hover:text-amber-400 transition-colors">
                  Google Meu Negócio • 5.0 Estrelas
                </span>
              </a>
            </div>
          </div>

          {/* Col 2: Useful info contact (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <h4 className="font-display font-bold text-sm tracking-widest text-[#d93838] uppercase border-b border-white/5 pb-2">
              Localização & Contato
            </h4>

            <ul className="space-y-4 font-sans text-xs sm:text-sm font-light text-zinc-300">
              <li className="flex items-start gap-3">
                <MapPin size={16} className="text-[#d93838] shrink-0 mt-0.5" />
                <div>
                   <span className="block font-semibold text-white">Nosso Endereço:</span>
                   <span className="text-zinc-400 text-xs block">Largo do Paissandu, 72 - Conj. 1803 • Centro, São Paulo - SP</span>
                   <span className="text-zinc-500 text-xs block mt-1">Estúdio próximo ao metrô (Estações República, São Bento e Anhangabaú)</span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Clock size={16} className="text-[#d93838] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-white">Horário de Funcionamento:</span>
                  <span className="text-zinc-400 text-xs block">Segunda a Sexta: 08h às 22h</span>
                  <span className="text-zinc-400 text-xs block">Sábados e Domingos: 09h às 18h</span>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Phone size={16} className="text-[#d93838] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-white">WhatsApp Direct:</span>
                  <a 
                    href="https://api.whatsapp.com/send?phone=5511961959349&text=Ol%C3%A1%2C%20gostaria%20de%20fazer%20um%20or%C3%A7amento%20loca%C3%A7%C3%A3o%20do%20estudio.%20" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-zinc-400 text-xs hover:text-[#d93838] transition-colors font-mono"
                  >
                    +55 (11) 96195-9349
                  </a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Mail size={16} className="text-[#d93838] shrink-0 mt-0.5" />
                <div>
                  <span className="block font-semibold text-white">E-mail Corporativo:</span>
                  <a 
                    href="mailto:contato@triangulofotoclub.com" 
                    className="text-zinc-400 text-xs hover:text-[#d93838] transition-colors font-mono"
                  >
                    contato@triangulofotoclub.com
                  </a>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 3: Google Maps Platform Component (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="font-display font-bold text-sm tracking-widest text-[#d93838] uppercase border-b border-white/5 pb-2">
              Sede no Mapa
            </h4>

            <StudioMap />
          </div>

        </div>

        {/* Bottom Rights Bar */}
        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-zinc-500">
          <div>
            <p>© {new Date().getFullYear()} Triângulo Estúdio Fotoclub. Todos os direitos reservados.</p>
          </div>

          <div className="flex items-center gap-6">
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">Termos de Uso</span>
            <span className="hover:text-zinc-300 transition-colors cursor-pointer">Privacidade</span>
            <button
              onClick={handleScrollToTop}
              className="flex items-center gap-1 bg-stone-900 border border-white/5 text-zinc-400 hover:text-white px-3 py-1.5 rounded transition-transform cursor-pointer hover:-translate-y-0.5 active:translate-y-0 rounded"
            >
              Topo
              <ArrowUp size={12} />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}

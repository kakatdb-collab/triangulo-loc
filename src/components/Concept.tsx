/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from "motion/react";
import { Sliders, HelpCircle, Eye, Zap, Shield, HelpCircle as Users } from "lucide-react";
import { ASSETS } from "../data";

export default function Concept() {
  const exposurePillars = [
    {
      title: "ISO",
      meta: "Sensibilidade do Sensor",
      desc: "Representa a capacidade do sensor do clube em reagir à luz. Controla o grão conceitual e a pureza digital.",
      icon: Eye,
    },
    {
      title: "Diafragma",
      meta: "Abertura da Lente",
      desc: "Define a profundidade de campo, controlando o bokeh de fundo e a nitidez dos detalhes do seu objeto principal.",
      icon: Sliders,
    },
    {
      title: "Obturador",
      meta: "Velocidade de Captura",
      desc: "Modula a passagem temporal de luz: desde congelamentos instantâneos até rastros delicados de longa exposição.",
      icon: Zap,
    },
  ];

  const spacePillars = [
    {
      title: "Equipamento",
      desc: "Flashes Profoto de alto rendimento, acessórios de modelagem e câmeras de médio formato à disposição imediata para viabilizar seus projetos sem travas técnicas.",
      color: "border-brand-red/30",
    },
    {
      title: "Ambiente",
      desc: "Estúdios com arquitetura inteligente, climatizados, espaços amplos, isolamento acústico e luz natural abundante para total conforto e foco mental absoluto.",
      color: "border-brand-red/30",
    },
    {
      title: "Conexão",
      desc: "Muito mais que um espaço físico: um autêntico fotoclube para trocar referências, enriquecer portfólios, promover workshops e catalisar novos negócios em rede.",
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
                Sobre Nós
              </span>
              <span className="w-2 h-[2px] bg-[#d93838] block" />
            </div>

            <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-8">
              Nossa <span className="text-[#d93838] italic">Base</span>
            </h2>

            {/* Main Statement */}
            <p className="text-zinc-300 font-sans text-base sm:text-lg leading-relaxed font-light mb-10">
              Escolhemos o triângulo para representar o nosso fotoclube por ser uma simbologia forte e com profunda relação com a fotografia: ele representa a relação entre os princípios básicos da exposição (<strong className="text-white hover:text-brand-red transition-colors">ISO</strong>, <strong className="text-white hover:text-brand-red transition-colors font-medium">diafragma</strong>, e <strong className="text-white hover:text-brand-red transition-colors font-medium">velocidade do obturador</strong>) e os três pilares fundamentais que sustentam nossas produções corporativas, comerciais e autorais: <strong className="text-white">Equipamento, Ambiente e Conexão</strong>.
            </p>

            {/* Dynamic tabs/pills comparing the elements */}
            <div className="w-full mt-4">
              <div className="text-xs font-mono text-[#d93838] uppercase tracking-[0.2em] mb-4 border-b border-white/5 pb-2">
                ▲ O Triângulo de Exposição (Fotografia)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
                {exposurePillars.map((pillar, i) => (
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

          {/* Right Column - Visual Graphic representing Triangle */}
          <div className="lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="relative w-full max-w-sm sm:max-w-md aspect-square bg-[#111] p-2 border border-white/10 rounded-sm overflow-hidden group shadow-2xl shadow-black"
            >
              <iframe
                src="https://www.youtube.com/embed/wjVz3E63tSM?autoplay=1&mute=1&loop=1&playlist=wjVz3E63tSM&controls=1"
                title="Estúdio Triângulo Vídeo"
                className="w-full h-full rounded-sm border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              ></iframe>
              <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent opacity-60" />
              
              {/* Overlay branding lines */}
              <div className="absolute bottom-6 left-6 right-6 z-10 flex flex-col">
                <span className="font-mono text-[10px] text-brand-red uppercase tracking-[0.3em] mb-1 font-bold">
                  Simbologia Ativa
                </span>
                <span className="font-display text-sm font-bold text-white tracking-[0.1em] uppercase">
                  EQUIPAMENTO • AMBIENTE • CONEXÃO
                </span>
              </div>

              {/* Top-Right Decorative Triangulation coordinates */}
              <div className="absolute top-4 right-4 font-mono text-[9px] text-white/30 tracking-widest bg-black/60 px-2 py-1 uppercase rounded">
                ▲ F/1.4 | 1/250S | ISO 100
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}

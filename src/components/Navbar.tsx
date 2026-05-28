/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Camera, Calendar, Layers, Menu, X } from "lucide-react";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);

      // Simple active link determination
      const sections = ["hero", "conceito", "espacos", "planos", "portfolio", "reservar", "contato"];
      const scrollPosition = window.scrollY + 200;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const menuItems = [
    { label: "Início", href: "#hero", id: "hero" },
    { label: "O Conceito", href: "#conceito", id: "conceito" },
    { label: "O Espaço", href: "#espacos", id: "espacos" },
    { label: "Planos", href: "#planos", id: "planos" },
    { label: "Portfólio", href: "#portfolio", id: "portfolio" },
    { label: "Reservas", href: "#reservar", id: "reservar" },
    { label: "Contato", href: "#contato", id: "contato" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-stone-900/90 backdrop-blur-md border-b border-white/5 py-4 shadow-lg shadow-black/20"
          : "bg-gradient-to-b from-black/80 to-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <a href="#hero" className="flex items-center gap-3 group">
          <img
            src="https://i.postimg.cc/bvrMr15X/logo-triangulo-fotoclube-negativo-PNG.png"
            alt="Logo Triângulo"
            referrerPolicy="no-referrer"
            className="h-9 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <div className="flex flex-col">
            <span className="font-display text-white tracking-[0.2em] font-bold text-lg leading-none">
              TRIÂNGULO
            </span>
            <span className="font-mono text-[9px] text-zinc-400 tracking-[0.15em] font-medium uppercase mt-1">
              Estúdio Fotoclub
            </span>
          </div>
        </a>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <ul className="flex items-center gap-6">
            {menuItems.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  className={`relative text-xs font-mono uppercase tracking-widest transition-colors py-2 ${
                    activeSection === item.id
                      ? "text-brand-red"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {item.label}
                  {activeSection === item.id && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-red rounded-full" />
                  )}
                </a>
              </li>
            ))}
          </ul>

          <a
            href="#reservar"
            className="flex items-center gap-2 bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase tracking-widest px-5 py-2.5 rounded-sm transition-all duration-300 shadow-md shadow-brand-red/20 active:scale-95"
          >
            <Calendar size={14} className="animate-pulse" />
            Agendar
          </a>
        </div>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden text-white hover:text-brand-red transition-colors focus:outline-none"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-stone-900 border-b border-white/5 shadow-2xl py-6 animate-fade-in">
          <ul className="flex flex-col gap-4 px-6 mb-6">
            {menuItems.map((item) => (
              <li key={item.id}>
                <a
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block text-sm font-mono uppercase tracking-widest py-2 ${
                    activeSection === item.id ? "text-brand-red font-bold" : "text-zinc-300"
                  }`}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="px-6">
            <a
              href="#reservar"
              onClick={() => setMobileMenuOpen(false)}
              className="flex justify-center items-center gap-2 w-full bg-brand-red hover:bg-red-700 text-white font-mono text-xs uppercase tracking-widest py-3 rounded-sm transition-all duration-300"
            >
              <Calendar size={14} />
              Reservar Horário
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}

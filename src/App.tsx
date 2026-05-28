/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, lazy, Suspense } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Concept from "./components/Concept";
import Spaces from "./components/Spaces";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";

// Lazy-load below-the-fold elements for faster initial paint and lower bundle size
const BookingSystem = lazy(() => import("./components/BookingSystem"));
const Testimonials = lazy(() => import("./components/Testimonials"));

export default function App() {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("prisma");

  const handleSelectSpace = (spaceId: string) => {
    setSelectedSpaceId(spaceId);
    
    // Smooth scroll down to the Booking / Rent Estimator
    const element = document.getElementById("reservar");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="bg-[#181818] min-h-screen text-white overflow-x-hidden selection:bg-brand-red selection:text-white">
      {/* Header static/fixed navigation */}
      <Navbar />

      {/* Hero Header Section */}
      <Hero />

      {/* O Conceito / Nossa Base */}
      <Concept />

      {/* Spaces catalog */}
      <Spaces onSelectSpace={handleSelectSpace} />

      {/* Pricing / Coworking Plans Section */}
      <Pricing />

      {/* Booking Calculator System */}
      <Suspense fallback={
        <div className="py-24 bg-stone-950 text-center flex items-center justify-center min-h-[400px]" id="reservar-placeholder">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-zinc-800 border-t-brand-red rounded-full animate-spin" />
            <p className="text-zinc-500 font-mono text-[10px] uppercase tracking-widest">Carregando Calculadora...</p>
          </div>
        </div>
      }>
        <BookingSystem 
          selectedSpaceId={selectedSpaceId} 
          setSelectedSpaceId={setSelectedSpaceId} 
        />
      </Suspense>

      {/* Testimonials Carousels */}
      <Suspense fallback={
        <div className="py-24 bg-stone-900 text-center flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-3 border-zinc-850 border-t-brand-red rounded-full animate-spin" />
            <p className="text-zinc-600 font-mono text-[10px] uppercase tracking-widest">Carregando Depoimentos...</p>
          </div>
        </div>
      }>
        <Testimonials />
      </Suspense>

      {/* Footer & Contact */}
      <Footer />
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Concept from "./components/Concept";
import Spaces from "./components/Spaces";
import Pricing from "./components/Pricing";
import BookingSystem from "./components/BookingSystem";
import Testimonials from "./components/Testimonials";
import Footer from "./components/Footer";

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
      <BookingSystem 
        selectedSpaceId={selectedSpaceId} 
        setSelectedSpaceId={setSelectedSpaceId} 
      />

      {/* Testimonials Carousels */}
      <Testimonials />

      {/* Footer & Contact */}
      <Footer />
    </div>
  );
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, lazy, Suspense, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Concept from "./components/Concept";
import Spaces from "./components/Spaces";
import Pricing from "./components/Pricing";
import Footer from "./components/Footer";
import CustomerPanel from "./components/CustomerPanel";
import { Booking } from "./types";
import { db, doc, getDoc, updateDoc, collection, addDoc } from "./lib/firebase";

// Lazy-load below-the-fold elements for faster initial paint and lower bundle size
const BookingSystem = lazy(() => import("./components/BookingSystem"));
const Testimonials = lazy(() => import("./components/Testimonials"));

export default function App() {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("prisma");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [bookingToPay, setBookingToPay] = useState<Booking | null>(null);

  // Check for successful payment callback on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paySuccess = urlParams.get("paySuccess") === "true";
    const bookingId = urlParams.get("bookingId") || urlParams.get("order_nsu");
    const planId = urlParams.get("planId");
    const cycleMonths = urlParams.get("cycleMonths") || "3";
    const txId = urlParams.get("transaction_nsu") || "IPY-SUCCESS";

    if (paySuccess) {
      // Clean query parameters from URL to maintain pristine navigation state
      window.history.replaceState({}, document.title, window.location.pathname);

      if (bookingId && bookingId.startsWith("TR-")) {
        const confirmBookingPayment = async () => {
          try {
            const bookingRef = doc(db, "bookings", bookingId);
            const snap = await getDoc(bookingRef);
            if (snap.exists()) {
              const bookingData = snap.data() as Booking;

              // Update booking status in Firestore
              await updateDoc(bookingRef, {
                status: "Reservada" as const,
                depositPaid: true,
                paymentTxId: txId
              });

              // Send confirmation emails using SMTP API
              try {
                await fetch("/api/send-booking-email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    clientEmail: bookingData.clientEmail,
                    clientName: bookingData.clientName,
                    clientPhone: bookingData.clientPhone,
                    bookingId: bookingData.id,
                    spaceName: bookingData.spaceName,
                    date: bookingData.date,
                    timeSlot: bookingData.timeSlot,
                    totalPrice: bookingData.totalPrice,
                    depositPaid: true,
                    status: "Reservada"
                  })
                });
              } catch (err) {
                console.error("SMTP callback trigger failed:", err);
              }

              // Create notification in chat
              await addDoc(collection(db, "messages"), {
                id: "notif-" + Date.now(),
                senderId: "admin",
                senderName: "Sistema Triângulo",
                recipientId: bookingData.userId || "guest",
                text: `✅ Pagamento via InfinitePay CONFIRMADO para a Reserva #${bookingData.id}! Sua data está garantida na agenda.`,
                createdAt: new Date().toISOString()
              });

              alert(`Parabéns! O pagamento da Reserva #${bookingId} foi confirmado via InfinitePay e seus dados de locação estão garantidos!`);
            }
          } catch (err) {
            console.error("Callback payment update failed:", err);
          }
        };
        confirmBookingPayment();
      } else if (planId) {
        const confirmPlanPayment = async () => {
          try {
            // Update current user's plan in Firestore if logged in
            // We can fetch user profile or save it directly
            const storedUserStr = localStorage.getItem("triangulo_user");
            if (storedUserStr) {
              const userObj = JSON.parse(storedUserStr);
              if (userObj?.uid) {
                const userRef = doc(db, "users", userObj.uid);
                await updateDoc(userRef, {
                  currentPlan: planId,
                  planCycle: cycleMonths,
                  planStatus: "active",
                  planStartDate: new Date().toISOString(),
                  planTxId: txId
                });

                // Add message to chat
                await addDoc(collection(db, "messages"), {
                  id: "notif-" + Date.now(),
                  senderId: "admin",
                  senderName: "Sistema Triângulo",
                  recipientId: userObj.uid,
                  text: `🎉 Parabéns! Sua assinatura do Plano de Coworking ${planId.toUpperCase()} (${cycleMonths} meses) foi confirmada via InfinitePay! Seu desconto de assinante já está ativo.`,
                  createdAt: new Date().toISOString()
                });
              }
            }
            alert(`Sua assinatura do Plano ${planId.toUpperCase()} (${cycleMonths} meses) foi ativada com sucesso via InfinitePay!`);
          } catch (err) {
            console.error("Callback plan update failed:", err);
          }
        };
        confirmPlanPayment();
      }
    }
  }, []);

  useEffect(() => {
    const handleOpenPanel = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.booking) {
        setBookingToPay(customEvent.detail.booking);
      } else {
        setBookingToPay(null);
      }
      setIsPanelOpen(true);
    };

    window.addEventListener("open-customer-panel", handleOpenPanel);
    return () => window.removeEventListener("open-customer-panel", handleOpenPanel);
  }, []);

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

      {/* Global Client & Administrative Management Panel */}
      <CustomerPanel 
        isOpen={isPanelOpen} 
        onClose={() => {
          setIsPanelOpen(false);
          setBookingToPay(null);
        }} 
        initialBookingToPay={bookingToPay}
      />
    </div>
  );
}

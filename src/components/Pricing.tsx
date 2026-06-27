import React, { useState } from "react";
import { X, CreditCard, RefreshCw } from "lucide-react";

export default function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState<{ id: string; name: string; price: number } | null>(null);
  const [cycle, setCycle] = useState<"3" | "6">("3");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  // Retrieve user details from localStorage if present
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("triangulo_user");
      if (stored) {
        const u = JSON.parse(stored);
        if (u.name) setName(u.name);
        if (u.email) setEmail(u.email);
        if (u.phone) setPhone(u.phone);
      }
    } catch (e) {
      console.error("Could not load user from storage inside Pricing", e);
    }
  }, [selectedPlan]);

  const handlePlanCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    setLoading(true);

    try {
      const res = await fetch("/api/payment/infinitepay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: selectedPlan.id,
          cycleMonths: cycle,
          amount: selectedPlan.price, // Start subscription with first installment payment
          clientName: name,
          clientEmail: email,
          clientPhone: phone,
        }),
      });

      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        // Redirect directly to secure InfinitePay Checkout Link!
        window.location.href = data.checkoutUrl;
      } else {
        alert("Erro ao processar assinatura InfinitePay: " + (data.error || "Tente novamente."));
      }
    } catch (err) {
      console.error("Error during plan checkout:", err);
      alert("Erro de conexão ao processar checkout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="planos" className="pricing-section">
      <style>{`
        /* Scoped styles specifically for pricing section to match exact instructions */
        .pricing-section {
          background-color: #1a1a1d;
          font-family: 'Segoe UI', 'Roboto', 'Inter', sans-serif;
          color: #f3f4f6;
          padding: 5rem 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .pricing-container {
          max-width: 1200px;
          width: 100%;
          margin: 0 auto;
        }

        /* Introduction Box */
        .intro-box {
          background-color: rgba(34, 34, 37, 0.5);
          border-left: 4px solid #ff5757;
          border-radius: 4px;
          padding: 1.5rem 2rem;
          margin-bottom: 4rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
          text-align: left;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .intro-text {
          font-size: 1rem;
          line-height: 1.6;
          color: #d1d5db;
          margin: 0;
        }

        .highlight-price {
          color: #ff5757;
          font-weight: 700;
        }

        /* Pricing Title */
        .pricing-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .pricing-title {
          font-size: 2.25rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.5rem;
          tracking-wide: 0.05em;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .pricing-subtitle {
          color: #9ca3af;
          font-size: 1rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* Grid / Flex Layout */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(1, minmax(0, 1fr));
          gap: 2rem;
          width: 100%;
        }

        @media (min-width: 768px) {
          .cards-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        /* Pricing Card */
        .pricing-card {
          background-color: #222225;
          border-radius: 8px;
          padding: 2.5rem 2rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          text-align: center;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          position: relative;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                      box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1), 
                      border-color 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          border-bottom: 3px solid transparent;
        }

        /* Hover on Card */
        .pricing-card:hover {
          transform: translateY(-10px);
          box-shadow: 0 20px 30px rgba(255, 87, 87, 0.12);
          border-bottom: 3px solid #ff5757;
        }

        /* Card Header */
        .card-header-block {
          margin-bottom: 2rem;
        }

        .plan-name {
          color: #ff5757;
          font-size: 1.15rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 1rem;
        }

        .price-block {
          display: flex;
          align-items: baseline;
          justify-content: center;
          color: #ffffff;
        }

        .currency {
          font-size: 1.25rem;
          font-weight: 500;
          margin-right: 0.25rem;
          color: #9ca3af;
        }

        .price-number {
          font-size: 3.5rem;
          font-weight: 800;
          line-height: 1;
        }

        .period {
          font-size: 0.875rem;
          font-style: italic;
          color: #9ca3af;
          margin-left: 0.25rem;
        }

        /* Card Body (Benefits list) */
        .benefits-list {
          list-style: none;
          padding: 0;
          margin: 0 0 2.5rem 0;
          display: flex;
          flex-direction: column;
        }

        .benefit-item {
          color: #d1d5db;
          font-size: 0.95rem;
          padding: 0.85rem 0.5rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          transition: background-color 0.3s ease;
        }

        .benefit-item:last-child {
          border-bottom: none;
        }

        /* Hover on list items */
        .benefit-item:hover {
          background-color: rgba(255, 255, 255, 0.03);
          color: #ffffff;
        }

        /* Card Footer (Button) */
        .enter-btn {
          background-color: #ff5757;
          color: #ffffff;
          font-weight: 700;
          font-size: 0.9rem;
          letter-spacing: 0.15em;
          padding: 1rem 2rem;
          border-radius: 4px;
          border: none;
          width: 100%;
          cursor: pointer;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), 
                      background-color 0.3s ease;
        }

        /* Hover on Enter Button */
        .enter-btn:hover {
          transform: scale(1.05);
          background-color: #e04545;
        }

        .enter-btn:active {
          transform: scale(0.98);
        }
      `}</style>

      <div className="pricing-container">
        {/* Title of Pricing Section */}
        <div className="pricing-header">
          <h2 className="pricing-title">Planos de Coworking</h2>
          <p className="pricing-subtitle">O estúdio de locação mais barato do Centro de SP com infraestrutura premium, a passos do metrô</p>
        </div>

        {/* Introduction / Info Box */}
        <div className="intro-box">
          <p className="intro-text">
            Uma das vantagens mais interessantes em ser assinante do Cowork, é que você paga apenas{" "}
            <strong className="highlight-price">R$ 35,00</strong> por hora, e se estourar o limite de horas do seu
            pacote pode comprar horas adicionais também a{" "}
            <strong className="highlight-price">R$ 35,00</strong> a hr. Todos os pacotes têm carência de{" "}
            <strong className="highlight-price">3 meses</strong>, e as horas não são cumulativas.
          </p>
        </div>

        {/* 3 Cards Container */}
        <div className="cards-grid">
          {/* Card 1: Standard */}
          <div className="pricing-card" id="pricing-card-standard">
            <div className="card-header-block">
              <div className="plan-name">Standard</div>
              <div className="price-block">
                <span className="currency">R$</span>
                <span className="price-number">400</span>
                <span className="period">/month</span>
              </div>
            </div>
            <ul className="benefits-list">
              <li className="benefit-item">12hrs locação</li>
              <li className="benefit-item">Segunda a Domingo das 9hrs às 22hrs</li>
              <li className="benefit-item" style={{ color: "#dbd1d1" }}>5% em Workshop</li>
              <li className="benefit-item">Fundo Colorido</li>
              <li className="benefit-item">Iluminação pra vídeo</li>
            </ul>
            <button 
              className="enter-btn"
              onClick={() => setSelectedPlan({ id: "standard", name: "Standard", price: 400 })}
            >
              ENTRAR
            </button>
          </div>

          {/* Card 2: Professional */}
          <div className="pricing-card" id="pricing-card-professional">
            <div className="card-header-block">
              <div className="plan-name">Professional</div>
              <div className="price-block">
                <span className="currency">R$</span>
                <span className="price-number">600</span>
                <span className="period">/month</span>
              </div>
            </div>
            <ul className="benefits-list">
              <li className="benefit-item">18 hrs locação</li>
              <li className="benefit-item">20 hrs uso de escritório (Horário comercial)</li>
              <li className="benefit-item">10% em Workshop</li>
              <li className="benefit-item">Fundo Colorido</li>
              <li className="benefit-item">Iluminação pra video</li>
            </ul>
            <button 
              className="enter-btn"
              onClick={() => setSelectedPlan({ id: "professional", name: "Professional", price: 600 })}
            >
              ENTRAR
            </button>
          </div>

          {/* Card 3: Elite */}
          <div className="pricing-card" id="pricing-card-elite">
            <div className="card-header-block">
              <div className="plan-name">Elite</div>
              <div className="price-block">
                <span className="currency">R$</span>
                <span className="price-number">800</span>
                <span className="period">/month</span>
              </div>
            </div>
            <ul className="benefits-list">
              <li className="benefit-item">22 Hrs. Locação</li>
              <li className="benefit-item">36hrs escritório (horário comercial)</li>
              <li className="benefit-item">20% em Workshops</li>
              <li className="benefit-item">Fundo colorido</li>
              <li className="benefit-item">Iluminação pra vídeo</li>
            </ul>
            <button 
              className="enter-btn"
              onClick={() => setSelectedPlan({ id: "elite", name: "Elite", price: 800 })}
            >
              ENTRAR
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-white/10 w-full max-w-md p-6 rounded-sm space-y-5 shadow-2xl relative text-left">
            <button 
              onClick={() => setSelectedPlan(null)}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>

            <div className="border-b border-white/5 pb-3">
              <span className="font-mono text-[9px] text-[#ff5757] uppercase tracking-widest font-bold">Assinatura de Plano Coworking</span>
              <h4 className="font-sans font-extrabold text-lg text-white uppercase">Plano {selectedPlan.name}</h4>
            </div>

            <form onSubmit={handlePlanCheckout} className="space-y-4">
              <div className="space-y-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block">Escolha a Recorrência</span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCycle("3")}
                    className={`py-3 rounded border font-mono text-[11px] font-bold uppercase transition-all ${
                      cycle === "3" 
                        ? "bg-[#ff5757]/10 border-[#ff5757] text-white" 
                        : "bg-stone-950 border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    3 Meses (Carência)
                  </button>
                  <button
                    type="button"
                    onClick={() => setCycle("6")}
                    className={`py-3 rounded border font-mono text-[11px] font-bold uppercase transition-all ${
                      cycle === "6" 
                        ? "bg-[#ff5757]/10 border-[#ff5757] text-white" 
                        : "bg-stone-950 border-white/5 text-zinc-400 hover:text-white"
                    }`}
                  >
                    6 Meses (Fidelidade)
                  </button>
                </div>
              </div>

              {/* Personal Details fields */}
              <div className="space-y-3">
                <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-500 block">Seus Dados Pessoais</span>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome aqui"
                    className="w-full bg-stone-950 border border-white/5 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5757]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">E-mail de Contato</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="w-full bg-stone-950 border border-white/5 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5757]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 block">WhatsApp / Telefone</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-stone-950 border border-white/5 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff5757]"
                  />
                </div>
              </div>

              <div className="bg-stone-950/80 p-3.5 rounded border border-white/5 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500 font-mono text-[10px] uppercase">Custo Mensal</span>
                  <span className="text-white font-bold">R$ {selectedPlan.price.toFixed(2)} / mês</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-1.5">
                  <span className="text-[#ff5757] font-mono text-[10px] uppercase font-bold">Primeira mensalidade a pagar agora</span>
                  <span className="text-[#ff5757] font-bold font-mono text-sm">R$ {selectedPlan.price.toFixed(2)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#ff5757] hover:bg-red-600 disabled:opacity-50 text-white font-mono text-[11px] py-3.5 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#ff5757]/10"
              >
                {loading ? (
                  <>
                    <RefreshCw className="animate-spin" size={14} />
                    Iniciando Checkout...
                  </>
                ) : (
                  <>
                    <CreditCard size={14} />
                    Confirmar Assinatura via InfinitePay
                  </>
                )}
              </button>

              <p className="text-[9px] text-zinc-500 text-center font-mono uppercase tracking-wider">
                Parcele ou pague à vista com segurança via checkout oficial InfinitePay
              </p>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

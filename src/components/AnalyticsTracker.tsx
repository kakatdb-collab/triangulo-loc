import { useEffect, useState } from "react";
import { db, doc, onSnapshot } from "../lib/firebase";
import { initMarketingTrackers, MarketingSettings, DEFAULT_MARKETING_SETTINGS, trackConversionEvent } from "../lib/analytics";
import { Star, MapPin, ExternalLink, MessageCircle } from "lucide-react";

export default function AnalyticsTracker() {
  const [settings, setSettings] = useState<MarketingSettings>(DEFAULT_MARKETING_SETTINGS);
  const [showReviewBanner, setShowReviewBanner] = useState(false);

  useEffect(() => {
    // Listen to real-time marketing settings from Firestore
    const unsub = onSnapshot(
      doc(db, "site_settings", "integrations"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as MarketingSettings;
          setSettings((prev) => ({
            ...prev,
            ...data
          }));
          initMarketingTrackers({
            ...DEFAULT_MARKETING_SETTINGS,
            ...data
          });
        } else {
          initMarketingTrackers(DEFAULT_MARKETING_SETTINGS);
        }
      },
      (error) => {
        console.warn("Analytics settings listener error:", error);
        initMarketingTrackers(DEFAULT_MARKETING_SETTINGS);
      }
    );

    return () => unsub();
  }, []);

  const rawReviewUrl = settings.googleBusinessReviewUrl || DEFAULT_MARKETING_SETTINGS.googleBusinessReviewUrl;
  const reviewUrl = (!rawReviewUrl || rawReviewUrl.includes("ChIJ31y92A1YzpQRx94iO2qP_mI"))
    ? DEFAULT_MARKETING_SETTINGS.googleBusinessReviewUrl!
    : rawReviewUrl;

  const rawProfileUrl = settings.googleBusinessProfileUrl || DEFAULT_MARKETING_SETTINGS.googleBusinessProfileUrl;
  const profileUrl = (!rawProfileUrl || rawProfileUrl.includes("trianguloestudio"))
    ? DEFAULT_MARKETING_SETTINGS.googleBusinessProfileUrl!
    : rawProfileUrl;

  return (
    <>
      {/* Floating Google Business Profile Review Pill */}
      <div className="fixed bottom-24 right-5 z-40 hidden md:flex items-center">
        {!showReviewBanner ? (
          <button
            onClick={() => {
              setShowReviewBanner(true);
              trackConversionEvent("google_business_pill_click");
            }}
            className="bg-stone-900/90 hover:bg-stone-900 text-white text-xs font-mono py-2 px-3 rounded-full border border-amber-500/40 shadow-xl flex items-center gap-2 cursor-pointer backdrop-blur-md hover:scale-105 transition-all group"
            title="Sua opinião é importante no Google Meu Negócio"
          >
            <div className="flex items-center text-amber-400">
              <Star size={13} className="fill-amber-400" />
              <Star size={13} className="fill-amber-400" />
              <Star size={13} className="fill-amber-400" />
              <Star size={13} className="fill-amber-400" />
              <Star size={13} className="fill-amber-400" />
            </div>
            <span className="text-[11px] font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
              Avalie no Google
            </span>
          </button>
        ) : (
          <div className="bg-stone-900 border border-amber-500/50 p-4 rounded-xl shadow-2xl max-w-xs text-xs text-white space-y-3 relative animate-in fade-in slide-in-from-bottom-3 duration-300">
            <button
              onClick={() => setShowReviewBanner(false)}
              className="absolute top-2 right-2 text-zinc-500 hover:text-white text-sm font-bold w-5 h-5 flex items-center justify-center rounded-full bg-stone-800"
            >
              ×
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                <MapPin size={14} />
              </div>
              <div>
                <h6 className="font-bold text-xs text-white">Google Meu Negócio</h6>
                <div className="flex text-amber-400 text-[10px]">
                  ★★★★★ <span className="text-zinc-400 font-mono ml-1">5.0 Estrelas</span>
                </div>
              </div>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              Você já produziu no <strong>Triângulo Estúdio</strong>? Deixe sua avaliação de 5 estrelas no Google e nos ajude a crescer!
            </p>
            <div className="flex items-center gap-2 pt-1">
              <a
                href={reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackConversionEvent("google_review_click")}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-bold font-mono text-[10px] uppercase py-2 px-3 rounded text-center flex items-center justify-center gap-1 transition-all"
              >
                Avaliar Agora <ExternalLink size={12} />
              </a>
              <a
                href={profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-stone-800 hover:bg-stone-700 text-zinc-300 font-mono text-[10px] uppercase py-2 px-2.5 rounded text-center transition-all"
                title="Ver perfil completo no Google Maps"
              >
                Perfil
              </a>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

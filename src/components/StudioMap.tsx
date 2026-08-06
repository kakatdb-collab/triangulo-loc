import { useState } from "react";
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useAdvancedMarkerRef } from "@vis.gl/react-google-maps";
import { MapPin, Navigation, ExternalLink } from "lucide-react";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY";

// Coordinates for Largo do Paissandu, 72 - Centro, São Paulo - SP
const STUDIO_LOCATION = { lat: -23.542240, lng: -46.638500 };

export default function StudioMap() {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);

  if (!hasValidKey) {
    return (
      <div className="relative aspect-video lg:aspect-[4/3] bg-stone-950 rounded border border-white/5 overflow-hidden group shadow flex flex-col justify-between p-4">
        {/* Fallback interactive embed map */}
        <iframe
          title="Triângulo Estúdio Fotoclub Localização"
          src="https://maps.google.com/maps?q=Largo+do+Paissandu,+72+-+Centro+Historico+de+Sao+Paulo,+Sao+Paulo+-+SP,+01037-010&t=&z=16&ie=UTF8&iwloc=&output=embed"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="absolute inset-0 w-full h-full grayscale invert opacity-75 hover:opacity-90 transition-all duration-500"
        />

        <div className="relative z-10 bg-stone-950/90 border border-[#d93838]/30 p-3 rounded text-xs space-y-2 backdrop-blur-md mt-auto">
          <div className="flex items-center gap-2 text-[#d93838] font-bold font-mono uppercase text-[10px] tracking-wider">
            <MapPin size={14} /> Largo do Paissandu, 72 - Conj. 1803
          </div>
          <p className="text-zinc-300 text-[11px] font-sans">
            Centro Histórico, São Paulo - SP (Próximo aos metrôs República, Anhangabaú e São Bento)
          </p>
          <div className="flex items-center justify-between pt-1 border-t border-white/10 font-mono text-[9px] text-zinc-400">
            <span>Sede Triângulo Estúdio</span>
            <a 
              href="https://maps.google.com/?q=Largo+do+Paissandu,+72,+conj+1803,+Centro,+Sao+Paulo+-+SP" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#d93838] hover:underline font-bold flex items-center gap-1"
            >
              Abrir no Maps <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video lg:aspect-[4/3] bg-stone-950 rounded border border-white/10 overflow-hidden shadow group">
      <APIProvider apiKey={API_KEY} version="weekly">
        <Map
          defaultCenter={STUDIO_LOCATION}
          defaultZoom={16}
          mapId="TRIANGULO_ESTUDIO_MAP"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
          style={{ width: "100%", height: "100%" }}
          colorScheme="DARK"
          disableDefaultUI={false}
        >
          <AdvancedMarker 
            ref={markerRef} 
            position={STUDIO_LOCATION} 
            onClick={() => setInfoOpen(!infoOpen)}
            title="Estúdio Triângulo Fotoclub"
          >
            <Pin background="#d93838" glyphColor="#ffffff" borderColor="#000000" />
          </AdvancedMarker>

          {infoOpen && (
            <InfoWindow 
              anchor={marker} 
              onCloseClick={() => setInfoOpen(false)}
              headerContent={
                <span className="font-bold text-xs text-[#181818] font-mono uppercase tracking-wider">
                  Triângulo Estúdio
                </span>
              }
            >
              <div className="text-xs text-stone-800 space-y-1 font-sans p-1 max-w-[200px]">
                <p className="font-semibold text-stone-900">Largo do Paissandu, 72 - Conj 1803</p>
                <p className="text-[11px] text-stone-600">Centro, São Paulo - SP</p>
                <a 
                  href="https://maps.google.com/?q=Largo+do+Paissandu,+72,+conj+1803,+Centro,+Sao+Paulo+-+SP" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-[#d93838] font-bold uppercase mt-1 hover:underline"
                >
                  Como Chegar <Navigation size={10} />
                </a>
              </div>
            </InfoWindow>
          )}
        </Map>
      </APIProvider>

      {/* Floating Badge */}
      <div className="absolute top-3 left-3 bg-stone-950/90 border border-[#d93838]/30 px-3 py-1.5 rounded flex items-center gap-2 pointer-events-none backdrop-blur-sm shadow z-10">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d93838] opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#d93838]"></span>
        </span>
        <span className="text-white font-mono text-[9px] uppercase tracking-widest font-bold">
          Sede Triângulo • Largo do Paissandu
        </span>
      </div>
    </div>
  );
}

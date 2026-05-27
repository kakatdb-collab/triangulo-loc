/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StudioSpace, Equipment, PortfolioItem, Testimonial } from "./types";

// Expose paths to assets safely
export const ASSETS = {
  studioHero: "/src/assets/images/studio_hero_1779639642169.png",
  triangleConcept: "/src/assets/images/triangle_concept_1779639657792.png",
  prismaStudioFirst: "/src/assets/images/prisma_studio_first_1779921851529.png",
};

export const STUDIO_SPACES: StudioSpace[] = [
  {
    id: "prisma",
    name: "Estúdio Prisma",
    subtitle: "O infinito branco e iluminação profissional",
    description: "Equipado com um ciclorama(fundo infinito) de madeira branco em 'U', pé direito de 3m, Largura 3M, Profundidade 3M e mais 3 metros de recuo, trás ainda uma estrutura aérea de trilhos para iluminação. Perfeito para editoriais de moda, campanhas publicitárias de grande porte, videoclipes e produções que necessitam de fundo infinito ou iluminação técnica avançada. O estúdio tem escritório, um espaço aconchegante e rústico tipo quarto de AirnB com visual antigo e industrial, mobília vintage e uma varanda para compor com diversos trabalhos de foto e video.",
    hourlyRate: 100,
    halfDayRate: 400,
    fullDayRate: 700,
    capacity: 15,
    area: "120m²",
    features: [
      "Trilhos aéreos",
      "3 Tochas de estudio Godox com modificadores.",
      "Cortinas Blackout",
      "Copa",
      "Camarim (usando o ambiente do quarto cencio como camarim).",
    ],
    imageUrl: ASSETS.prismaStudioFirst,
  }
];

export const EQUIPMENT_LIST: Equipment[] = [
  // Lighting
  {
    id: "aputure_600d",
    name: "Kit Aputure LS 600d Pro (LED Contínuo COB)",
    category: "lighting",
    price: 150,
    description: "Luz contínua de imensa intensidade para cinema e vídeo com controle wireless total e encaixe Bowens.",
    isAvailable: true,
  },
  // Camera & Glass
  {
    id: "sony_a7r5",
    name: "Câmera Sony Alpha A7R V + Lente 24-70mm f/2.8 GM II",
    category: "camera",
    price: 250,
    description: "Foco automático impulsionado por IA, sensor de 61 megapixels, extrema agilidade para editoriais e campanhas.",
    isAvailable: true,
  }
];

export const PORTFOLIO_GALLERY: PortfolioItem[] = [
  {
    id: "p1",
    imageUrl: "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&q=80&w=600",
    title: "Vanguard Editorial",
    category: "Moda",
    photographer: "Lucas Mendes",
  },
  {
    id: "p2",
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=600",
    title: "Minimal Portraiture",
    category: "Retrato",
    photographer: "Mariana Costa",
  },
  {
    id: "p3",
    imageUrl: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=600",
    title: "Minimalist Watch Design",
    category: "Produto",
    photographer: "Gabriel Silva",
  },
  {
    id: "p4",
    imageUrl: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=600",
    title: "Summer Collection",
    category: "Moda",
    photographer: "Helena Ramos",
  },
  {
    id: "p5",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600",
    title: "Studio Lighting Profile",
    category: "Retrato",
    photographer: "Felipe Nobre",
  },
  {
    id: "p6",
    imageUrl: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600",
    title: "Audio High Fidelity",
    category: "Produto",
    photographer: "Amanda Rocha",
  },
  {
    id: "p7",
    imageUrl: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=600",
    title: "Retrô Vibe Campaign",
    category: "Comercial",
    photographer: "Lucas Mendes",
  },
  {
    id: "p8",
    imageUrl: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=600",
    title: "Expressive Headshots",
    category: "Retrato",
    photographer: "Mariana Costa",
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    name: "Arthur Silveira",
    role: "Diretor Criativo @ Studio Sul",
    quote: "A estrutura do Triângulo é simplesmente sensacional. Fazer editorias na sala Prisma me poupou horas: os trilhos de teto facilitam dobras absurdas de tempo na hora de redirecionar as tochas de flash.",
    rating: 5,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
  },
  {
    id: "t2",
    name: "Vivian Martins",
    role: "Fotógrafa Autoral & Retratista",
    quote: "Eu me apaixonei pelo Estúdio Prisma. A infraestrutura de iluminação e a amplitude do espaço criam uma atmosfera tão rica que torna o ensaio mais profissional e com resultado impecável.",
    rating: 5,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
  },
  {
    id: "t3",
    name: "Julio Castro",
    role: "Produtor de Vídeo @ Nebula Core",
    quote: "Utilizamos o coworking do Triângulo para editar nossos materiais e a sala Prisma para produzir dois videoclipes inteiros comerciais. Isolamento acústico absoluto com infraestrutura sob altíssimo controle.",
    rating: 5,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
  }
];

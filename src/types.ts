/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudioSpace {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  hourlyRate: number;
  halfDayRate: number; // 4 hours
  fullDayRate: number; // 8 hours
  capacity: number;
  area: string; // e.g., "80m²"
  features: string[];
  imageUrl: string;
}

export interface Equipment {
  id: string;
  name: string;
  category: "lighting" | "camera" | "grip" | "scenery";
  price: number; // flat or per hour? Let's do daily/flat rate
  description: string;
  isAvailable: boolean;
}

export interface PortfolioItem {
  id: string;
  imageUrl: string;
  title: string;
  category: "Moda" | "Retrato" | "Produto" | "Comercial";
  photographer: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  quote: string;
  rating: number;
  avatarUrl: string;
}

export interface Booking {
  id: string;
  spaceId: string;
  spaceName: string;
  date: string;
  timeSlot: string;
  durationHours: number;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  selectedEquipIds: string[];
  notes?: string;
  totalPrice: number;
  status: "Pendente" | "Confirmado" | "Concluido";
  createdAt: string;
}
